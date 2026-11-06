
export function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getApiConfig() {
  return {
    tableName: getRequiredEnv("TABLE_NAME")
  };
}
