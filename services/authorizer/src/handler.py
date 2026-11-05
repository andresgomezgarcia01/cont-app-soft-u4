import hmac
import logging
import os
import time
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

KEY_TTL_SECONDS = 300

logger = logging.getLogger()

# Sin reintentos: con otro intento se podría agotar el timeout de 5 s antes de registrar el fallo.
ssm = boto3.client(
    "ssm",
    config=Config(
        connect_timeout=1,
        read_timeout=2,
        retries={"mode": "standard", "total_max_attempts": 1},
    ),
)
parameter_name = os.environ["API_KEY_PARAMETER_NAME"]

cached_key: bytes | None = None
cached_key_expires_at = 0.0


def read_api_key() -> bytes:
    global cached_key, cached_key_expires_at

    if cached_key is None or time.monotonic() >= cached_key_expires_at:
        response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
        cached_key = response["Parameter"]["Value"].encode()
        cached_key_expires_at = time.monotonic() + KEY_TTL_SECONDS
    return cached_key


def handler(event: dict[str, Any], context: Any) -> dict[str, bool]:
    log_fields = {
        "service": "authorizer",
        "correlation_id": event["requestContext"]["requestId"],
    }

    try:
        expected_key = read_api_key()
    except (BotoCoreError, ClientError):
        logger.exception("auth_key_read_failed", extra=log_fields)
        raise

    # En bytes, porque compare_digest lanza TypeError con un str que no sea ASCII.
    received_key = event.get("headers", {}).get("x-api-key", "").encode()

    if hmac.compare_digest(received_key, expected_key):
        logger.info("auth_allowed", extra=log_fields)
        return {"isAuthorized": True}

    logger.warning("auth_denied", extra=log_fields)
    return {"isAuthorized": False}
