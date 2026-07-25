#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createProviderCallApprovalReceipt } from
  "../services/dev-control-api/src/provider-call-exact-gate.mjs";
import {
  buildGodmodeV5ArchitectureProviderPlan,
  GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE
} from
  "../services/dev-control-api/src/godmode-v5-architecture-provider-runner.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PENDING_ROOT = ".ghostclaw_runtime/a2a2a/provider-approvals/pending";
const SAFE_STORE_HELPER = path.join(REPO_ROOT, "scripts/ghostclaw-cloudflare-r4-safe-store.py");
const grantState = {
  approvalSigningKeyBindingUsed: false,
  secretRead: false,
  runtimeEvidenceMutation: false
};

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function flag(name) {
  return process.argv.includes(name);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

function signingKey() {
  return String(
    process.env.ProviderApprovalSigningKey
      || process.env.PROVIDER_APPROVAL_SIGNING_KEY
      || ""
  );
}

function storeReceipt(receipt) {
  const filename = `${receipt.receiptId}.json`;
  const result = spawnSync(
    "/usr/bin/python3",
    [
      SAFE_STORE_HELPER,
      "--repo-root", REPO_ROOT,
      "--relative-root", PENDING_ROOT,
      "--filename", filename
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin" },
      input: `${JSON.stringify(receipt, null, 2)}\n`,
      timeout: 10_000
    }
  );
  if (result.status !== 0) throw new Error("provider_approval_receipt_store_failed");
  grantState.runtimeEvidenceMutation = true;
  return path.join(PENDING_ROOT, filename);
}

async function main() {
  const store = flag("--store");
  const plan = await buildGodmodeV5ArchitectureProviderPlan({ repoRoot: REPO_ROOT });
  if (!store) {
    process.stdout.write(`${JSON.stringify({
      status: "dry-run-provider-grant-ready",
      requestId: plan.target.RequestId,
      targetDigestSha256: plan.targetDigestSha256,
      requiredExactGate: plan.requiredExactGate,
      approvalReceiptStored: false,
      providerCalled: false,
      approvalSigningKeyBindingUsed: false,
      secretRead: false,
      secretValuePrinted: false,
      keyValuePrinted: false,
      runtimeEvidenceMutation: false,
      sourceMutation: false,
      repoMutation: false,
      deploy: false,
      push: false
    }, null, 2)}\n`);
    return;
  }

  if (!flag("--exact-gate-stdin")) {
    throw new Error("--store requires --exact-gate-stdin");
  }
  const exactGate = await readStdin();
  if (
    plan.requiredExactGate !== GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE ||
    exactGate !== GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE
  ) {
    throw new Error("exact_provider_gate_mismatch");
  }
  const key = signingKey();
  grantState.secretRead = key.length > 0;
  if (Buffer.byteLength(key, "utf8") < 32) {
    throw new Error("provider_approval_signing_key_missing");
  }
  grantState.approvalSigningKeyBindingUsed = true;
  const receiptId = option("--receipt-id");
  if (!receiptId) throw new Error("--receipt-id is required");
  const ttlSeconds = Number(option("--ttl-seconds", "300"));
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 600) {
    throw new Error("provider_approval_ttl_out_of_range");
  }
  const issuedAt = new Date();
  const receipt = createProviderCallApprovalReceipt({
    receiptId,
    ...plan.target,
    requestedBy: "hermes_commander",
    approvedBy: "operator",
    exactGate,
    budgetConfirmed: true,
    issuedAt,
    expiresAt: new Date(issuedAt.getTime() + ttlSeconds * 1000)
  }, { signingKey: key });
  const receiptPath = storeReceipt(receipt);
  process.stdout.write(`${JSON.stringify({
    status: "stored-provider-approval-receipt",
    requestId: plan.target.RequestId,
    receiptId: receipt.receiptId,
    receiptPath,
    targetDigestSha256: plan.targetDigestSha256,
    expiresAt: receipt.expiresAt,
    rawGateStored: false,
    providerCalled: false,
    approvalSigningKeyBindingUsed: true,
    secretRead: true,
    secretValuePrinted: false,
    keyValuePrinted: false,
    runtimeEvidenceMutation: true,
    sourceMutation: false,
    repoMutation: false,
    deploy: false,
    push: false
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: "blocked-provider-grant",
    error: error.message,
    approvalReceiptStored: false,
    providerCalled: false,
    approvalSigningKeyBindingUsed: grantState.approvalSigningKeyBindingUsed,
    secretRead: grantState.secretRead,
    secretValuePrinted: false,
    keyValuePrinted: false,
    runtimeEvidenceMutation: grantState.runtimeEvidenceMutation,
    sourceMutation: false,
    repoMutation: false,
    deploy: false,
    push: false
  }, null, 2)}\n`);
  process.exitCode = 1;
});
