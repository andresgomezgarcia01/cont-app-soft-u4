import { Readable } from "node:stream";
import { LoaderValidationError } from "../chain/validate-header.mjs";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

async function* decodeUtf8(body) {
  const decoder = new TextDecoder("utf-8", { fatal: true });

  try {
    for await (const chunk of body) {
      yield decoder.decode(chunk, { stream: true });
    }

    const remaining = decoder.decode();

    if (remaining) {
      yield remaining;
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new LoaderValidationError(
        "ENCODING_ERROR",
        "The CSV file is not valid UTF-8."
      );
    }

    throw error;
  }
}

export function createCsvInput({ body, contentLength }) {
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    throw new TypeError("A valid content length is required.");
  }

  if (contentLength > MAX_FILE_SIZE_BYTES) {
    throw new LoaderValidationError(
      "FILE_TOO_LARGE",
      "The CSV file exceeds the maximum allowed size of 3 MB."
    );
  }

  if (!body || typeof body[Symbol.asyncIterator] !== "function") {
    throw new TypeError("A readable S3 object body is required.");
  }

  return Readable.from(decodeUtf8(body));
}
