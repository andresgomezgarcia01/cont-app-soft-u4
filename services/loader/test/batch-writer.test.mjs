import test from "node:test";
import assert from "node:assert/strict";

import { BatchWriter } from "../src/services/batch-writer.mjs";

async function* createRows(rows) {
  for (const row of rows) {
    yield row;
  }
}

test("writes valid rows in batches of maximum 10 items", async () => {
  const batches = [];

  const repository = {
    async writeBatch(items) {
      batches.push(items);
      return { consumedCapacity: items.length };
    }
  };

  const writer = new BatchWriter(repository, 20, async () => {});

  const rows = Array.from({ length: 23 }, (_, index) => ({
    type: "valid",
    item: { Volcano_Number: String(index + 1) }
  }));

  const stats = await writer.write(createRows(rows));

  assert.deepEqual(
    batches.map((batch) => batch.length),
    [10, 10, 3]
  );

  assert.equal(stats.totalRows, 23);
  assert.equal(stats.validRows, 23);
  assert.equal(stats.rejectedRows, 0);
  assert.equal(stats.writtenRows, 23);
  assert.equal(stats.consumedCapacity, 23);
});

test("does not send rejected rows to the repository", async () => {
  const batches = [];

  const repository = {
    async writeBatch(items) {
      batches.push(items);
      return { consumedCapacity: items.length };
    }
  };

  const writer = new BatchWriter(repository, 20, async () => {});

  const rows = createRows([
    { type: "valid", item: { Volcano_Number: "1" } },
    {
      type: "rejected",
      rowNumber: 3,
      error: { code: "TYPE_CAST_FAILED" }
    },
    { type: "valid", item: { Volcano_Number: "2" } }
  ]);

  const stats = await writer.write(rows);

  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 2);
  assert.equal(stats.totalRows, 3);
  assert.equal(stats.validRows, 2);
  assert.equal(stats.rejectedRows, 1);
  assert.equal(stats.writtenRows, 2);
  assert.equal(stats.rejected.length, 1);
});

test("waits according to consumed write capacity", async () => {
  const delays = [];

  const repository = {
    async writeBatch(items) {
      return { consumedCapacity: items.length };
    }
  };

  const writer = new BatchWriter(
    repository,
    20,
    async (milliseconds) => {
      delays.push(milliseconds);
    }
  );

  const rows = createRows([
    { type: "valid", item: { Volcano_Number: "1" } },
    { type: "valid", item: { Volcano_Number: "2" } }
  ]);

  await writer.write(rows);

  assert.equal(delays.length, 1);
  assert.ok(Math.abs(delays[0] - 100) < 1);
});

test("returns zero statistics when there are no rows", async () => {
  const repository = {
    async writeBatch() {
      assert.fail("Repository should not be called");
    }
  };

  const writer = new BatchWriter(repository, 20, async () => {});

  const stats = await writer.write(createRows([]));

  assert.equal(stats.totalRows, 0);
  assert.equal(stats.validRows, 0);
  assert.equal(stats.rejectedRows, 0);
  assert.equal(stats.writtenRows, 0);
  assert.equal(stats.consumedCapacity, 0);
});

test("rejects an invalid write rate", () => {
  const repository = { writeBatch: async () => ({}) };

  assert.throws(
    () => new BatchWriter(repository, 0),
    /WRITE_RATE_WCU must be a positive number/
  );
});

test("rejects unknown processed row types", async () => {
  const repository = { writeBatch: async () => ({}) };
  const writer = new BatchWriter(repository, 20, async () => {});

  await assert.rejects(
    writer.write(createRows([{ type: "unknown" }])),
    /Unknown processed row type/
  );
});

test("subtracts the time already spent writing the batch", async () => {
  const delays = [];
  let currentTime = 0;

  const repository = {
    async writeBatch(items) {
      currentTime += 60;
      return { consumedCapacity: items.length };
    }
  };

  const writer = new BatchWriter(
    repository,
    20,
    async (milliseconds) => {
      delays.push(milliseconds);
    },
    () => currentTime
  );

  const rows = createRows([
    { type: "valid", item: { Volcano_Number: "1" } },
    { type: "valid", item: { Volcano_Number: "2" } }
  ]);

  await writer.write(rows);

  assert.deepEqual(delays, [40]);
});
