
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";

import { DependencyUnavailableError } from "../../common/errors.mjs";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const client = new DynamoDBClient({
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 1000,
    requestTimeout: 2000
  })
});

export class VolcanoRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findAll(limit, exclusiveStartKey = undefined) {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      });

      const result = await client.send(command);

      return {
        items: result.Items ?? [],
        lastEvaluatedKey: result.LastEvaluatedKey ?? null
      };
    } catch (error) {
      throw new DependencyUnavailableError(
        "Unable to retrieve volcano records from DynamoDB.",
        error
      );
    }
  }

  async findById(id) {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          Volcano_Number: { N: String(id) }
        }
      });

      const result = await client.send(command);

      return result.Item ?? null;
    } catch (error) {
      throw new DependencyUnavailableError(
        "Unable to retrieve the requested volcano from DynamoDB.",
        error
      );
    }
  }
}
