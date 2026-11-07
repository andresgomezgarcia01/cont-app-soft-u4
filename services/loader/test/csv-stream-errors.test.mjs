import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { createCsvInput } from "../src/services/csv-input.mjs";
import { parseCsv } from "../src/parser/csv-parser.mjs";

test("propagates UTF-8 decoding errors to the CSV parser", async () => {
  const body = Readable.from([
    Buffer.from([0xC3, 0x28])
  ]);

  const input = createCsvInput({
    body,
    contentLength: 2
  });

  await assert.rejects(
    async () => {
     for await (const row of parseCsv(input)) {
        assert.fail(`Unexpected CSV row: ${JSON.stringify(row)}`);
      }
    },
    (error) => error.code === "ENCODING_ERROR"
  );
});

test("propagates upstream stream errors to the CSV parser", async () => {
  async function* brokenStream() {
    yield Buffer.from("partial CSV content");
    throw new Error("S3 stream failed");
  }

  const input = Readable.from(brokenStream());

  await assert.rejects(
    async () => {
      for await (const row of parseCsv(input)) {
        assert.fail(`Unexpected CSV row: ${JSON.stringify(row)}`);
      }
    },
    /S3 stream failed/
  );
});
