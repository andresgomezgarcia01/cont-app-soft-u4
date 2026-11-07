
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { handler } from "../src/handler.mjs";
import {
  InvalidParameterError,
  ItemNotFoundError,
} from "../../common/errors.mjs";

describe("API handler", () => {
  it("GET /items returns a successful response", async () => {
    const service = {
      async getAll() {
        return {
          data: [],
          page: {
            limit: 25,
            next_token: null,
          },
        };
      },
    };

    const event = {
      routeKey: "GET /items",
      requestContext: {
        requestId: "request-123",
      },
      queryStringParameters: null,
    };

    const response = await handler(event, service);

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.headers["content-type"],
      "application/json",
    );
    assert.equal(
      response.headers["x-request-id"],
      "request-123",
    );

    assert.deepEqual(JSON.parse(response.body), {
      data: [],
      page: {
        limit: 25,
        next_token: null,
      },
    });
  });

  it("GET /items/{id} returns a single item", async () => {
    const service = {
      async getById(id) {
        assert.equal(id, "210010");

        return {
          data: {
            Volcano_Number: 210010,
            Volcano_Name: "Volcano One",
          },
        };
      },
    };

    const event = {
      routeKey: "GET /items/{id}",
      requestContext: {
        requestId: "request-456",
      },
      pathParameters: {
        id: "210010",
      },
    };

    const response = await handler(event, service);

    assert.equal(response.statusCode, 200);

    assert.deepEqual(JSON.parse(response.body), {
      data: {
        Volcano_Number: 210010,
        Volcano_Name: "Volcano One",
      },
    });
  });

  it("returns 400 when the service rejects an invalid parameter", async () => {
    const service = {
      async getAll() {
        throw new InvalidParameterError("Invalid limit");
      },
    };

    const event = {
      routeKey: "GET /items",
      requestContext: {
        requestId: "request-789",
      },
      queryStringParameters: {
        limit: "invalid",
      },
    };

    const response = await handler(event, service);
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "INVALID_PARAMETER");
    assert.equal(body.error.message, "Invalid limit");
    assert.equal(body.error.request_id, "request-789");
  });

  it("returns 404 when the requested item does not exist", async () => {
    const service = {
      async getById() {
        throw new ItemNotFoundError();
      },
    };

    const event = {
      routeKey: "GET /items/{id}",
      requestContext: {
        requestId: "request-404",
      },
      pathParameters: {
        id: "999999",
      },
    };

    const response = await handler(event, service);
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 404);
    assert.equal(body.error.code, "ITEM_NOT_FOUND");
    assert.equal(body.error.request_id, "request-404");
  });

  it("returns 400 when the requested route is not supported", async () => {
    const service = {};

    const event = {
      routeKey: "DELETE /items",
      requestContext: {
        requestId: "request-400",
      },
    };

    const response = await handler(event, service);
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "INVALID_PARAMETER");
    assert.equal(body.error.request_id, "request-400");
  });

  it("returns 500 when an unexpected error occurs", async () => {
    const service = {
      async getAll() {
        throw new Error("Unexpected database error");
      },
    };

    const event = {
      routeKey: "GET /items",
      requestContext: {
        requestId: "request-500",
      },
    };

    const response = await handler(event, service);
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.equal(body.error.request_id, "request-500");

    // Internal error details must not be exposed to the client.
    assert.notEqual(
      body.error.message,
      "Unexpected database error",
    );
  });

  it("returns 500 when an unknown error type is thrown", async () => {
    const service = {
      async getAll() {
        throw {
          code: "SOME_UNKNOWN_ERROR",
          statusCode: 418,
        };
      },
    };

    const event = {
      routeKey: "GET /items",
      requestContext: {
        requestId: "request-unknown",
      },
    };

    const response = await handler(event, service);
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.equal(body.error.code, "INTERNAL_ERROR");
  });
});
