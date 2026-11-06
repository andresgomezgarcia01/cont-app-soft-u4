
import test from "node:test";
import assert from "node:assert/strict";

import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand
} from "@aws-sdk/client-dynamodb";

import { VolcanoRepository } from "../src/repository.mjs";
import { DependencyUnavailableError } from "../../common/errors.mjs";

test("findAll executes a Scan command", async () => {
  const originalSend = DynamoDBClient.prototype.send;

  DynamoDBClient.prototype.send = async function (command) {
    assert.ok(command instanceof ScanCommand);
    assert.equal(command.input.TableName, "eds-dev-items");
    assert.equal(command.input.Limit, 25);

    return {
      Items: [{ Volcano_Number: { N: "210010" } }],
      LastEvaluatedKey: undefined
    };
  };

  try {
    const repository = new VolcanoRepository("eds-dev-items");
    const result = await repository.findAll(25);

    assert.equal(result.items.length, 1);
    assert.equal(result.lastEvaluatedKey, null);
  } finally {
    DynamoDBClient.prototype.send = originalSend;
  }
});

test("findAll preserves the pagination key", async () => {
  const originalSend = DynamoDBClient.prototype.send;
  const paginationKey = {
    Volcano_Number: { N: "210010" }
  };

  DynamoDBClient.prototype.send = async function (command) {
    assert.ok(command instanceof ScanCommand);
    assert.deepEqual(command.input.ExclusiveStartKey, paginationKey);

    return {
      Items: [],
      LastEvaluatedKey: paginationKey
    };
  };

  try {
    const repository = new VolcanoRepository("eds-dev-items");
    const result = await repository.findAll(10, paginationKey);

    assert.deepEqual(result.lastEvaluatedKey, paginationKey);
  } finally {
    DynamoDBClient.prototype.send = originalSend;
  }
});

test("findById executes a GetItem command with the correct key", async () => {
  const originalSend = DynamoDBClient.prototype.send;

  DynamoDBClient.prototype.send = async function (command) {
    assert.ok(command instanceof GetItemCommand);
    assert.equal(command.input.TableName, "eds-dev-items");

    assert.deepEqual(command.input.Key, {
      Volcano_Number: { N: "210010" }
    });

    return {
      Item: {
        Volcano_Number: { N: "210010" },
        Volcano_Name: { S: "Volcano One" }
      }
    };
  };

  try {
    const repository = new VolcanoRepository("eds-dev-items");
    const result = await repository.findById(210010);

    assert.equal(result.Volcano_Number.N, "210010");
  } finally {
    DynamoDBClient.prototype.send = originalSend;
  }
});

test("findById returns null when the item does not exist", async () => {
  const originalSend = DynamoDBClient.prototype.send;

  DynamoDBClient.prototype.send = async () => ({
    Item: undefined
  });

  try {
    const repository = new VolcanoRepository("eds-dev-items");
    const result = await repository.findById(999999);

    assert.equal(result, null);
  } finally {
    DynamoDBClient.prototype.send = originalSend;
  }
});

test("findAll translates DynamoDB errors", async () => {
  const originalSend = DynamoDBClient.prototype.send;

  DynamoDBClient.prototype.send = async () => {
    throw new Error("DynamoDB unavailable");
  };

  try {
    const repository = new VolcanoRepository("eds-dev-items");

    await assert.rejects(
      () => repository.findAll(25),
      DependencyUnavailableError
    );
  } finally {
    DynamoDBClient.prototype.send = originalSend;
  }
});
