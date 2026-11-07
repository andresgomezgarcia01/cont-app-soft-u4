import test from "node:test";
import assert from "node:assert/strict";

import { processRows } from "../src/chain/process-rows.mjs";

function createValidRow(overrides = {}) {
  return {
    FID: "1",
    Volcano_Number: "100",
    Volcano_Name: "Test Volcano",
    Country: "Colombia",
    Latitude: "4.5",
    Longitude: "-74.2",
    ...overrides
  };
}

async function collectResults(rows) {
  const results = [];

  for await (const result of processRows(rows)) {
    results.push(result);
  }

  return results;
}

test("processes valid rows and preserves their row numbers", async () => {
  const rows = [
    createValidRow(),
    createValidRow({
      Volcano_Number: "101",
      Volcano_Name: "Second Volcano"
    })
  ];

  const results = await collectResults(rows);

  assert.equal(results.length, 2);
  assert.equal(results[0].type, "valid");
  assert.equal(results[0].rowNumber, 2);
  assert.equal(results[1].type, "valid");
  assert.equal(results[1].rowNumber, 3);
});

test("rejects invalid rows without stopping the process", async () => {
  const rows = [
    createValidRow(),
    createValidRow({
      Volcano_Number: "invalid"
    }),
    createValidRow({
      Volcano_Number: "102",
      Volcano_Name: "Third Volcano"
    })
  ];

  const results = await collectResults(rows);

  assert.equal(results.length, 3);
  assert.equal(results[0].type, "valid");

  assert.equal(results[1].type, "rejected");
  assert.equal(results[1].rowNumber, 3);
  assert.equal(results[1].error.code, "TYPE_CAST_FAILED");

  assert.equal(results[2].type, "valid");
});

test("rejects duplicate primary keys", async () => {
  const rows = [
    createValidRow(),
    createValidRow({
      Volcano_Name: "Duplicate Volcano"
    })
  ];

  const results = await collectResults(rows);

  assert.equal(results[0].type, "valid");
  assert.equal(results[1].type, "rejected");
  assert.equal(results[1].error.code, "DUPLICATE_PRIMARY_KEY");
});

test("preserves the original row in rejected results", async () => {
  const invalidRow = createValidRow({
    Latitude: "north"
  });

  const results = await collectResults([invalidRow]);

  assert.equal(results[0].type, "rejected");
  assert.deepEqual(results[0].row, invalidRow);
  assert.equal(results[0].error.code, "TYPE_CAST_FAILED");
});
test("rejects rows with fewer fields using MALFORMED_ROW", async () => {
  const { MALFORMED_ROW } = await import(
    "../src/parser/csv-parser.mjs"
  );

  const row = {
    Volcano_Number: "123",
    Volcano_Name: "Example Volcano"
  };

  Object.defineProperty(row, MALFORMED_ROW, {
    value: {
      expectedFields: 3,
      receivedFields: 2,
      extraValues: []
    }
  });

  const results = [];

  for await (const result of processRows([row])) {
    results.push(result);
  }

  assert.equal(results.length, 1);
  assert.equal(results[0].type, "rejected");
  assert.equal(results[0].error.code, "MALFORMED_ROW");
  assert.equal(results[0].error.details.receivedFields, 2);
});

test("rejects rows with extra fields using MALFORMED_ROW", async () => {
  const { MALFORMED_ROW } = await import(
    "../src/parser/csv-parser.mjs"
  );

  const row = {
    Volcano_Number: "123",
    Volcano_Name: "Example Volcano",
    Country: "Chile"
  };

  Object.defineProperty(row, MALFORMED_ROW, {
    value: {
      expectedFields: 3,
      receivedFields: 4,
      extraValues: ["unexpected"]
    }
  });

  const results = [];

  for await (const result of processRows([row])) {
    results.push(result);
  }

  assert.equal(results.length, 1);
  assert.equal(results[0].type, "rejected");
  assert.equal(results[0].error.code, "MALFORMED_ROW");
  assert.deepEqual(results[0].error.details.extraValues, ["unexpected"]);
});
