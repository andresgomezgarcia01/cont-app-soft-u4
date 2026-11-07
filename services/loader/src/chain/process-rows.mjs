import { LoaderValidationError } from "./validate-header.mjs";
import { validateRow } from "./validate-row.mjs";
import { MALFORMED_ROW } from "../parser/csv-parser.mjs";

export async function* processRows(rows) {
  const seenKeys = new Set();
  let rowNumber = 1;

  for await (const row of rows) {
    rowNumber += 1;

    const malformed = row[MALFORMED_ROW];

    if (malformed) {
      yield {
        type: "rejected",
        rowNumber,
        row,
        error: {
          code: "MALFORMED_ROW",
          message:
            `Expected ${malformed.expectedFields} fields, ` +
            `received ${malformed.receivedFields}.`,
          details: malformed
        }
      };

      continue;
    }

    try {
      const item = validateRow(row, seenKeys);

      yield {
        type: "valid",
        rowNumber,
        item
      };
    } catch (error) {
      if (!(error instanceof LoaderValidationError)) {
        throw error;
      }

      yield {
        type: "rejected",
        rowNumber,
        row,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      };
    }
  }
}
