import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { createCsvInput } from "../src/services/csv-input.mjs";

async function readStream(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return chunks.join("");
}

test("reads a valid UTF-8 stream", async () => {
  const body = Readable.from([
    Buffer.from("Volcano_Name,Country\n"),
    Buffer.from("Cotopaxi,Ecuador\n")
  ]);

  const input = createCsvInput({
    body,
    contentLength: 40
  });

  assert.equal(
    await readStream(input),
    "Volcano_Name,Country\nCotopaxi,Ecuador\n"
  );
});

test("supports UTF-8 characters split across chunks", async () => {
  const character = Buffer.from("á");
  const body = Readable.from([
    character.subarray(0, 1),
    character.subarray(1)
  ]);

  const input = createCsvInput({
    body,
    contentLength: 2
  });

  assert.equal(await readStream(input), "á");
});

test("rejects files larger than 3 MB", () => {
  assert.throws(
    () => createCsvInput({
      body: Readable.from([]),
      contentLength: 3 * 1024 * 1024 + 1
    }),
    (error) => error.code === "FILE_TOO_LARGE"
  );
});

test("accepts files exactly 3 MB", async () => {
  const input = createCsvInput({
    body: Readable.from([]),
    contentLength: 3 * 1024 * 1024
  });

  assert.equal(await readStream(input), "");
});

test("rejects invalid UTF-8 encoding", async () => {
  const body = Readable.from([
    Buffer.from([0xC3, 0x28])
  ]);

  const input = createCsvInput({
    body,
    contentLength: 2
  });

  await assert.rejects(
    readStream(input),
    (error) => error.code === "ENCODING_ERROR"
  );
});

test("rejects incomplete UTF-8 sequences", async () => {
  const body = Readable.from([
    Buffer.from([0xC3])
  ]);

  const input = createCsvInput({
    body,
    contentLength: 1
  });

  await assert.rejects(
    readStream(input),
    (error) => error.code === "ENCODING_ERROR"
  );
});

test("rejects an invalid content length", () => {
  assert.throws(
    () => createCsvInput({
      body: Readable.from([]),
      contentLength: -1
    }),
    /valid content length/
  );
});

test("rejects a missing body", () => {
  assert.throws(
    () => createCsvInput({
      body: null,
      contentLength: 10
    }),
    /readable S3 object body/
  );
});
