import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateArtifact } from "./verify-deploy-contract.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CRATE_DIRECTORY = resolve(ROOT, "crates/hermes-worker");
const SOURCE_DIRECTORY = resolve(CRATE_DIRECTORY, "build");
const TARGET_DIRECTORY = resolve(ROOT, "build");
const REQUIRED_WASM_BINDGEN_VERSION = "0.2.126";
const WORKER_BUILD_ARGS = ["--mode", "no-install", "--release", "--no-opt"];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function commandVersion(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} is unavailable: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function filesUnder(directory, current = directory) {
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesUnder(directory, path));
    } else if (entry.isFile() && entry.name !== "artifact-manifest.json") {
      files.push(path);
    }
  }
  return files.sort();
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function buildPlan() {
  return {
    schema: "sirinx.hermes-worker-build-plan.v1",
    crate_directory: CRATE_DIRECTORY,
    source_directory: SOURCE_DIRECTORY,
    target_directory: TARGET_DIRECTORY,
    required_wasm_bindgen_version: REQUIRED_WASM_BINDGEN_VERSION,
    worker_build_args: WORKER_BUILD_ARGS,
  };
}

export function stageWorkerArtifact(sourceDirectory, targetDirectory, toolVersions = {}) {
  const source = resolve(sourceDirectory);
  const target = resolve(targetDirectory);
  if (source === target) {
    throw new Error("source and target artifact directories must differ");
  }

  const sourceErrors = validateArtifact(resolve(source, "worker/shim.mjs"));
  if (sourceErrors.length) {
    throw new Error(`source artifact is invalid: ${sourceErrors.join("; ")}`);
  }

  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });

  const files = filesUnder(target).map((path) => ({
    path: relative(target, path).split(sep).join("/"),
    bytes: statSync(path).size,
    sha256: hashFile(path),
  }));
  const manifest = {
    schema: "sirinx.hermes-worker-artifact.v1",
    generated_at: new Date().toISOString(),
    tools: toolVersions,
    files,
  };
  writeFileSync(
    resolve(target, "artifact-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

export function buildWorker() {
  const wasmBindgenBinary = process.env.WASM_BINDGEN_BIN || "wasm-bindgen";
  const wasmBindgenVersion = commandVersion(wasmBindgenBinary);
  if (wasmBindgenVersion !== `wasm-bindgen ${REQUIRED_WASM_BINDGEN_VERSION}`) {
    throw new Error(
      `wasm-bindgen ${REQUIRED_WASM_BINDGEN_VERSION} is required; found ${wasmBindgenVersion}`,
    );
  }

  const workerBuildBinary = process.env.WORKER_BUILD_BIN || "worker-build";
  const result = spawnSync(workerBuildBinary, WORKER_BUILD_ARGS, {
    cwd: CRATE_DIRECTORY,
    env: { ...process.env, WASM_BINDGEN_BIN: wasmBindgenBinary },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`worker-build failed with exit code ${result.status}`);
  }

  return stageWorkerArtifact(SOURCE_DIRECTORY, TARGET_DIRECTORY, {
    wasm_bindgen: wasmBindgenVersion,
    worker_build_command: workerBuildBinary,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes("--plan")) {
      console.log(JSON.stringify(buildPlan(), null, 2));
    } else if (process.argv.includes("--stage-only")) {
      const manifest = stageWorkerArtifact(
        option("--source", SOURCE_DIRECTORY),
        option("--target", TARGET_DIRECTORY),
      );
      console.log(JSON.stringify({ status: "STAGED", manifest }, null, 2));
    } else {
      const manifest = buildWorker();
      console.log(JSON.stringify({ status: "BUILT_AND_STAGED", manifest }, null, 2));
    }
  } catch (error) {
    console.error(JSON.stringify({ status: "BLOCKED", error: error.message }, null, 2));
    process.exitCode = 1;
  }
}
