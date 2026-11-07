import { AppError } from "../../../common/errors.mjs";
import schema from "../../../common/schema/volcanoes.schema.json" with { type: "json" };

export class LoaderValidationError extends AppError {
  constructor(code, message, details = undefined) {
    super(code, message, 422, details);
  }
}

export function validateHeader(headers) {
  const expectedHeaders = schema.columns.map((column) => column.name);

  const matches =
    Array.isArray(headers) &&
    headers.length === expectedHeaders.length &&
    headers.every((header, index) => header === expectedHeaders[index]);

  if (!matches) {
    throw new LoaderValidationError(
      "HEADER_MISMATCH",
      "The CSV headers do not match the expected schema.",
      {
        expected: expectedHeaders,
        received: headers
      }
    );
  }

  return true;
}
