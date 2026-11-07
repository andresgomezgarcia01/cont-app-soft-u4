
import test from "node:test";
import assert from "node:assert/strict";

import {
  AppError,
  InvalidParameterError,
  InvalidPaginationTokenError,
  ItemNotFoundError,
  DependencyUnavailableError,
  InternalError
} from "../errors.mjs";

test("AppError stores its properties", () => {
  const error = new AppError("CUSTOM_ERROR", "Custom message", 418);

  assert.equal(error.code, "CUSTOM_ERROR");
  assert.equal(error.message, "Custom message");
  assert.equal(error.statusCode, 418);
  assert.equal(error.name, "AppError");
});

test("InvalidParameterError uses status 400", () => {
  const error = new InvalidParameterError("Invalid limit");

  assert.equal(error.code, "INVALID_PARAMETER");
  assert.equal(error.statusCode, 400);
});

test("InvalidPaginationTokenError uses status 400", () => {
  const error = new InvalidPaginationTokenError();

  assert.equal(error.code, "INVALID_PAGINATION_TOKEN");
  assert.equal(error.statusCode, 400);
});

test("ItemNotFoundError uses status 404", () => {
  const error = new ItemNotFoundError();

  assert.equal(error.code, "ITEM_NOT_FOUND");
  assert.equal(error.statusCode, 404);
});

test("DependencyUnavailableError uses status 503", () => {
  const error = new DependencyUnavailableError();

  assert.equal(error.code, "DEPENDENCY_UNAVAILABLE");
  assert.equal(error.statusCode, 503);
});

test("InternalError uses status 500", () => {
  const error = new InternalError();

  assert.equal(error.code, "INTERNAL_ERROR");
  assert.equal(error.statusCode, 500);
});

test("AppError preserves optional details", () => {
  const details = { parameter: "limit" };
  const error = new InvalidParameterError("Invalid limit", details);

  assert.deepEqual(error.details, details);
});
