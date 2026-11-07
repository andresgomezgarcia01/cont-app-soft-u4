
import test from "node:test";
import assert from "node:assert/strict";

import {
  getRequiredEnv,
  getApiConfig
} from "../config.mjs";

test("getRequiredEnv returns an existing environment variable", () => {
  process.env.TEST_VARIABLE = "test-value";

  assert.equal(getRequiredEnv("TEST_VARIABLE"), "test-value");

  delete process.env.TEST_VARIABLE;
});

test("getRequiredEnv throws when the variable is missing", () => {
  delete process.env.MISSING_VARIABLE;

  assert.throws(
    () => getRequiredEnv("MISSING_VARIABLE"),
    /Missing required environment variable/
  );
});

test("getRequiredEnv throws when the variable is empty", () => {
  process.env.EMPTY_VARIABLE = "   ";

  assert.throws(
    () => getRequiredEnv("EMPTY_VARIABLE"),
    /Missing required environment variable/
  );

  delete process.env.EMPTY_VARIABLE;
});

test("getApiConfig returns the DynamoDB table name", () => {
  process.env.TABLE_NAME = "eds-dev-items";

  assert.deepEqual(getApiConfig(), {
    tableName: "eds-dev-items"
  });

  delete process.env.TABLE_NAME;
});
