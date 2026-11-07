const MAX_BATCH_SIZE = 10;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class BatchWriter {
  constructor(
    repository,
    writeRateWcu,
    wait = sleep,
    now = () => performance.now()
  ) {
    if (!repository || typeof repository.writeBatch !== "function") {
      throw new TypeError("A valid repository is required.");
    }

    if (!Number.isFinite(writeRateWcu) || writeRateWcu <= 0) {
      throw new RangeError("WRITE_RATE_WCU must be a positive number.");
    }

    this.repository = repository;
    this.writeRateWcu = writeRateWcu;
    this.wait = wait;
    this.now = now;
  }

  async write(processedRows) {
    const stats = {
      totalRows: 0,
      validRows: 0,
      rejectedRows: 0,
      writtenRows: 0,
      consumedCapacity: 0,
      rejected: []
    };

    let batch = [];

    const flush = async () => {
      if (batch.length === 0) return;

      const itemsToWrite = batch;
      batch = [];

      const startedAt = this.now();
      const result = await this.repository.writeBatch(itemsToWrite);
      const elapsed = this.now() - startedAt;

      const consumedCapacity = result.consumedCapacity ?? 0;

      stats.writtenRows += itemsToWrite.length;
      stats.consumedCapacity += consumedCapacity;

      const requiredMilliseconds =
        (consumedCapacity / this.writeRateWcu) * 1000;

      const delay = Math.max(0, requiredMilliseconds - elapsed);

      if (delay > 0) {
        await this.wait(delay);
      }
    };

    for await (const processed of processedRows) {
      stats.totalRows += 1;

      if (processed.type === "rejected") {
        stats.rejectedRows += 1;
        stats.rejected.push(processed);
        continue;
      }

      if (processed.type !== "valid") {
        throw new TypeError(
          `Unknown processed row type: ${processed.type}.`
        );
      }

      stats.validRows += 1;
      batch.push(processed.item);

      if (batch.length === MAX_BATCH_SIZE) {
        await flush();
      }
    }

    await flush();

    return stats;
  }
}
