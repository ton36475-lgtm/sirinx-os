import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PLACEHOLDER = /(change[-_ ]?me|replace[-_ ]?with|<[^>]+>)/i;
const CLOUDFLARE_ID = /^[0-9a-f]{32}$/i;
const OWNER_PRINCIPAL = /^[a-zA-Z0-9][a-zA-Z0-9._:@+-]{0,127}$/;

export function readConfig(configPath) {
  return JSON.parse(readFileSync(configPath, "utf8"));
}

export function validateConfig(config) {
  const errors = [];
  if (config.name !== "hermes-v5-worker-preview") {
    errors.push("preview Worker name must be hermes-v5-worker-preview");
  }
  if (!CLOUDFLARE_ID.test(config.account_id ?? "")) {
    errors.push("account_id must be an exact Cloudflare account id");
  }
  if (config.main !== "build/worker/shim.mjs") {
    errors.push("main must be the real worker-build shim");
  }
  if (config.workers_dev !== true || Object.hasOwn(config, "routes")) {
    errors.push("preview must use workers.dev and must not claim production routes");
  }
  if (Object.hasOwn(config, "triggers")) {
    errors.push("preview must not create schedules or queue consumers");
  }
  if (config.compatibility_date !== "2026-07-14") {
    errors.push("compatibility_date must match the reviewed preview baseline");
  }
  if (!config.compatibility_flags?.includes("nodejs_compat")) {
    errors.push("preview must enable the reviewed nodejs_compat flag");
  }
  const samplingRate = config.observability?.head_sampling_rate;
  if (
    config.observability?.enabled !== true ||
    typeof samplingRate !== "number" ||
    samplingRate < 0 ||
    samplingRate > 1
  ) {
    errors.push("preview observability must be enabled with a sampling rate from 0 to 1");
  }
  if (Object.hasOwn(config.vars ?? {}, "HERMES_API_TOKEN")) {
    errors.push("HERMES_API_TOKEN must be a secret binding, not a plaintext var");
  }
  if (config.build?.command !== "node scripts/build-worker.mjs") {
    errors.push(
      "build command must be node scripts/build-worker.mjs and must not install tools",
    );
  }
  if (config.vars?.ENVIRONMENT !== "preview" || config.vars?.HERMES_READ_ONLY !== "true") {
    errors.push("preview must be explicitly read-only");
  }
  const owners = config.vars?.HERMES_OWNER_ALLOWLIST;
  if (
    typeof owners !== "string" ||
    PLACEHOLDER.test(owners) ||
    owners.split(",").length > 16 ||
    owners.split(",").some((owner) => !OWNER_PRINCIPAL.test(owner.trim()))
  ) {
    errors.push("HERMES_OWNER_ALLOWLIST requires exact preview owner principals");
  }

  const bindings = new Map(
    (config.kv_namespaces ?? []).map((entry) => [entry.binding, entry.id]),
  );
  for (const binding of ["HERMES_LEDGER", "IDEMPOTENCY_CACHE"]) {
    const id = bindings.get(binding);
    if (
      typeof id !== "string" ||
      !id ||
      PLACEHOLDER.test(id) ||
      !CLOUDFLARE_ID.test(id)
    ) {
      errors.push(`${binding} requires an exact preview namespace id`);
    }
  }
  return errors;
}

export function validateSource(source) {
  const errors = [];
  for (const required of [
    "#[event(fetch)]",
    "HERMES_API_TOKEN",
    "HERMES_OWNER_ALLOWLIST",
    "X-Hermes-Owner",
  ]) {
    if (!source.includes(required)) {
      errors.push(`worker source is missing ${required}`);
    }
  }
  for (const forbidden of [".unwrap()", ".expect(", "panic!("]) {
    if (source.includes(forbidden)) {
      errors.push(`worker request path must not contain ${forbidden}`);
    }
  }
  return errors;
}

export function validateArtifact(artifactPath) {
  const errors = [];
  const buildDirectory = resolve(dirname(artifactPath), "..");
  try {
    const stat = statSync(artifactPath);
    const shim = readFileSync(artifactPath, "utf8");
    if (stat.size < 32 || !shim.includes("../index.js")) {
      errors.push("worker-build shim must re-export the bundled index.js");
    }
  } catch {
    errors.push("worker-build artifact build/worker/shim.mjs is missing");
  }

  try {
    const indexPath = resolve(buildDirectory, "index.js");
    const stat = statSync(indexPath);
    const source = readFileSync(indexPath, "utf8");
    const mockWorker = /\bmock(?:ed)?\b[^\n]{0,80}\bworker\b|\bworker\b[^\n]{0,80}\bmock(?:ed)?\b/i;
    if (stat.size < 256 || mockWorker.test(source)) {
      errors.push("worker-build bundled index.js is missing or still a mock");
    }
  } catch {
    errors.push("worker-build bundled index.js is missing");
  }

  try {
    const wasm = readFileSync(resolve(buildDirectory, "index_bg.wasm"));
    const magic = Buffer.from([0x00, 0x61, 0x73, 0x6d]);
    if (wasm.length <= 8 || !wasm.subarray(0, 4).equals(magic)) {
      errors.push("worker-build WebAssembly module has an invalid header");
    }
  } catch {
    errors.push("worker-build WebAssembly module is missing");
  }
  return errors;
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

export function run({ configPath, stage }) {
  const absoluteConfig = resolve(HERE, configPath);
  const config = readConfig(absoluteConfig);
  const workerSource = readFileSync(resolve(HERE, "crates/hermes-worker/src/lib.rs"), "utf8");
  const errors = [...validateConfig(config), ...validateSource(workerSource)];
  if (stage === "artifact") {
    errors.push(...validateArtifact(resolve(HERE, config.main)));
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let errors;
  try {
    errors = run({
      configPath: option("--config", "wrangler.preview.jsonc"),
      stage: option("--stage", "preflight"),
    });
  } catch (error) {
    errors = [`contract input could not be read: ${error.message}`];
  }
  if (errors.length) {
    console.error(JSON.stringify({ status: "BLOCKED", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ status: "READY", stage: option("--stage", "preflight") }));
  }
}
