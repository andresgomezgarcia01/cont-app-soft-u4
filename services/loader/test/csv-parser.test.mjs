import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { parseCsv } from "../src/parser/csv-parser.mjs";

const headers = [
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

function createCsv(rows = []) {
  return [headers.join(","), ...rows].join("\n");
}

async function collectRows(input) {
  const rows = [];

  for await (const row of parseCsv(input)) {
    rows.push(row);
  }

  return rows;
}

test("parses CSV rows as objects using the headers", async () => {
  const values = [
    "1",
    "100",
    "Test Volcano",
    "",
    "",
    "",
    "Colombia",
    "",
    "",
    "",
    "4.5",
    "-74.2",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ];

  const input = Readable.from([createCsv([values.join(",")])]);
  const rows = await collectRows(input);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].Volcano_Number, "100");
  assert.equal(rows[0].Volcano_Name, "Test Volcano");
  assert.equal(rows[0].Country, "Colombia");
});

test("trims values and ignores empty lines", async () => {
  const values = [
    "1",
    "100",
    "  Test Volcano  ",
    "",
    "",
    "",
    "Colombia",
    "",
    "",
    "",
    "4.5",
    "-74.2",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ];

  const csv = `${headers.join(",")}\n\n${values.join(",")}\n`;
  const input = Readable.from([csv]);
  const rows = await collectRows(input);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].Volcano_Name, "Test Volcano");
});

test("rejects an invalid CSV header", async () => {
  const csv = "Wrong,Header\nvalue,100";
  const input = Readable.from([csv]);

  await assert.rejects(
    async () => collectRows(input),
    { code: "HEADER_MISMATCH" }
  );
});

test("rejects an empty CSV", async () => {
  const input = Readable.from([""]);

  await assert.rejects(
    async () => collectRows(input),
    { code: "HEADER_MISMATCH" }
  );
});
test("parses rows with fewer or more fields without stopping", async () => {
  const headers = [
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

  const makeRow = (number, name, country) => {
    const values = Array(headers.length).fill("");
    values[1] = String(number);
    values[2] = name;
    values[6] = country;
    return values;
  };

  const validRow = makeRow(1, "Volcano One", "Chile");
  const shortRow = makeRow(2, "Volcano Two", "Peru").slice(0, -1);
  const longRow = [...makeRow(3, "Volcano Three", "Peru"), "EXTRA"];
  const finalRow = makeRow(4, "Volcano Four", "Ecuador");

  const input = Readable.from([
    [
      headers.join(","),
      validRow.join(","),
      shortRow.join(","),
      longRow.join(","),
      finalRow.join(",")
    ].join("\n")
  ]);

  const rows = [];

  for await (const row of parseCsv(input)) {
    rows.push(row);
  }

  assert.equal(rows.length, 4);
  assert.equal(rows[1].Volcano_Name, "Volcano Two");
  assert.equal(rows[2].Volcano_Name, "Volcano Three");
  assert.equal(rows[3].Country, "Ecuador");
});
