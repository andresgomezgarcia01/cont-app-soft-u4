
export function log(level, message, context, fields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: context?.awsRequestId,
    ...fields
  };

  process.stdout.write(`${JSON.stringify(entry)}\n`);
}
