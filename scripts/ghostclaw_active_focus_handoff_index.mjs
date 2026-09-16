import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_HANDOFF_INDEX_20260703.md";
const INDEX_PATH = ".ghostclaw_runtime/a2a2a/outbox/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";
const P072_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    evidence: DEFAULT_EVIDENCE,
    receipt: DEFAULT_RECEIPT,
    report: DEFAULT_REPORT,
    index: INDEX_PATH,
    noWrite: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--evidence") args.evidence = argv[++index];
    else if (arg === "--receipt") args.receipt = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
    else if (arg === "--index") args.index = argv[++index];
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
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_handoff_index.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_handoff_index.test.mjs") &&
    manifest.candidate_pathspecs.includes(DEFAULT_REPORT) &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT)
  );
}

async function readLanePayloads(root, handoffs, failures) {
  const payloads = [];
  for (const handoff of handoffs || []) {
    const jsonPath = handoff?.paths?.json;
    if (!jsonPath) {
      failures.push(`missing_json_path_for_lane_${handoff?.lane || "unknown"}`);
      continue;
    }
    const payload = await readJson(root, jsonPath, failures, `handoff_${handoff.lane}`);
    payloads.push({ lane: handoff.lane, payload });
  }
  return payloads;
}

export async function createActiveFocusHandoffIndex(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const handoffBundle = await readJson(root, P072_EVIDENCE, failures, "p072_handoff_bundle");
  const manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest");
  const handoffs = handoffBundle?.handoffs || [];

  const fileHashes = [];
  for (const handoff of handoffs) {
    if (handoff?.paths?.json) fileHashes.push(await hashFile(root, handoff.paths.json, failures));
    if (handoff?.paths?.markdown) fileHashes.push(await hashFile(root, handoff.paths.markdown, failures));
  }
  const lanePayloads = await readLanePayloads(root, handoffs, failures);
  const lanePayloadsOk =
    lanePayloads.length === 3 &&
    lanePayloads.every(({ payload }) => payload?.status === "ready_local_handoff_no_execution" && allFalse(payload?.guardrails));
  const handoffBundleOk =
    handoffBundle?.status === "PASS_HANDOFF_BUNDLE_READY" &&
    (handoffBundle?.checks || []).every((check) => check.passed === true) &&
    allFalse(handoffBundle?.guardrails);
  const hashesOk = fileHashes.length === 6 && fileHashes.every((file) => typeof file.sha256 === "string" && file.sha256.length === 64);
  const checks = [
    { name: "p072_handoff_bundle_pass", passed: handoffBundleOk, status: handoffBundle?.status },
    { name: "handoff_file_hashes_complete", passed: hashesOk, fileCount: fileHashes.length },
    { name: "lane_payloads_ready_no_execution", passed: lanePayloadsOk, laneCount: lanePayloads.length },
    { name: "commit_manifest_contains_handoff_index", passed: manifestOk(manifest) }
  ];
  for (const check of checks) {
    if (!check.passed) failures.push(check.name);
  }

  const status = failures.length === 0 ? "PASS_HANDOFF_INDEX_READY" : "FAIL_HANDOFF_INDEX_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_handoff_index.v1",
    packet_id: "A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_handoff_index_no_execution",
    source_handoff_bundle: P072_EVIDENCE,
    index_path: options.index || INDEX_PATH,
    file_hashes: fileHashes,
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
      status === "PASS_HANDOFF_INDEX_READY"
        ? "Use the indexed handoff paths and checksums for local review, or open one exact approval token."
        : "Fix missing handoff files, hashes, or guardrails before using the handoff index."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Handoff Index - 2026-07-03

## Status

${packet.status}

## Purpose

Checksum index for the local-only Codex/Hermes/OpenCode handoff files generated by P072.

## Index Path

\`${packet.index_path}\`

## File Hashes

${packet.file_hashes.map((file) => `- \`${file.path}\` · bytes=${file.bytes} · sha256=${file.sha256}`).join("\n")}

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

export async function writeActiveFocusHandoffIndex(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusHandoffIndex(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.index || INDEX_PATH), packet);
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      index: options.index || INDEX_PATH,
      file_hashes: packet.file_hashes,
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
  const packet = await writeActiveFocusHandoffIndex(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
