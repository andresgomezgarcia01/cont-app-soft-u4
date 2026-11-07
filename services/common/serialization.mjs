
import schema from "./schema/volcanoes.schema.json" with { type: "json" };

export function deserializeItem(item) {
  const result = {};

  for (const column of schema.columns) {
    const attribute = item[column.name];

    if (!attribute) {
      result[column.name] = null;
      continue;
    }

    if (attribute.S !== undefined) {
      result[column.name] = attribute.S;
    } else if (attribute.N !== undefined) {
      const value = Number(attribute.N);

      result[column.name] = column.type === "integer"
        ? Math.trunc(value)
        : value;
    } else if (attribute.BOOL !== undefined) {
      result[column.name] = attribute.BOOL;
    } else {
      result[column.name] = null;
    }
  }

  return result;
}

export function deserializeItems(items) {
  return items.map(deserializeItem);
}
