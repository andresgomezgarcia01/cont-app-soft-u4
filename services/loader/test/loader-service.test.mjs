import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import schema from "../../common/schema/volcanoes.schema.json" with {
  type: "json"
};

import { LoaderService } from "../src/services/loader-service.mjs";
import { LoaderWriteError } from "../src/repositories/volcano-repository.mjs";

const HEADERS = schema.columns.map((column) => column.name);

function createCsv(rows) {
  const header = HEADERS.join(",");

  const records = rows.map((values) =>
    HEADERS.map((headerName) => values[headerName] ?? "").join(",")
  );

  return [header, ...records].join("\n");
}

function createValidRow(number = "1") {
  return {
    Volcano_Number: number,
    Volcano_Name: `Volcano ${number}`,
    Country: "Chile",
    Latitude: "-30.5",
    Longitude: "-70.2"
  };
}

function createService({
  csv,
  writeBatch,
  remainingTime = () => 300000,
  timeLimitBufferMs = 10000,
  contentLength,
  body
} = {}) {
  const summaries = [];
  const rejectedReports = [];
  const logs = [];
  const writtenBatches = [];

  const sourceBody = body ?? Readable.from([
    Buffer.from(csv ?? createCsv([createValidRow()]))
  ]);

  const service = new LoaderService({
    s3Repository: {
      async getObject() {
        return {
          Body: sourceBody,
          ContentLength: contentLength ?? Buffer.byteLength(
            csv ?? createCsv([createValidRow()])
          )
        };
      }
    },

    volcanoRepository: {
      async writeBatch(items) {
        writtenBatches.push(items);

        if (writeBatch) {
          return writeBatch(items);
        }

        return { consumedCapacity: 0 };
      }
    },

    reportWriter: {
      async writeSummary(summary) {
        summaries.push(summary);
      },
      async writeRejected(runId, rows) {
        rejectedReports.push({ runId, rows });
      }
    },

    writeRateWcu: 20,
    timeLimitBufferMs,
    runIdFactory: () => "test-run-123",
    now: () => new Date("2026-11-06T10:00:00.000Z"),
    logger: (...args) => logs.push(args)
  });

  const context = {
    awsRequestId: "test-request",
    getRemainingTimeInMillis: remainingTime
  };

  return {
    service,
    context,
    summaries,
    rejectedReports,
    logs,
    writtenBatches
  };
}

test("processes a valid CSV and writes its summary", async () => {
  const fixture = createService();

  const summary = await fixture.service.process({
    sourceKey: "incoming/volcanoes.csv",
    context: fixture.context
  });

  assert.equal(summary.status, "SUCCEEDED");
  assert.equal(summary.rows_read, 1);
  assert.equal(summary.rows_written, 1);
  assert.equal(summary.rows_rejected, 0);
  assert.equal(summary.run_id, "test-run-123");

  assert.equal(fixture.writtenBatches.length, 1);
  assert.equal(fixture.summaries.length, 1);
  assert.equal(fixture.rejectedReports.length, 0);
});

test("continues processing when a row is rejected", async () => {
  const invalidRow = createValidRow("2");
  invalidRow.Country = "";

  const fixture = createService({
    csv: createCsv([
      createValidRow("1"),
      invalidRow,
      createValidRow("3")
    ])
  });

  const summary = await fixture.service.process({
    sourceKey: "incoming/volcanoes.csv",
    context: fixture.context
  });

  assert.equal(summary.status, "SUCCEEDED_WITH_REJECTIONS");
  assert.equal(summary.rows_read, 3);
  assert.equal(summary.rows_written, 2);
  assert.equal(summary.rows_rejected, 1);

  assert.equal(fixture.rejectedReports.length, 1);
  assert.equal(fixture.rejectedReports[0].rows[0].error.code,
    "MISSING_REQUIRED_VALUE");
});

test("writes a FAILED report when the CSV header is invalid", async () => {
  const fixture = createService({
    csv: "wrong,header\nvalue,value"
  });

  const summary = await fixture.service.process({
    sourceKey: "incoming/invalid.csv",
    context: fixture.context
  });

  assert.equal(summary.status, "FAILED");
  assert.equal(summary.error_code, "HEADER_MISMATCH");
  assert.equal(summary.rows_written, 0);
  assert.equal(fixture.summaries.length, 1);
});

test("writes a FAILED report when the file exceeds 3 MB", async () => {
  const fixture = createService({
    contentLength: 3 * 1024 * 1024 + 1
  });

  const summary = await fixture.service.process({
    sourceKey: "incoming/large.csv",
    context: fixture.context
  });

  assert.equal(summary.status, "FAILED");
  assert.equal(summary.error_code, "FILE_TOO_LARGE");
});

test("stops safely when the Lambda time limit approaches", async () => {
  let calls = 0;

  const fixture = createService({
    csv: createCsv([
      createValidRow("1"),
      createValidRow("2")
    ]),
    remainingTime: () => {
      calls += 1;
      return calls === 1 ? 30000 : 500;
    },
    timeLimitBufferMs: 1000
  });

  const summary = await fixture.service.process({
    sourceKey: "incoming/volcanoes.csv",
    context: fixture.context
  });

  assert.equal(summary.status, "FAILED");
  assert.equal(summary.error_code, "TIME_LIMIT_REACHED");
  assert.equal(summary.rows_read, 2);
  assert.equal(summary.rows_written, 1);
});

test("writes a FAILED report and propagates WRITE_FAILED", async () => {
  const fixture = createService({
    writeBatch: async () => {
      throw new LoaderWriteError("DynamoDB write failed.");
    }
  });

  await assert.rejects(
    fixture.service.process({
      sourceKey: "incoming/volcanoes.csv",
      context: fixture.context
    }),
    (error) => error.code === "WRITE_FAILED"
  );

  assert.equal(fixture.summaries.length, 1);
  assert.equal(fixture.summaries[0].status, "FAILED");
  assert.equal(fixture.summaries[0].error_code, "WRITE_FAILED");
});

test("propagates transient S3 errors", async () => {
  const fixture = createService();

  fixture.service.s3Repository.getObject = async () => {
    throw new Error("S3 temporarily unavailable");
  };

  await assert.rejects(
    fixture.service.process({
      sourceKey: "incoming/volcanoes.csv",
      context: fixture.context
    }),
    /S3 temporarily unavailable/
  );

  assert.equal(fixture.summaries.length, 0);
});

test("rejects a missing source key", async () => {
  const fixture = createService();

  await assert.rejects(
    fixture.service.process({
      sourceKey: "",
      context: fixture.context
    }),
    /valid source key/
  );
});
