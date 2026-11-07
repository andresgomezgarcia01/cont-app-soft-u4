import { parse } from "csv-parse";
import { validateHeader } from "../chain/validate-header.mjs";

export const MALFORMED_ROW = Symbol("MALFORMED_ROW");

const CSV_OPTIONS = {
  bom: true,
  trim: true,
  skip_empty_lines: true,
  relax_column_count: true
};

export async function* parseCsv(input) {
  const parser = parse(CSV_OPTIONS);

  const forwardInputError = (error) => {
    parser.destroy(error);
  };

  input.once("error", forwardInputError);
  input.pipe(parser);

  let headers;
  let hasHeader = false;

  try {
    for await (const record of parser) {
      if (!hasHeader) {
        validateHeader(record);
        headers = record;
        hasHeader = true;
        continue;
      }

      const row = {};

      headers.forEach((header, index) => {
        row[header] = record[index] ?? "";
      });

      if (record.length !== headers.length) {
        Object.defineProperty(row, MALFORMED_ROW, {
          value: {
            expectedFields: headers.length,
            receivedFields: record.length,
            extraValues: record.slice(headers.length)
          }
        });
      }

      yield row;
    }

    if (!hasHeader) {
      validateHeader([]);
    }
  } finally {
    input.off("error", forwardInputError);
  }
}
