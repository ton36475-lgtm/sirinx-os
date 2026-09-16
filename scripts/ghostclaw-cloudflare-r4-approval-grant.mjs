#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCloudflareR4ApprovalGrant } from "../services/dev-control-api/src/cloudflare-r4-prerequisites-runner.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PACKET =
  ".ghostclaw_runtime/a2a2a/templates/cloudflare-r4-prerequisites-packet.json";
const GRANT_ROOT =
  ".ghostclaw_runtime/a2a2a/approvals/cloudflare-r4-prerequisites/pending";
const SAFE_STORE_HELPER = path.join(
  REPO_ROOT,
  "scripts/ghostclaw-cloudflare-r4-safe-store.py"
);
const SAFE_STORE_PYTHON = "/usr/bin/python3";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function flag(name) {
  return process.argv.includes(name);
}

function resolveInsideRepo(relativePath) {
  const absolutePath = path.resolve(REPO_ROOT, relativePath);
  if (!absolutePath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }
  return absolutePath;
}

async function readJson(relativePath) {
  let contents;
  try {
    contents = await readFile(resolveInsideRepo(relativePath), "utf8");
  } catch {
    throw new Error("Approval packet is missing or unreadable");
  }
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error("Approval packet is invalid JSON");
  }
}

function generatedGrantId(stepId) {
  return `grant-${stepId}-${Date.now()}-${randomUUID()}`;
}

function storeGrantWithPinnedDirectories(grant) {
  const filename = `${grant.grantId}.json`;
  const result = spawnSync(
    SAFE_STORE_PYTHON,
    [
      SAFE_STORE_HELPER,
      "--repo-root",
      REPO_ROOT,
      "--relative-root",
      GRANT_ROOT,
      "--filename",
      filename
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin" },
      input: `${JSON.stringify(grant, null, 2)}\n`,
      timeout: 10_000
    }
  );

  let helperStatus = null;
  try {
    helperStatus = JSON.parse(result.stderr || result.stdout || "null");
  } catch {
    helperStatus = null;
  }
  if (result.status === 0 && helperStatus?.status === "stored") return;
  if (helperStatus?.code === "EEXIST") {
    throw new Error(`Approval grant already exists: ${grant.grantId}`);
  }
  throw new Error("Approval grant storage failed closed");
}

async function main() {
  const packetPath = option("--packet", DEFAULT_PACKET);
  const stepId = option("--step");
  const exactGateId = option("--exact-gate");
  if (!stepId) throw new Error("--step is required");
  if (!exactGateId) throw new Error("--exact-gate is required");

  const ttlRaw = option("--ttl-seconds", "300");
  if (!/^\d+$/.test(ttlRaw)) {
    throw new Error("--ttl-seconds must be an integer");
  }
  const ttlSeconds = Number(ttlRaw);
  const packet = await readJson(packetPath);
  const grant = createCloudflareR4ApprovalGrant({
    packet,
    stepId,
    exactGateId,
    grantId: option("--grant-id", generatedGrantId(stepId)),
    ttlSeconds
  });

  let grantPath = null;
  const store = flag("--store");
  if (store) {
    grantPath = path.join(GRANT_ROOT, `${grant.grantId}.json`);
    storeGrantWithPinnedDirectories(grant);
  }

  process.stdout.write(`${JSON.stringify({
    status: store ? "stored-local-approval-grant" : "dry-run-valid",
    taskId: grant.taskId,
    stepId: grant.stepId,
    grantId: grant.grantId,
    grantDigestSha256: grant.grantDigestSha256,
    expiresAt: grant.expiresAt,
    stored: store,
    grantPath,
    execute: false,
    deploy: false
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      status: "blocked",
      error: error.message,
      stored: false,
      execute: false,
      deploy: false
    }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
