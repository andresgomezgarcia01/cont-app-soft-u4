import test from "node:test";
import assert from "node:assert/strict";

import {
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";

import { S3Repository } from "../src/repositories/s3-repository.mjs";

test("gets an object from the configured bucket", async () => {
  let receivedCommand;

  const expectedResponse = {
    Body: "csv-content",
    ContentLength: 100
  };

  const client = {
    async send(command) {
      receivedCommand = command;
      return expectedResponse;
    }
  };

  const repository = new S3Repository("test-bucket", client);
  const result = await repository.getObject("incoming/volcanoes.csv");

  assert.ok(receivedCommand instanceof GetObjectCommand);
  assert.deepEqual(receivedCommand.input, {
    Bucket: "test-bucket",
    Key: "incoming/volcanoes.csv"
  });
  assert.equal(result, expectedResponse);
});

test("puts an object into the configured bucket", async () => {
  let receivedCommand;

  const expectedResponse = { ETag: '"test-etag"' };

  const client = {
    async send(command) {
      receivedCommand = command;
      return expectedResponse;
    }
  };

  const repository = new S3Repository("test-bucket", client);

  const result = await repository.putObject(
    "reports/run-123/summary.json",
    '{"status":"SUCCEEDED"}',
    "application/json"
  );

  assert.ok(receivedCommand instanceof PutObjectCommand);
  assert.deepEqual(receivedCommand.input, {
    Bucket: "test-bucket",
    Key: "reports/run-123/summary.json",
    Body: '{"status":"SUCCEEDED"}',
    ContentType: "application/json"
  });
  assert.equal(result, expectedResponse);
});

test("rejects an empty bucket name", () => {
  assert.throws(
    () => new S3Repository(""),
    /valid S3 bucket name/
  );
});

test("rejects an invalid S3 client", () => {
  assert.throws(
    () => new S3Repository("test-bucket", {}),
    /valid S3 client/
  );
});

test("rejects an empty object key", async () => {
  const repository = new S3Repository("test-bucket", {
    async send() {
      throw new Error("The client should not be called.");
    }
  });

  await assert.rejects(
    repository.getObject(""),
    /valid S3 object key/
  );
});

test("rejects a missing object body", async () => {
  const repository = new S3Repository("test-bucket", {
    async send() {
      throw new Error("The client should not be called.");
    }
  });

  await assert.rejects(
    repository.putObject("reports/test.json", null, "application/json"),
    /object body is required/
  );
});

test("rejects a missing content type", async () => {
  const repository = new S3Repository("test-bucket", {
    async send() {
      throw new Error("The client should not be called.");
    }
  });

  await assert.rejects(
    repository.putObject("reports/test.json", "{}", ""),
    /valid content type/
  );
});
