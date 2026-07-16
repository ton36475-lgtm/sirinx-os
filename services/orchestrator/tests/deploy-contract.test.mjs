import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateArtifact,
  validateConfig,
  validateSource,
} from "../scripts/verify-deploy-contract.mjs";

const SERVICE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const validConfig = {
  name: "hermes-v5-worker-preview",
  account_id: "0123456789abcdef0123456789abcdef",
  main: "build/worker/shim.mjs",
  compatibility_date: "2026-07-14",
  compatibility_flags: ["nodejs_compat"],
  workers_dev: true,
  observability: { enabled: true, head_sampling_rate: 1 },
  build: { command: "node scripts/build-worker.mjs" },
  vars: {
    ENVIRONMENT: "preview",
    HERMES_READ_ONLY: "true",
    HERMES_OWNER_ALLOWLIST: "hermes_commander",
  },
  kv_namespaces: [
    { binding: "HERMES_LEDGER", id: "0123456789abcdef0123456789abcdef" },
    { binding: "IDEMPOTENCY_CACHE", id: "fedcba9876543210fedcba9876543210" },
  ],
};

test("accepts an exact preview-only config", () => {
  assert.deepEqual(validateConfig(validConfig), []);
});

test("rejects placeholder resources and install-on-deploy", () => {
  const config = structuredClone(validConfig);
  config.kv_namespaces[0].id = "REPLACE_WITH_KV_ID";
  config.build.command = "cargo install worker-build && worker-build --release";
  config.vars.HERMES_OWNER_ALLOWLIST = "REPLACE_WITH_OWNER";
  config.routes = [];
  assert.match(validateConfig(config).join("\n"), /exact preview namespace id/);
  assert.match(validateConfig(config).join("\n"), /must not install tools/);
  assert.match(
    validateConfig(config).join("\n"),
    /must not claim production routes/,
  );
  assert.match(
    validateConfig(config).join("\n"),
    /HERMES_OWNER_ALLOWLIST requires exact preview owner principals/,
  );
});

test("requires observability, node compatibility, and secret bindings", () => {
  const config = structuredClone(validConfig);
  config.compatibility_flags = [];
  config.observability = { enabled: false, head_sampling_rate: 2 };
  config.vars.HERMES_API_TOKEN = "must-not-live-in-vars";
  const errors = validateConfig(config).join("\n");
  assert.match(errors, /nodejs_compat/);
  assert.match(errors, /observability/);
  assert.match(errors, /secret binding/);
});

test("requires auth and a real fetch entrypoint", () => {
  const invalid = validateSource("pub fn status() {}");
  assert.equal(invalid.length, 4);
  const valid = validateSource(
    '#[event(fetch)] HERMES_API_TOKEN HERMES_OWNER_ALLOWLIST X-Hermes-Owner',
  );
  assert.deepEqual(valid, []);
});

test("rejects panic-capable request paths", () => {
  const source = [
    "#[event(fetch)]",
    "HERMES_API_TOKEN",
    "HERMES_OWNER_ALLOWLIST",
    "X-Hermes-Owner",
    'value.expect("configured")',
  ].join("\n");
  assert.match(validateSource(source).join("\n"), /\.expect\(/);
});

test("rejects the historical mock build artifact", () => {
  assert.match(validateArtifact("build/worker.js").join("\n"), /mock|missing/i);
});

function writeWorkerBuildOutput(root) {
  mkdirSync(join(root, "worker"), { recursive: true });
  writeFileSync(
    join(root, "worker", "shim.mjs"),
    "export * from '../index.js';\nexport { default } from '../index.js';\n",
  );
  writeFileSync(
    join(root, "index.js"),
    "export default { async fetch() { return new Response('ok'); } };\n".repeat(8),
  );
  writeFileSync(
    join(root, "index_bg.wasm"),
    Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x00]),
  );
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
}

test("accepts the real worker-build artifact layout", () => {
  const root = mkdtempSync(join(tmpdir(), "hermes-worker-artifact-"));
  try {
    writeWorkerBuildOutput(root);
    assert.deepEqual(validateArtifact(join(root, "worker", "shim.mjs")), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a worker-build artifact without a Wasm module", () => {
  const root = mkdtempSync(join(tmpdir(), "hermes-worker-artifact-"));
  try {
    writeWorkerBuildOutput(root);
    rmSync(join(root, "index_bg.wasm"));
    assert.match(
      validateArtifact(join(root, "worker", "shim.mjs")).join("\n"),
      /WebAssembly module/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("worker build wrapper exposes a deterministic no-install plan", () => {
  const script = resolve(SERVICE_ROOT, "scripts/build-worker.mjs");
  const result = spawnSync(process.execPath, [script, "--plan"], {
    cwd: SERVICE_ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.required_wasm_bindgen_version, "0.2.126");
  assert.deepEqual(plan.worker_build_args, [
    "--mode",
    "no-install",
    "--release",
    "--no-opt",
  ]);
  assert.match(plan.crate_directory, /crates\/hermes-worker$/);
  assert.match(plan.target_directory, /services\/orchestrator\/build$/);
});

test("worker build wrapper stages output and writes a hash manifest", () => {
  const root = mkdtempSync(join(tmpdir(), "hermes-worker-stage-"));
  const source = join(root, "source");
  const target = join(root, "target");
  try {
    writeWorkerBuildOutput(source);
    const script = resolve(SERVICE_ROOT, "scripts/build-worker.mjs");
    const result = spawnSync(
      process.execPath,
      [script, "--stage-only", "--source", source, "--target", target],
      { cwd: SERVICE_ROOT, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(validateArtifact(join(target, "worker", "shim.mjs")), []);
    const manifest = JSON.parse(
      readFileSync(join(target, "artifact-manifest.json"), "utf8"),
    );
    assert.equal(manifest.schema, "sirinx.hermes-worker-artifact.v1");
    assert.ok(
      manifest.files.some(
        (file) => file.path === "index_bg.wasm" && /^[0-9a-f]{64}$/.test(file.sha256),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("deploy verifier can be imported without a script argv entry", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "await import('./scripts/verify-deploy-contract.mjs')",
    ],
    { cwd: SERVICE_ROOT, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
});
