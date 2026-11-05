import copy
import importlib
import json
import logging
from pathlib import Path

import boto3
import pytest
from botocore.exceptions import ClientError, EndpointConnectionError
from moto import mock_aws

FUNCTION_TIMEOUT_SECONDS = 5
PARAMETER_NAME = "/eds/dev/api-key"
VALID_KEY = "llave-valida-de-prueba"
NEW_KEY = "llave-nueva-de-prueba"
WRONG_KEY = "llave-incorrecta-de-prueba"
EVENT_PATH = Path(__file__).parent / "events" / "authorizer-request.json"
BASE_EVENT = json.loads(EVENT_PATH.read_text(encoding="utf-8"))
CORRELATION_ID = BASE_EVENT["requestContext"]["requestId"]


def request_with_key(key: str) -> dict:
    event = copy.deepcopy(BASE_EVENT)
    event["headers"]["x-api-key"] = key
    event["identitySource"] = [key]
    return event


def put_key(ssm_client, value: str) -> None:
    ssm_client.put_parameter(Name=PARAMETER_NAME, Value=value, Type="SecureString", Overwrite=True)


def app_records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [record for record in caplog.records if record.name == "root"]


def assert_single_event(caplog: pytest.LogCaptureFixture, message: str, level: int) -> None:
    records = app_records(caplog)
    assert [record.getMessage() for record in records] == [message]
    assert records[0].levelno == level
    assert records[0].service == "authorizer"
    assert records[0].correlation_id == CORRELATION_ID


@pytest.fixture(autouse=True)
def aws_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-2")
    monkeypatch.setenv("API_KEY_PARAMETER_NAME", PARAMETER_NAME)


@pytest.fixture
def ssm_client(aws_environment: None):
    with mock_aws():
        client = boto3.client("ssm")
        put_key(client, VALID_KEY)
        yield client


@pytest.fixture
def authorizer(ssm_client, caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch):
    caplog.set_level(logging.INFO)
    module = importlib.reload(importlib.import_module("handler"))
    clock = {"now": 1000.0}
    monkeypatch.setattr(module.time, "monotonic", lambda: clock["now"])
    module.clock = clock
    return module


def test_authorizes_valid_key(authorizer, caplog):
    response = authorizer.handler(request_with_key(VALID_KEY), None)

    assert response == {"isAuthorized": True}
    assert_single_event(caplog, "auth_allowed", logging.INFO)


def test_denies_wrong_key(authorizer, caplog):
    response = authorizer.handler(request_with_key(WRONG_KEY), None)

    assert response == {"isAuthorized": False}
    assert_single_event(caplog, "auth_denied", logging.WARNING)


def test_denies_missing_header(authorizer):
    event = copy.deepcopy(BASE_EVENT)
    del event["headers"]["x-api-key"]

    assert authorizer.handler(event, None) == {"isAuthorized": False}


def test_denies_non_ascii_key_without_failing(authorizer):
    assert authorizer.handler(request_with_key("llave-ñ"), None) == {"isAuthorized": False}


def test_compares_with_compare_digest(authorizer, monkeypatch):
    calls = []
    real_compare = authorizer.hmac.compare_digest

    def spy(received, expected):
        calls.append((received, expected))
        return real_compare(received, expected)

    monkeypatch.setattr(authorizer.hmac, "compare_digest", spy)
    authorizer.handler(request_with_key(WRONG_KEY), None)

    assert calls == [(WRONG_KEY.encode(), VALID_KEY.encode())]


def test_rereads_parameter_only_after_five_minutes(authorizer, ssm_client):
    assert authorizer.handler(request_with_key(VALID_KEY), None) == {"isAuthorized": True}

    put_key(ssm_client, NEW_KEY)
    authorizer.clock["now"] += 299
    assert authorizer.handler(request_with_key(VALID_KEY), None) == {"isAuthorized": True}
    assert authorizer.handler(request_with_key(NEW_KEY), None) == {"isAuthorized": False}

    authorizer.clock["now"] += 1
    assert authorizer.handler(request_with_key(VALID_KEY), None) == {"isAuthorized": False}
    assert authorizer.handler(request_with_key(NEW_KEY), None) == {"isAuthorized": True}


def test_raises_when_parameter_cannot_be_read(authorizer, ssm_client, caplog):
    ssm_client.delete_parameter(Name=PARAMETER_NAME)

    with pytest.raises(ClientError):
        authorizer.handler(request_with_key(VALID_KEY), None)

    assert_single_event(caplog, "auth_key_read_failed", logging.ERROR)
    assert app_records(caplog)[0].exc_info is not None


def test_raises_on_connection_failure(authorizer, caplog, monkeypatch):
    def fail(**_kwargs):
        raise EndpointConnectionError(endpoint_url="https://ssm.example")

    monkeypatch.setattr(authorizer.ssm, "get_parameter", fail)

    with pytest.raises(EndpointConnectionError):
        authorizer.handler(request_with_key(VALID_KEY), None)

    assert_single_event(caplog, "auth_key_read_failed", logging.ERROR)


def test_client_fails_before_function_timeout(authorizer):
    config = authorizer.ssm.meta.config

    assert config.retries["total_max_attempts"] == 1
    assert config.connect_timeout + config.read_timeout < FUNCTION_TIMEOUT_SECONDS


def test_expired_key_is_not_used_when_reread_fails(authorizer, ssm_client):
    authorizer.handler(request_with_key(VALID_KEY), None)
    ssm_client.delete_parameter(Name=PARAMETER_NAME)
    authorizer.clock["now"] += 300

    with pytest.raises(ClientError):
        authorizer.handler(request_with_key(VALID_KEY), None)

    put_key(ssm_client, VALID_KEY)
    assert authorizer.handler(request_with_key(VALID_KEY), None) == {"isAuthorized": True}


def test_logs_never_include_keys_or_event(authorizer, ssm_client, caplog):
    authorizer.handler(request_with_key(VALID_KEY), None)
    authorizer.handler(request_with_key(WRONG_KEY), None)
    ssm_client.delete_parameter(Name=PARAMETER_NAME)
    authorizer.clock["now"] += 300
    with pytest.raises(ClientError):
        authorizer.handler(request_with_key(WRONG_KEY), None)

    records = app_records(caplog)
    assert len(records) == 3
    for record in records:
        rendered = f"{caplog.text} {record.__dict__!r}"
        assert VALID_KEY not in rendered
        assert WRONG_KEY not in rendered
        assert "identitySource" not in rendered
        assert "headers" not in record.__dict__
