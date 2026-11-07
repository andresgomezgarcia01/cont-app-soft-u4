import schema from "../../../common/schema/volcanoes.schema.json" with {
  type: "json"
};

const VALID_STATUSES = new Set([
  "SUCCEEDED",
  "SUCCEEDED_WITH_REJECTIONS",
  "FAILED"
]);

const REQUIRED_FIELDS = [
  "run_id",
  "source_key",
  "status",
  "started_at",
  "finished_at",
  "rows_read",
  "rows_written",
  "rows_rejected"
];

const REJECTED_COLUMNS = [
  "row_number",
  "error_code",
  "error_message",
  ...schema.columns.map((column) => column.name)
];

function escapeCsvValue(value) {
  const text = value === undefined || value === null
    ? ""
    : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function serializeCsvRow(values) {
  return values.map(escapeCsvValue).join(",");
}

function serializeRejectedRows(rejectedRows) {
  const lines = [serializeCsvRow(REJECTED_COLUMNS)];

  for (const rejected of rejectedRows) {
    if (!Number.isInteger(rejected.rowNumber) || rejected.rowNumber < 1) {
      throw new TypeError("Invalid rejected row number.");
    }

    if (!rejected.row || typeof rejected.row !== "object") {
      throw new TypeError("A rejected row must include its original data.");
    }

    if (
      !rejected.error ||
      typeof rejected.error.code !== "string" ||
      typeof rejected.error.message !== "string"
    ) {
      throw new TypeError("A rejected row must include its error details.");
    }

    const values = [
      rejected.rowNumber,
      rejected.error.code,
      rejected.error.message,
      ...schema.columns.map((column) => rejected.row[column.name])
    ];

    lines.push(serializeCsvRow(values));
  }

  return `${lines.join("\r\n")}\r\n`;
}

export class ReportWriter {
  constructor(s3Repository) {
    if (!s3Repository || typeof s3Repository.putObject !== "function") {
      throw new TypeError("A valid S3 repository is required.");
    }

    this.s3Repository = s3Repository;
  }

  async writeSummary(summary) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
      throw new TypeError("A valid summary report is required.");
    }

    for (const field of REQUIRED_FIELDS) {
      if (summary[field] === undefined || summary[field] === null) {
        throw new TypeError(`Missing summary field: ${field}.`);
      }
    }

    if (typeof summary.run_id !== "string" || summary.run_id.trim() === "") {
      throw new TypeError("A valid run_id is required.");
    }

    if (!VALID_STATUSES.has(summary.status)) {
      throw new TypeError("Invalid summary status.");
    }

    for (const field of ["rows_read", "rows_written", "rows_rejected"]) {
      if (!Number.isInteger(summary[field]) || summary[field] < 0) {
        throw new TypeError(`Invalid summary field: ${field}.`);
      }
    }

    if (
      summary.status === "FAILED" &&
      (typeof summary.error_code !== "string" ||
        summary.error_code.trim() === "")
    ) {
      throw new TypeError("A failed report requires an error code.");
    }

    const report = { ...summary };

    if (report.status !== "FAILED") {
      delete report.error_code;
    }

    const key = `reports/${report.run_id}/summary.json`;

    return this.s3Repository.putObject(
      key,
      JSON.stringify(report),
      "application/json"
    );
  }

  async writeRejected(runId, rejectedRows) {
    if (typeof runId !== "string" || runId.trim() === "") {
      throw new TypeError("A valid run_id is required.");
    }

    if (!Array.isArray(rejectedRows)) {
      throw new TypeError("Rejected rows must be an array.");
    }

    if (rejectedRows.length === 0) {
      return null;
    }

    const csv = serializeRejectedRows(rejectedRows);
    const key = `reports/${runId}/rejected.csv`;

    return this.s3Repository.putObject(
      key,
      csv,
      "text/csv; charset=utf-8"
    );
  }
}
