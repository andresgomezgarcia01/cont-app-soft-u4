import { randomUUID } from "node:crypto";

import { log } from "../../../common/logs.mjs";
import { LoaderValidationError } from "../chain/validate-header.mjs";
import { processRows } from "../chain/process-rows.mjs";
import { parseCsv } from "../parser/csv-parser.mjs";
import { BatchWriter } from "./batch-writer.mjs";
import { createCsvInput } from "./csv-input.mjs";

const TIME_LIMIT_ERROR_CODE = "TIME_LIMIT_REACHED";
const WRITE_ERROR_CODE = "WRITE_FAILED";

export class LoaderService {
  constructor({
    s3Repository,
    volcanoRepository,
    reportWriter,
    writeRateWcu,
    timeLimitBufferMs = 10000,
    runIdFactory = randomUUID,
    now = () => new Date(),
    logger = log
  }) {
    if (!s3Repository || typeof s3Repository.getObject !== "function") {
      throw new TypeError("A valid S3 repository is required.");
    }

    if (
      !volcanoRepository ||
      typeof volcanoRepository.writeBatch !== "function"
    ) {
      throw new TypeError("A valid volcano repository is required.");
    }

    if (!reportWriter ||
        typeof reportWriter.writeSummary !== "function" ||
        typeof reportWriter.writeRejected !== "function") {
      throw new TypeError("A valid report writer is required.");
    }

    if (!Number.isFinite(writeRateWcu) || writeRateWcu <= 0) {
      throw new RangeError("WRITE_RATE_WCU must be a positive number.");
    }

    if (!Number.isFinite(timeLimitBufferMs) || timeLimitBufferMs < 0) {
      throw new RangeError("The time limit buffer must be non-negative.");
    }

    this.s3Repository = s3Repository;
    this.volcanoRepository = volcanoRepository;
    this.reportWriter = reportWriter;
    this.writeRateWcu = writeRateWcu;
    this.timeLimitBufferMs = timeLimitBufferMs;
    this.runIdFactory = runIdFactory;
    this.now = now;
    this.logger = logger;
  }

  async process({ sourceKey, context }) {
    if (typeof sourceKey !== "string" || sourceKey.trim() === "") {
      throw new TypeError("A valid source key is required.");
    }

    const runId = this.runIdFactory();
    const startedAt = this.now().toISOString();
    const startedClock = Date.now();

    const stats = {
      rows_read: 0,
      rows_written: 0,
      rows_rejected: 0,
      rejected: []
    };

    let timeLimitReached = false;

    const logContext = context ?? {};

    this.logger("INFO", "load_started", logContext, {
      service: "loader",
      correlation_id: runId,
      source_key: sourceKey
    });

    const writeReports = async (status, errorCode = undefined) => {
      if (stats.rejected.length > 0) {
        await this.reportWriter.writeRejected(runId, stats.rejected);
      }

      const summary = {
        run_id: runId,
        source_key: sourceKey,
        status,
        started_at: startedAt,
        finished_at: this.now().toISOString(),
        rows_read: stats.rows_read,
        rows_written: stats.rows_written,
        rows_rejected: stats.rows_rejected
      };

      if (errorCode) {
        summary.error_code = errorCode;
      }

      await this.reportWriter.writeSummary(summary);

      return summary;
    };

    const logFailure = (errorCode, error) => {
      this.logger("ERROR", "load_failed", logContext, {
        service: "loader",
        correlation_id: runId,
        source_key: sourceKey,
        status: "FAILED",
        error_code: errorCode,
        duration_ms: Date.now() - startedClock,
        errorType: error?.name,
        errorMessage: error?.message,
        stackTrace: error?.stack
      });
    };

    try {
      const s3Object = await this.s3Repository.getObject(sourceKey);

      const csvInput = createCsvInput({
        body: s3Object.Body,
        contentLength: s3Object.ContentLength
      });

      const parsedRows = parseCsv(csvInput);
      const processedRows = processRows(parsedRows);

      const trackedRows = async function* () {
        for await (const processed of processedRows) {
          stats.rows_read += 1;

          if (processed.type === "rejected") {
            stats.rows_rejected += 1;
            stats.rejected.push(processed);
          }

          if (
            context &&
            typeof context.getRemainingTimeInMillis === "function" &&
            context.getRemainingTimeInMillis() <= this.timeLimitBufferMs
          ) {
            timeLimitReached = true;
            return;
          }

          yield processed;
        }
      }.bind(this);

      const trackedRepository = {
        async writeBatch(items) {
          const result = await this.volcanoRepository.writeBatch(items);
          stats.rows_written += items.length;
          return result;
        }
      };

      trackedRepository.writeBatch =
        trackedRepository.writeBatch.bind(this);

      const writer = new BatchWriter(
        trackedRepository,
        this.writeRateWcu
      );

      await writer.write(trackedRows());

      if (timeLimitReached) {
        const summary = await writeReports(
          "FAILED",
          TIME_LIMIT_ERROR_CODE
        );

        logFailure(TIME_LIMIT_ERROR_CODE);

        return summary;
      }

      const status = stats.rows_rejected > 0
        ? "SUCCEEDED_WITH_REJECTIONS"
        : "SUCCEEDED";

      const summary = await writeReports(status);

      this.logger("INFO", "load_completed", logContext, {
        service: "loader",
        correlation_id: runId,
        source_key: sourceKey,
        status,
        rows_read: stats.rows_read,
        rows_written: stats.rows_written,
        rows_rejected: stats.rows_rejected,
        duration_ms: Date.now() - startedClock
      });

      return summary;
    } catch (error) {
      if (error instanceof LoaderValidationError) {
        const summary = await writeReports("FAILED", error.code);

        logFailure(error.code, error);

        return summary;
      }

      if (error?.code === WRITE_ERROR_CODE) {
        await writeReports("FAILED", WRITE_ERROR_CODE);
        logFailure(WRITE_ERROR_CODE, error);
        throw error;
      }

      logFailure(error?.code ?? error?.name ?? "UNKNOWN_ERROR", error);
      throw error;
    }
  }
}
