import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SDK_PREFIX = "@aws-sdk/";
const STUB_SCHEME = "sdk-stub:";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Uso: node scripts/check-lambda-bundle.mjs <zip>");
  process.exit(1);
}

const directory = mkdtempSync(join(tmpdir(), "lambda-bundle-"));
process.on("exit", () => rmSync(directory, { recursive: true, force: true }));
execFileSync("unzip", ["-q", resolve(zipPath), "-d", directory]);

const files = readdirSync(directory);
if (files.length !== 1 || files[0] !== "handler.mjs") {
  throw new Error(`El ZIP debe contener solo handler.mjs y contiene: ${files.join(", ")}`);
}

const handlerPath = join(directory, "handler.mjs");
const bundle = readFileSync(handlerPath, "utf8");

// Un módulo ES no enlaza si falta una exportación, así que el simulado declara las que el bundle importa.
function importedNames(specifier) {
  const names = new Set();
  for (const match of bundle.matchAll(/import\s+(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
    if (match[2] === specifier) {
      for (const name of match[1].split(",")) {
        names.add(name.trim().split(/\s+as\s+/)[0]);
      }
    }
  }
  names.delete("");
  names.delete("default");
  return [...names];
}

function stubSource(specifier) {
  const exports = importedNames(specifier).map((name) => `export const ${name} = stub;`);
  return `
    const stub = new Proxy(function () {}, {
      get: (_target, property) => (typeof property === "symbol" || property === "then" ? undefined : stub),
      apply: () => stub,
      construct: () => stub,
    });
    export default stub;
    ${exports.join("\n")}
  `;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(SDK_PREFIX)) {
      return { url: `${STUB_SCHEME}${specifier}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(STUB_SCHEME)) {
      return {
        format: "module",
        source: stubSource(url.slice(STUB_SCHEME.length)),
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

// Las funciones leen su configuración al iniciar; Terraform la entrega en AWS.
Object.assign(process.env, {
  AWS_REGION: "us-east-2",
  TABLE_NAME: "bundle-check",
  INGEST_BUCKET_NAME: "bundle-check",
  WRITE_RATE_WCU: "20",
});

const loaded = await import(pathToFileURL(handlerPath).href);
if (typeof loaded.handler !== "function") {
  throw new Error("handler.mjs no exporta la función handler");
}

console.log(`${zipPath}: el handler carga sin node_modules`);
