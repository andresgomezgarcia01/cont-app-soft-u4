
import test from "node:test";
import assert from "node:assert/strict";

import { VolcanoService } from "../src/service.mjs";

function createRepository(items = []) {
  return {
    async findAll(limit, exclusiveStartKey) {
      return {
        items: items.slice(0, limit),
        lastEvaluatedKey: null
      };
    },

    async findById(id) {
      return items.find(
        (item) => Number(item.Volcano_Number.N) === id
      ) ?? null;
    }
  };
}

test("getAll returns volcano records and pagination metadata", async () => {
  const repository = createRepository([
    {
      Volcano_Number: { N: "210010" },
      Volcano_Name: { S: "Volcano One" }
    }
  ]);

  const service = new VolcanoService(repository);
  const result = await service.getAll();

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].Volcano_Number, 210010);
  assert.equal(result.data[0].Volcano_Name, "Volcano One");
  assert.equal(result.page.limit, 25);
  assert.equal(result.page.next_token, null);
});

test("getAll accepts a custom limit", async () => {
  const service = new VolcanoService(createRepository());

  const result = await service.getAll({ limit: 10 });

  assert.equal(result.page.limit, 10);
});

test("getAll rejects limits outside the allowed range", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getAll({ limit: 101 }),
    { code: "INVALID_PARAMETER" }
  );
});

test("getAll rejects invalid pagination tokens", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getAll({ nextToken: "invalid-token" }),
    { code: "INVALID_PAGINATION_TOKEN" }
  );
});

test("getById returns a volcano when it exists", async () => {
  const repository = createRepository([
    {
      Volcano_Number: { N: "210010" },
      Volcano_Name: { S: "Volcano One" }
    }
  ]);

  const service = new VolcanoService(repository);
  const result = await service.getById("210010");

  assert.equal(result.data.Volcano_Number, 210010);
  assert.equal(result.data.Volcano_Name, "Volcano One");
});

test("getById rejects invalid identifiers", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getById("abc"),
    { code: "INVALID_PARAMETER" }
  );
});

test("getById throws when the volcano does not exist", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getById(999999),
    { code: "ITEM_NOT_FOUND" }
  );
});

test("getAll rejects an empty limit", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getAll({ limit: "" }),
    { code: "INVALID_PARAMETER" }
  );
});

test("getAll rejects a null limit", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getAll({ limit: null }),
    { code: "INVALID_PARAMETER" }
  );
});

test("getById rejects an empty identifier", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getById(""),
    { code: "INVALID_PARAMETER" }
  );
});

test("getById rejects decimal identifiers", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getById("210010.5"),
    { code: "INVALID_PARAMETER" }
  );
});

test("getAll rejects malformed Base64 pagination tokens", async () => {
  const service = new VolcanoService(createRepository());

  await assert.rejects(
    () => service.getAll({ nextToken: "abc!123" }),
    { code: "INVALID_PAGINATION_TOKEN" }
  );
});

test("getAll rejects pagination tokens with an invalid key", async () => {
  const service = new VolcanoService(createRepository());

  const invalidKey = Buffer.from(
    JSON.stringify({ Invalid_Key: { N: "123" } })
  ).toString("base64url");

  await assert.rejects(
    () => service.getAll({ nextToken: invalidKey }),
    { code: "INVALID_PAGINATION_TOKEN" }
  );
});


