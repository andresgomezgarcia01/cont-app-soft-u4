
import { LoaderValidationError } from "./validate-header.mjs";
import schema from "../../../common/schema/volcanoes.schema.json" with { type: "json" };

const primaryKey = schema.primary_key;

function validateRequiredValues(row) {
  for (const column of schema.columns) {
    if (!column.required) continue;

    const value = row[column.name];

    if (value === undefined || value === null || value.trim() === "") {
      throw new LoaderValidationError(
        "MISSING_REQUIRED_VALUE",
        `Required value is missing: ${column.name}.`,
        { column: column.name }
      );
    }
  }
}

function convertTypes(row) {
  const item = {};

  for (const column of schema.columns) {
    const rawValue = row[column.name];

    // Las celdas vacías se omiten.
    if (rawValue === undefined || rawValue === null || rawValue.trim() === "") {
      continue;
    }

    const value = rawValue.trim();

    if (column.type === "string") {
      item[column.name] = value;
      continue;
    }

    if (column.type === "integer") {
      if (!/^-?\d+$/.test(value)) {
        throw new LoaderValidationError(
          "TYPE_CAST_FAILED",
          `Invalid integer value in ${column.name}.`,
          { column: column.name, value }
        );
      }

      item[column.name] = value;
      continue;
    }

    if (column.type === "decimal") {
      if (!/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ||
          !Number.isFinite(Number(value))) {
        throw new LoaderValidationError(
          "TYPE_CAST_FAILED",
          `Invalid decimal value in ${column.name}.`,
          { column: column.name, value }
        );
      }

      // Se conserva el texto para no perder precisión.
      item[column.name] = value;
    }
  }

  return item;
}

export function validateRow(row, seenKeys) {
  validateRequiredValues(row);

  const item = convertTypes(row);
  const key = item[primaryKey];

  if (seenKeys.has(key)) {
    throw new LoaderValidationError(
      "DUPLICATE_PRIMARY_KEY",
      `Duplicate primary key: ${key}.`,
      { column: primaryKey, value: key }
    );
  }

  seenKeys.add(key);

  return item;
}
