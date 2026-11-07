import test from "node:test";
import assert from "node:assert/strict";

import { ReportWriter } from "../src/services/report-writer.mjs";

function createSummary(overrides = {}) {
  return {
    run_id: "run-123",
    source_key: "incoming/volcanoes-2026-11-06.csv",
    status: "SUCCEEDED",
    started_at: "2026-11-06T10:00:00.000Z",
    finished_at: "2026-11-06T10:02:00.000Z",
    rows_read: 100,
    rows_written: 95,
    rows_rejected: 5,
    ...overrides
  };
}

test("writes a summary report to the expected S3 key", async () => {
  let received;

  const repository = {
    async putObject(key, body, contentType) {
      received = { key, body, contentType };
      return { ETag: "test-etag" };
    }
  };

  const writer = new ReportWriter(repository);
  await writer.writeSummary(createSummary());

  assert.equal(
    received.key,
    "reports/run-123/summary.json"
  );
  assert.equal(received.contentType, "application/json");
  assert.deepEqual(JSON.parse(received.body), createSummary());
});

test("includes error_code when the load fails", async () => {
  let receivedBody;

  const repository = {
    async putObject(key, body) {
      receivedBody = JSON.parse(body);
    }
  };

  const writer = new ReportWriter(repository);

  const summary = createSummary({
    status: "FAILED",
    error_code: "ENCODING_ERROR"
  });

  await writer.writeSummary(summary);

  assert.equal(receivedBody.status, "FAILED");
  assert.equal(receivedBody.error_code, "ENCODING_ERROR");
});

test("does not include error_code when the load succeeds", async () => {
  let receivedBody;

  const repository = {
    async putObject(key, body) {
      receivedBody = JSON.parse(body);
    }
  };

  const writer = new ReportWriter(repository);

  await writer.writeSummary(
    createSummary({ error_code: "OLD_ERROR" })
  );

  assert.equal("error_code" in receivedBody, false);
});

test("accepts a successful load with rejected rows", async () => {
  const repository = {
    async putObject(key, body) {
      assert.equal(
        JSON.parse(body).status,
        "SUCCEEDED_WITH_REJECTIONS"
      );
    }
  };

  const writer = new ReportWriter(repository);

  await writer.writeSummary(
    createSummary({ status: "SUCCEEDED_WITH_REJECTIONS" })
  );
});

test("rejects a missing summary field", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  const summary = createSummary();
  delete summary.source_key;

  await assert.rejects(
    writer.writeSummary(summary),
    /Missing summary field: source_key/
  );
});

test("rejects an invalid status", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeSummary(createSummary({ status: "UNKNOWN" })),
    /Invalid summary status/
  );
});

test("requires an error code for failed loads", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeSummary(createSummary({ status: "FAILED" })),
    /requires an error code/
  );
});

test("rejects negative row counts", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeSummary(createSummary({ rows_written: -1 })),
    /Invalid summary field: rows_written/
  );
});

test("writes rejected rows to the expected S3 key", async () => {
  let received;

  const repository = {
    async putObject(key, body, contentType) {
      received = { key, body, contentType };
    }
  };

  const writer = new ReportWriter(repository);

  await writer.writeRejected("run-123", [
    {
      type: "rejected",
      rowNumber: 2,
      row: {
        Volcano_Number: "123",
        Volcano_Name: "Example Volcano",
        Country: "Chile",
        Latitude: "-30.5",
        Longitude: "-70.2"
      },
      error: {
        code: "MISSING_REQUIRED_VALUE",
        message: "Required value is missing: Country."
      }
    }
  ]);

  assert.equal(received.key, "reports/run-123/rejected.csv");
  assert.equal(received.contentType, "text/csv; charset=utf-8");

  const lines = received.body.split("\r\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^row_number,error_code,error_message,/);
  assert.match(lines[1], /^2,MISSING_REQUIRED_VALUE,/);
  assert.ok(lines[1].includes(",123,Example Volcano,"));
  assert.ok(lines[1].includes(",Chile,"));
});

test("escapes commas, quotes and newlines in rejected CSV values", async () => {
  let receivedBody;

  const writer = new ReportWriter({
    async putObject(key, body) {
      receivedBody = body;
    }
  });

  await writer.writeRejected("run-123", [
    {
      rowNumber: 3,
      row: {
        Volcano_Number: "456",
        Volcano_Name: 'Volcano, "North"\nMountain'
      },
      error: {
        code: "TYPE_CAST_FAILED",
        message: "Invalid value, please check."
      }
    }
  ]);

  assert.ok(
    receivedBody.includes('"Invalid value, please check."')
  );

  assert.ok(
    receivedBody.includes('"Volcano, ""North""\nMountain"')
  );
});

test("returns without writing when there are no rejected rows", async () => {
  let called = false;

  const writer = new ReportWriter({
    async putObject() {
      called = true;
    }
  });

  const result = await writer.writeRejected("run-123", []);

  assert.equal(result, null);
  assert.equal(called, false);
});

test("rejects an invalid run id for rejected rows", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeRejected("", []),
    /valid run_id/
  );
});

test("rejects a non-array collection of rejected rows", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeRejected("run-123", {}),
    /must be an array/
  );
});

test("rejects a rejected row without its original data", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeRejected("run-123", [
      {
        rowNumber: 2,
        error: {
          code: "TYPE_CAST_FAILED",
          message: "Invalid value."
        }
      }
    ]),
    /original data/
  );
});

test("rejects a rejected row without error details", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeRejected("run-123", [
      {
        rowNumber: 2,
        row: { Volcano_Number: "123" }
      }
    ]),
    /error details/
  );
});

test("rejects an invalid rejected row number", async () => {
  const writer = new ReportWriter({
    async putObject() {}
  });

  await assert.rejects(
    writer.writeRejected("run-123", [
      {
        rowNumber: 0,
        row: { Volcano_Number: "123" },
        error: {
          code: "TYPE_CAST_FAILED",
          message: "Invalid value."
        }
      }
    ]),
    /row number/
  );
});
