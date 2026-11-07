import { getRequiredEnv } from "../../common/config.mjs";

import { S3Repository } from "./repositories/s3-repository.mjs";
import { VolcanoRepository } from "./repositories/volcano-repository.mjs";

import { ReportWriter } from "./services/report-writer.mjs";
import { LoaderService } from "./services/loader-service.mjs";

let defaultService;

function getDefaultService() {
  if (!defaultService) {
    const bucketName = getRequiredEnv("INGEST_BUCKET_NAME");
    const tableName = getRequiredEnv("TABLE_NAME");
    const writeRateWcu = Number(getRequiredEnv("WRITE_RATE_WCU"));

    if (!Number.isFinite(writeRateWcu) || writeRateWcu <= 0) {
      throw new RangeError("WRITE_RATE_WCU must be a positive number.");
    }

    const s3Repository = new S3Repository(bucketName);
    const volcanoRepository = new VolcanoRepository(tableName);
    const reportWriter = new ReportWriter(s3Repository);

    defaultService = new LoaderService({
      s3Repository,
      volcanoRepository,
      reportWriter,
      writeRateWcu
    });
  }

  return defaultService;
}

function getSourceKey(record) {
  const encodedKey = record?.s3?.object?.key;

  if (typeof encodedKey !== "string" || encodedKey.trim() === "") {
    throw new TypeError("An S3 event record must include an object key.");
  }

  return decodeURIComponent(encodedKey.replace(/\+/g, " "));
}

async function processEvent(event, context, service) {
  const records = event?.Records;

  if (!Array.isArray(records) || records.length === 0) {
    throw new TypeError("The event must contain at least one S3 record.");
  }

  const activeService = service ?? getDefaultService();
  const summaries = [];

  for (const record of records) {
    const sourceKey = getSourceKey(record);

    const summary = await activeService.process({
      sourceKey,
      context
    });

    summaries.push(summary);
  }

  return {
    processedRecords: summaries.length,
    summaries
  };
}

export async function handler(event, context) {
  return processEvent(event, context, getDefaultService());
}

export { processEvent };
