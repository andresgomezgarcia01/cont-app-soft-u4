
import {
  DynamoDBClient,
  BatchWriteItemCommand
} from "@aws-sdk/client-dynamodb";

import { NodeHttpHandler } from "@smithy/node-http-handler";

import schema from "../../../common/schema/volcanoes.schema.json" with {
  type: "json"
};

const client = new DynamoDBClient({
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 1000,
    requestTimeout: 5000
  })
});

const MAX_BATCH_SIZE = 10;
const MAX_UNPROCESSED_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 100;

export class LoaderWriteError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.name = "LoaderWriteError";
    this.code = "WRITE_FAILED";

    if (details !== undefined) {
      this.details = details;
    }
  }
}

function toDynamoItem(item) {
  const dynamoItem = {};

  for (const column of schema.columns) {
    const value = item[column.name];

    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (column.type === "string") {
      dynamoItem[column.name] = { S: value };
      continue;
    }

    if (column.type === "integer" || column.type === "decimal") {
      dynamoItem[column.name] = { N: value };
    }
  }

  return dynamoItem;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class VolcanoRepository {
  constructor(tableName, dynamoClient = client) {
    this.tableName = tableName;
    this.client = dynamoClient;
  }

  async writeBatch(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return { consumedCapacity: 0 };
    }

    if (items.length > MAX_BATCH_SIZE) {
      throw new RangeError(
        `A batch cannot contain more than ${MAX_BATCH_SIZE} items.`
      );
    }

    let pendingItems = items.map((item) => ({
      PutRequest: {
        Item: toDynamoItem(item)
      }
    }));

    let consumedCapacity = 0;
    let retryCount = 0;

    while (pendingItems.length > 0) {
      const result = await this.client.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [this.tableName]: pendingItems
          },
          ReturnConsumedCapacity: "TOTAL"
        })
      );

      consumedCapacity +=
        result.ConsumedCapacity?.reduce(
          (total, capacity) => total + (capacity.CapacityUnits ?? 0),
          0
        ) ?? 0;

      pendingItems =
        result.UnprocessedItems?.[this.tableName] ?? [];

      if (pendingItems.length === 0) {
        break;
      }

      if (retryCount >= MAX_UNPROCESSED_RETRIES) {
        throw new LoaderWriteError(
          "DynamoDB could not process all batch items.",
          {
            unprocessedCount: pendingItems.length,
            retryCount
          }
        );
      }

      retryCount += 1;

      const delay =
        BASE_RETRY_DELAY_MS * (2 ** (retryCount - 1));

      await sleep(delay);
    }

    return { consumedCapacity };
  }
}
