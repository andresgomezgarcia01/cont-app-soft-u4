
import test from "node:test";
import assert from "node:assert/strict";

import {
  jsonResponse,
  successResponse,
  errorResponse
} from "../responses.mjs";

import { InvalidParameterError } from "../errors.mjs";

test("jsonResponse creates a valid HTTP response", () => {
  const response = jsonResponse(200, { message: "OK" }, "request-123");

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/json");
  assert.equal(response.headers["x-request-id"], "request-123");
  assert.deepEqual(JSON.parse(response.body), { message: "OK" });
});

test("successResponse returns status 200", () => {
  const response = successResponse({ data: [] }, "request-456");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { data: [] });
});

test("errorResponse returns the expected error structure", () => {
  const error = new InvalidParameterError("Invalid limit");
  const response = errorResponse(error, "request-789");

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers["x-request-id"], "request-789");

  assert.deepEqual(JSON.parse(response.body), {
    error: {
      code: "INVALID_PARAMETER",
      message: "Invalid limit",
      request_id: "request-789"
    }
  });
});

test("errorResponse includes optional error details", () => {
  const error = new InvalidParameterError("Invalid limit", {
    parameter: "limit"
  });

  const response = errorResponse(error, "request-789");

  assert.deepEqual(JSON.parse(response.body).error.details, {
    parameter: "limit"
  });
});

test("jsonResponse omits request ID header when not provided", () => {
  const response = jsonResponse(200, { data: [] });

  assert.equal(response.headers["x-request-id"], undefined);
});
