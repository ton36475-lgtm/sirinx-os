import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_HANDOFF_VERIFY_20260703.md";
const P073_INDEX = ".ghostclaw_runtime/a2a2a/outbox/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json";
const P073_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    evidence: DEFAULT_EVIDENCE,
    receipt: DEFAULT_RECEIPT,
    report: DEFAULT_REPORT,
    noWrite: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--evidence") args.evidence = argv[++index];
    else if (arg === "--receipt") args.receipt = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
    else if (arg === "--no-write") args.noWrite = true;
  }
  return args;
}

async function readJson(root, path, failures, label) {
  try {
    return JSON.parse(await readFile(resolve(root, path), "utf8"));
  } catch (error) {
    failures.push(`missing_or_invalid_${label}_${path}: ${error.message}`);
    return null;
  }
}

async function hashFile(root, path, failures) {
  try {
    const content = await readFile(resolve(root, path));
    return {
      path,
      bytes: content.length,
      sha256: createHash("sha256").update(content).digest("hex")
    };
  } catch (error) {
    failures.push(`missing_handoff_file_${path}: ${error.message}`);
    return { path, bytes: 0, sha256: null };
  }
}

function allFalse(object) {
  return Object.values(object || {}).every((value) => value === false);
}

function manifestOk(manifest) {
  return (
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_handoff_verify.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_handoff_verify.test.mjs") &&
    manifest.candidate_pathspecs.includes(DEFAULT_REPORT) &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT)
  );
}

function compareHashes(expected, actual) {
  const actualByPath = new Map(actual.map((file) => [file.path, file]));
  return (expected || []).map((file) => {
    const current = actualByPath.get(file.path);
    return {
      path: file.path,
      expected_bytes: file.bytes,
      actual_bytes: current?.bytes ?? null,
      expected_sha256: file.sha256,
      actual_sha256: current?.sha256 ?? null,
      matched: file.bytes === current?.bytes && file.sha256 === current?.sha256
    };
  });
}

async function readLanePayloads(root, fileHashes, failures) {
  const payloads = [];
  for (const file of fileHashes || []) {
    if (!file.path.endsWith(".json") || !file.path.includes("/outbox/")) continue;
    const payload = await readJson(root, file.path, failures, `lane_payload_${file.path}`);
    payloads.push({ path: file.path, payload });
  }
  return payloads;
}

export async function createActiveFocusHandoffVerification(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const index = await readJson(root, P073_INDEX, failures, "p073_index");
  const p073Evidence = await readJson(root, P073_EVIDENCE, failures, "p073_evidence");
  const manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest");
  const expectedHashes = index?.file_hashes || [];
  const actualHashes = [];
  for (const file of expectedHashes) {
    actualHashes.push(await hashFile(root, file.path, failures));
  }
  const hash_results = compareHashes(expectedHashes, actualHashes);
  const lanePayloads = await readLanePayloads(root, expectedHashes, failures);

  const p073Ok =
    index?.status === "PASS_HANDOFF_INDEX_READY" &&
    p073Evidence?.status === "PASS_HANDOFF_INDEX_READY" &&
    (index?.checks || []).every((check) => check.passed === true) &&
    allFalse(index?.guardrails) &&
    allFalse(p073Evidence?.guardrails);
  const hashOk = expectedHashes.length === 6 && hash_results.every((result) => result.matched);
  const lanesOk =
    lanePayloads.length === 3 &&
    lanePayloads.every(({ payload }) => payload?.status === "ready_local_handoff_no_execution" && allFalse(payload?.guardrails));
  const checks = [
    { name: "p073_handoff_index_pass", passed: p073Ok, indexStatus: index?.status, evidenceStatus: p073Evidence?.status },
    { name: "handoff_hashes_match_index", passed: hashOk, fileCount: hash_results.length },
    { name: "lane_payloads_still_local_no_execution", passed: lanesOk, laneCount: lanePayloads.length },
    { name: "commit_manifest_contains_handoff_verify", passed: manifestOk(manifest) }
  ];
  for (const check of checks) {
    if (!check.passed) failures.push(check.name);
  }
  const status = failures.length === 0 ? "PASS_HANDOFF_VERIFY_READY" : "FAIL_HANDOFF_VERIFY_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_handoff_verify.v1",
    packet_id: "A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_handoff_verify_no_execution",
    source_index: P073_INDEX,
    source_handoff_index_evidence: P073_EVIDENCE,
    hash_results,
    checks,
    failures,
    guardrails: {
      live_send: false,
      provider_call: false,
      external_message_send: false,
      payload_executed: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false,
      secret_read: false,
      install: false
    },
    next_safe_action:
      status === "PASS_HANDOFF_VERIFY_READY"
        ? "Use the verified handoff index for local review, or open one exact approval token."
        : "Regenerate P072/P073 and rerun verification before using local lane handoffs."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Handoff Verify - 2026-07-03

## Status

${packet.status}

## Purpose

Verify that the P073 checksum index still matches the local Codex/Hermes/OpenCode handoff files.

## Source Index

\`${packet.source_index}\`

## Hash Results

${packet.hash_results
  .map(
    (result) =>
      `- \`${result.path}\` · matched=${result.matched} · expected=${result.expected_sha256} · actual=${result.actual_sha256}`
  )
  .join("\n")}

## Checks

${packet.checks.map((check) => `- ${check.name}: ${check.passed}`).join("\n")}

## Failures

${packet.failures.length === 0 ? "- None" : packet.failures.map((failure) => `- ${failure}`).join("\n")}

## Guardrails

${Object.entries(packet.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}
`;
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

export async function writeActiveFocusHandoffVerification(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusHandoffVerification(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      source_index: packet.source_index,
      hash_results: packet.hash_results,
      checks: packet.checks,
      failures: packet.failures,
      guardrails: packet.guardrails,
      next_safe_action: packet.next_safe_action
    });
    await writeText(resolve(root, options.report || DEFAULT_REPORT), renderReport(packet));
  }
  return packet;
}

async function main() {
  const packet = await writeActiveFocusHandoffVerification(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
