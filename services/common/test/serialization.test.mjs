
import test from "node:test";
import assert from "node:assert/strict";

import {
  deserializeItem,
  deserializeItems
} from "../serialization.mjs";

test("deserializeItem converts DynamoDB attributes to JSON values", () => {
  const item = {
    Volcano_Number: { N: "210010" },
    Volcano_Name: { S: "Example Volcano" },
    Latitude: { N: "19.514" },
    Longitude: { N: "-155.292" },
    Country: { S: "United States" }
  };

  const result = deserializeItem(item);

  assert.equal(result.Volcano_Number, 210010);
  assert.equal(result.Volcano_Name, "Example Volcano");
  assert.equal(result.Latitude, 19.514);
  assert.equal(result.Longitude, -155.292);
  assert.equal(result.Country, "United States");
});

test("deserializeItem fills missing attributes with null", () => {
  const item = {
    Volcano_Number: { N: "210010" },
    Volcano_Name: { S: "Example Volcano" }
  };

  const result = deserializeItem(item);

  assert.equal(result.Volcanic_Landform, null);
  assert.equal(result.Last_Eruption_Year, null);
  assert.equal(result.Elevation, null);
});

test("deserializeItem returns all schema columns", () => {
  const result = deserializeItem({});

  assert.equal(Object.keys(result).length, 21);
});

test("deserializeItems converts multiple records", () => {
  const items = [
    {
      Volcano_Number: { N: "210010" },
      Volcano_Name: { S: "Volcano One" }
    },
    {
      Volcano_Number: { N: "210020" },
      Volcano_Name: { S: "Volcano Two" }
    }
  ];

  const result = deserializeItems(items);

  assert.equal(result.length, 2);
  assert.equal(result[0].Volcano_Number, 210010);
  assert.equal(result[1].Volcano_Name, "Volcano Two");
});

test("deserializeItems returns an empty array for no records", () => {
  assert.deepEqual(deserializeItems([]), []);
});
