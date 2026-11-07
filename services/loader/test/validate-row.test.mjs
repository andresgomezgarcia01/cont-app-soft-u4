import test from "node:test";
import assert from "node:assert/strict";
import { validateRow } from "../src/chain/validate-row.mjs";
import { LoaderValidationError } from "../src/chain/validate-header.mjs";

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

test("accepts a valid row and converts its values", () => {
  const seenKeys = new Set();

  const result = validateRow(createValidRow(), seenKeys);

  assert.equal(result.Volcano_Number, "100");
  assert.equal(result.Volcano_Name, "Test Volcano");
  assert.equal(result.Latitude, "4.5");
  assert.equal(result.Longitude, "-74.2");
  assert.equal(seenKeys.has("100"), true);
});

test("rejects a row with a missing required value", () => {
  const seenKeys = new Set();

  assert.throws(
    () => validateRow(createValidRow({ Country: " " }), seenKeys),
    (error) => {
      assert.ok(error instanceof LoaderValidationError);
      assert.equal(error.code, "MISSING_REQUIRED_VALUE");
      return true;
    }
  );
});

test("rejects an invalid integer", () => {
  const seenKeys = new Set();

  assert.throws(
    () => validateRow(createValidRow({ Volcano_Number: "100.5" }), seenKeys),
    {
      code: "TYPE_CAST_FAILED"
    }
  );
});

test("rejects an invalid decimal", () => {
  const seenKeys = new Set();

  assert.throws(
    () => validateRow(createValidRow({ Latitude: "north" }), seenKeys),
    {
      code: "TYPE_CAST_FAILED"
    }
  );
});

test("rejects duplicate primary keys", () => {
  const seenKeys = new Set(["100"]);

  assert.throws(
    () => validateRow(createValidRow(), seenKeys),
    {
      code: "DUPLICATE_PRIMARY_KEY"
    }
  );
});

test("omits optional empty values", () => {
  const seenKeys = new Set();

  const result = validateRow(
    createValidRow({ Region: "", Subregion: "   " }),
    seenKeys
  );

  assert.equal("Region" in result, false);
  assert.equal("Subregion" in result, false);
});