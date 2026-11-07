import test from "node:test";
import assert from "node:assert/strict";

import { processEvent } from "../src/handler.mjs";

function createEvent(keys) {
  return {
    Records: keys.map((key) => ({
      s3: {
        object: {
          key
        }
      }
    }))
  };
}

test("processes an S3 record using the injected service", async () => {
  const calls = [];

  const service = {
    async process(input) {
      calls.push(input);

      return {
        status: "SUCCEEDED",
        source_key: input.sourceKey
      };
    }
  };

  const context = {
    awsRequestId: "request-123"
  };

  const result = await processEvent(
    createEvent(["incoming/volcanoes.csv"]),
    context,
    service
  );

  assert.equal(result.processedRecords, 1);
  assert.equal(result.summaries.length, 1);
  assert.equal(calls[0].sourceKey, "incoming/volcanoes.csv");
  assert.equal(calls[0].context, context);
});

test("decodes spaces and encoded characters in S3 object keys", async () => {
  let receivedKey;

  const service = {
    async process({ sourceKey }) {
      receivedKey = sourceKey;
      return { status: "SUCCEEDED" };
    }
  };

  await processEvent(
    createEvent(["incoming/volcano+data%2B2026.csv"]),
    {},
    service
  );

  assert.equal(
    receivedKey,
    "incoming/volcano data+2026.csv"
  );
});

test("processes multiple S3 records sequentially", async () => {
  const calls = [];

  const service = {
    async process({ sourceKey }) {
      calls.push(sourceKey);
      return { source_key: sourceKey };
    }
  };

  const result = await processEvent(
    createEvent([
      "incoming/first.csv",
      "incoming/second.csv"
    ]),
    {},
    service
  );

  assert.deepEqual(calls, [
    "incoming/first.csv",
    "incoming/second.csv"
  ]);

  assert.equal(result.processedRecords, 2);
  assert.equal(result.summaries.length, 2);
});

test("rejects events without S3 records", async () => {
  await assert.rejects(
    () => processEvent(
      { Records: [] },
      {},
      { process: async () => ({}) }
    ),
    /at least one S3 record/
  );
});

test("rejects records without an object key", async () => {
  await assert.rejects(
    () => processEvent(
      { Records: [{ s3: { object: {} } }] },
      {},
      { process: async () => ({}) }
    ),
    /must include an object key/
  );
});

test("rejects invalid URL encoding in an object key", async () => {
  await assert.rejects(
    () => processEvent(
      createEvent(["incoming/invalid%ZZ.csv"]),
      {},
      { process: async () => ({}) }
    ),
    URIError
  );
});

test("propagates processing errors", async () => {
  const expectedError = new Error("DynamoDB unavailable");

  const service = {
    async process() {
      throw expectedError;
    }
  };

  await assert.rejects(
    () => processEvent(
      createEvent(["incoming/volcanoes.csv"]),
      {},
      service
    ),
    (error) => error === expectedError
  );
});

test("stops processing subsequent records after an error", async () => {
  const calls = [];

  const service = {
    async process({ sourceKey }) {
      calls.push(sourceKey);

      if (sourceKey.endsWith("first.csv")) {
        throw new Error("Processing failed");
      }

      return {};
    }
  };

  await assert.rejects(
    () => processEvent(
      createEvent([
        "incoming/first.csv",
        "incoming/second.csv"
      ]),
      {},
      service
    ),
    /Processing failed/
  );

  assert.deepEqual(calls, ["incoming/first.csv"]);
});
