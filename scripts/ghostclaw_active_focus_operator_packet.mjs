import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_OPERATOR_PACKET_20260703.md";

const commandChecklist = [
  "pnpm active-focus:readiness",
  "pnpm active-focus:preview-uat",
  "pnpm telegram-error-loop:readiness",
  "pnpm ghostclaw-a2a:bus-watch:test",
  "node scripts/ghostclaw_local_commit_helper.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json"
];

const closedGates = [
  "live_send=false",
  "provider_call=false",
  "external_message_send=false",
  "commit=false",
  "push=false",
  "deploy=false",
  "cloudflare_r2_mutation=false",
  "secret_read=false",
  "install=false"
];

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

async function readJson(root, path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function tryReadJson(root, path, failures, label) {
  try {
    return await readJson(root, path);
  } catch (error) {
    failures.push(`missing_or_invalid_${label}_${path}: ${error.message}`);
    return null;
  }
}

function pushCheck(checks, name, passed, details = {}) {
  checks.push({ name, passed, ...details });
}

function allFalse(object) {
  return Object.values(object || {}).every((value) => value === false);
}

function makeTelegramSafeDraft({ readiness, gate, helper }) {
  return [
    "Hermes Active Focus Readiness",
    `status: ${readiness?.status || "unknown"}`,
    "scope: sirinx.co + AGM AutoFlow only",
    "paused: Kusala + Phitsanulok News",
    `commit_gate: ${gate?.status || "unknown"} (${gate?.candidate_pathspec_count || 0} pathspecs)`,
    `commit_helper: ${helper?.status || "unknown"} (dry_run=true, executed=${helper?.executed === true})`,
    "next: review explicit-path local commit gate; do not push/deploy/live-send/provider-call",
    closedGates.join("; ")
  ].join("\n");
}

export async function createActiveFocusOperatorPacket(options = {}) {
  const root = resolve(options.root || process.cwd());
  const checks = [];
  const failures = [];

  const readiness = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703.json",
    failures,
    "p066_readiness"
  );
  const gate = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json",
    failures,
    "p057_gate"
  );
  const helper = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json",
    failures,
    "p058_helper"
  );
  const manifest = await tryReadJson(
    root,
    "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json",
    failures,
    "commit_manifest"
  );

  const readinessOk =
    readiness?.status === "PASS_ACTIVE_FOCUS_READINESS" &&
    (readiness?.checks || []).every((check) => check.passed === true) &&
    allFalse(readiness?.guardrails);
  const gateOk = gate?.status === "PASS" && gate?.failures?.length === 0;
  const helperOk = helper?.status === "PASS" && helper?.executed === false && helper?.failures?.length === 0;
  const manifestOk =
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("reports/mission/A2A2A_ACTIVE_FOCUS_OPERATOR_PACKET_20260703.md") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_operator_packet.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_operator_packet.test.mjs");

  pushCheck(checks, "p066_readiness_pass", readinessOk, { status: readiness?.status });
  pushCheck(checks, "p057_gate_pass", gateOk, {
    status: gate?.status,
    candidatePathspecs: gate?.candidate_pathspec_count,
    gitStatusLines: gate?.git_status_line_count
  });
  pushCheck(checks, "p058_helper_dry_run_pass", helperOk, {
    status: helper?.status,
    executed: helper?.executed
  });
  pushCheck(checks, "commit_manifest_contains_operator_packet", manifestOk);

  if (!readinessOk) failures.push("p066_readiness_not_ready");
  if (!gateOk) failures.push("p057_gate_not_ready");
  if (!helperOk) failures.push("p058_helper_not_ready");
  if (!manifestOk) failures.push("commit_manifest_missing_operator_packet_paths");

  const status = failures.length === 0 ? "PASS_OPERATOR_PACKET_READY" : "FAIL_OPERATOR_PACKET_NOT_READY";
  const telegramSafeDraft = makeTelegramSafeDraft({ readiness, gate, helper });
  return {
    schema: "ghostclaw.a2a2a.active_focus_operator_packet.v1",
    packet_id: "A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "telegram_safe_draft_only_no_live_send_no_provider_call",
    checks,
    failures,
    command_checklist: commandChecklist,
    telegram_safe_draft: telegramSafeDraft,
    guardrails: {
      live_send: false,
      provider_call: false,
      external_message_send: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false,
      secret_read: false,
      install: false
    },
    next_safe_action: status.startsWith("PASS")
      ? "Operator reviews this local packet and opens a separate exact gate only for local commit, live send, provider call, push, deploy, or Cloudflare/R2 mutation."
      : "Fix packet failures before using this as the operator handoff."
  };
}

function renderReport(packet) {
  const failed = packet.checks.filter((check) => !check.passed);
  return `# A2A2A Active Focus Operator Packet - 2026-07-03

## Status

${packet.status}

## Purpose

Local operator handoff for the current active focus: \`sirinx.co\`, AGM AutoFlow/AutoGlow, and Telegram/A2A2A safety readiness.

## Command Checklist

${packet.command_checklist.map((command) => `- \`${command}\``).join("\n")}

## Telegram-Safe Draft

\`\`\`text
${packet.telegram_safe_draft}
\`\`\`

## Failed Checks

${failed.length === 0 ? "- None" : failed.map((check) => `- ${check.name}`).join("\n")}

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

export async function writeActiveFocusOperatorPacket(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusOperatorPacket(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      guardrails: packet.guardrails,
      failures: packet.failures,
      next_safe_action: packet.next_safe_action
    });
    await writeText(resolve(root, options.report || DEFAULT_REPORT), renderReport(packet));
  }
  return packet;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = await writeActiveFocusOperatorPacket(args);
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
