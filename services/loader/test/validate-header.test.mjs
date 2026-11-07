import test from "node:test";
import assert from "node:assert/strict";

import {
  validateHeader,
  LoaderValidationError
} from "../src/chain/validate-header.mjs";

const validHeaders = [
  "FID",
  "Volcano_Number",
  "Volcano_Name",
  "Volcanic_Landform",
  "Primary_Volcano_Type",
  "Last_Eruption_Year",
  "Country",
  "Region",
  "Subregion",
  "Geological_Summary",
  "Latitude",
  "Longitude",
  "Elevation",
  "Tectonic_Setting",
  "Geologic_Epoch",
  "Evidence_Category",
  "Primary_Photo_Link",
  "Primary_Photo_Caption",
  "Primary_Photo_Credit",
  "Major_Rock_Type",
  "GeoLocation"
];

test("accepts headers matching the schema", () => {
  assert.equal(validateHeader(validHeaders), true);
});

test("rejects headers in the wrong order", () => {
  const headers = [...validHeaders];
  [headers[0], headers[1]] = [headers[1], headers[0]];

  assert.throws(
    () => validateHeader(headers),
    (error) => {
      assert.ok(error instanceof LoaderValidationError);
      assert.equal(error.code, "HEADER_MISMATCH");
      return true;
    }
  );
});

test("rejects incomplete headers", () => {
  const headers = validHeaders.slice(0, -1);

  assert.throws(
    () => validateHeader(headers),
    {
      code: "HEADER_MISMATCH"
    }
  );
});
