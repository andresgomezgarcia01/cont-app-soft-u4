
import test from "node:test";
import assert from "node:assert/strict";

import {
  VolcanoRepository,
  LoaderWriteError
} from "../src/repositories/volcano-repository.mjs";

const TABLE_NAME = "volcanoes-test";

function createValidItem(overrides = {}) {
  return {
    Volcano_Number: "100",
    Volcano_Name: "Test Volcano",
    Country: "Colombia",
    Latitude: "4.512345678901234",
    Longitude: "-74.12345678901234",
    ...overrides
  };
}

function createMockClient(responses = []) {
  const calls = [];

  return {
    calls,

    async send(command) {
      calls.push(command.input);

      const response = responses.shift();

      return response ?? {};
    }
  };
}

test("writes items using DynamoDB number and string attributes", async () => {
  const mockClient = createMockClient();
  const repository = new VolcanoRepository(TABLE_NAME, mockClient);

  await repository.writeBatch([createValidItem()]);

  const request = mockClient.calls[0];
  const item = request.RequestItems[TABLE_NAME][0].PutRequest.Item;

  assert.deepEqual(item.Volcano_Number, { N: "100" });
  assert.deepEqual(item.Volcano_Name, { S: "Test Volcano" });
  assert.deepEqual(item.Latitude, { N: "4.512345678901234" });
  assert.deepEqual(item.Longitude, { N: "-74.12345678901234" });
});

test("omits empty optional values", async () => {
  const mockClient = createMockClient();
  const repository = new VolcanoRepository(TABLE_NAME, mockClient);

  await repository.writeBatch([
    createValidItem({ Region: "" })
  ]);

  const item =
    mockClient.calls[0].RequestItems[TABLE_NAME][0].PutRequest.Item;

  assert.equal("Region" in item, false);
});

test("rejects batches larger than 10 items", async () => {
  const mockClient = createMockClient();
  const repository = new VolcanoRepository(TABLE_NAME, mockClient);

  const items = Array.from(
    { length: 11 },
    (_, index) => createValidItem({
      Volcano_Number: String(100 + index)
    })
  );

  await assert.rejects(
    () => repository.writeBatch(items),
    RangeError
  );

  assert.equal(mockClient.calls.length, 0);
});

test("returns successfully when there are no items", async () => {
  const mockClient = createMockClient();
  const repository = new VolcanoRepository(TABLE_NAME, mockClient);

  const result = await repository.writeBatch([]);

  assert.deepEqual(result, { consumedCapacity: 0 });
  assert.equal(mockClient.calls.length, 0);
});

test("retries unprocessed items", async () => {
  const mockClient = createMockClient([
    {
      UnprocessedItems: {
        [TABLE_NAME]: [
          {
            PutRequest: {
              Item: {
                Volcano_Number: { N: "100" }
              }
            }
          }
        ]
      }
    },
    {}
  ]);

  const repository = new VolcanoRepository(TABLE_NAME, mockClient);

  await repository.writeBatch([createValidItem()]);

  assert.equal(mockClient.calls.length, 2);
});

test("throws when items remain unprocessed after retries", async () => {
  const unprocessed = {
    PutRequest: {
      Item: {
        Volcano_Number: { N: "100" }
      }
    }
  };

  const responses = Array.from(
    { length: 6 },
    () => ({
      UnprocessedItems: {
        [TABLE_NAME]: [unprocessed]
      }
    })
  );

  const mockClient = createMockClient(responses);
  const repository = new VolcanoRepository(TABLE_NAME, mockClient);

  await assert.rejects(
    () => repository.writeBatch([createValidItem()]),
    (error) => {
      assert.ok(error instanceof LoaderWriteError);
      assert.equal(error.code, "WRITE_FAILED");
      assert.equal(error.details.unprocessedCount, 1);
      return true;
    }
  );

  assert.equal(mockClient.calls.length, 6);
});
