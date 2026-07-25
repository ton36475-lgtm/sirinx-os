import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_OPERATOR_STATUS_20260703.md";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";

const expectedTargets = ["codex", "hermes", "opencode"];
const expectedGateTokens = {
  local_commit: "APPROVE_LOCAL_COMMIT_A2A2A_ACTIVE_FOCUS_20260703",
  telegram_live_send: "APPROVE_TELEGRAM_LIVE_SEND_AFTER_REVIEW_READY_20260703",
  provider_call: "APPROVE_PROVIDER_CALL_AFTER_REVIEW_READY_20260703",
  cloudflare_r2_write: "APPROVE_CLOUDFLARE_R2_WRITE_AFTER_REVIEW_READY_20260703",
  push_deploy: "APPROVE_PUSH_OR_DEPLOY_AFTER_LOCAL_COMMIT_20260703",
  install_or_dependency_change: "APPROVE_INSTALL_OR_DEP_CHANGE_AFTER_REVIEW_READY_20260703"
};

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

function allFalse(object) {
  return Object.values(object || {}).every((value) => value === false);
}

function pushCheck(checks, failures, name, passed, details = {}) {
  checks.push({ name, passed, ...details });
  if (!passed) failures.push(name);
}

function busTargetsOk(busAck) {
  const acknowledgements = busAck?.acknowledgements || [];
  const targets = acknowledgements.map((ack) => ack.target).sort();
  const targetSetOk = expectedTargets.every((target) => targets.includes(target));
  const executionOk = acknowledgements.every((ack) =>
    Object.values(ack.execution || {}).every((value) => value === false)
  );
  return { targetSetOk, executionOk, targets };
}

function gateSummary(nextGates) {
  return (nextGates?.gate_options || []).map((gate) => ({
    id: gate.id,
    status: gate.status,
    approval_token: gate.approval_token,
    command_count: Array.isArray(gate.allowed_commands) ? gate.allowed_commands.length : 0
  }));
}

function gateTokensOk(nextGates) {
  const gates = nextGates?.gate_options || [];
  return Object.entries(expectedGateTokens).every(([id, token]) =>
    gates.some((gate) => gate.id === id && gate.approval_token === token)
  );
}

function manifestOk(manifest) {
  return (
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_operator_status.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_operator_status.test.mjs") &&
    manifest.candidate_pathspecs.includes(DEFAULT_REPORT) &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT)
  );
}

function makeTelegramSafeDraft({ readiness, reviewReady, nextGates, gateCheck, helper }) {
  return [
    "Hermes Operator Status",
    `telegram_error_loop: ${readiness?.status || "unknown"}`,
    `review_ready: ${reviewReady?.status || "unknown"}`,
    `next_gates: ${nextGates?.status || "unknown"}`,
    "scope: sirinx.co + AGM AutoFlow only",
    "paused: Kusala + Phitsanulok News",
    `commit_gate: ${gateCheck?.status || "unknown"} (${gateCheck?.candidate_pathspec_count || 0} pathspecs)`,
    `commit_helper: ${helper?.status || "unknown"} (dry_run=true, executed=${helper?.executed === true})`,
    "a2a2a: codex/hermes/opencode local bus ack only; no external execution claimed",
    "next: choose one exact approval token or continue local review",
    "live_send=false; provider_call=false; external_message_send=false; commit=false; push=false; deploy=false; cloudflare_r2_mutation=false; secret_read=false; install=false"
  ].join("\n");
}

export async function createActiveFocusOperatorStatus(options = {}) {
  const root = resolve(options.root || process.cwd());
  const checks = [];
  const failures = [];

  const readiness = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json",
    failures,
    "p065_readiness"
  );
  const busAck = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json",
    failures,
    "p064_bus_ack"
  );
  const reviewReady = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json",
    failures,
    "p069_review_ready"
  );
  const nextGates = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json",
    failures,
    "p070_next_gates"
  );
  const gateCheck = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json",
    failures,
    "p057_gate_check"
  );
  const helper = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json",
    failures,
    "p058_helper"
  );
  const manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest");

  const bus = busTargetsOk(busAck);
  pushCheck(
    checks,
    failures,
    "p065_telegram_error_loop_readiness_pass",
    readiness?.status === "PASS_TELEGRAM_ERROR_LOOP_READINESS" && allFalse(readiness?.guardrails),
    { status: readiness?.status }
  );
  pushCheck(
    checks,
    failures,
    "p064_local_bus_ack_targets_safe",
    busAck?.status === "PASS_LOCAL_BUS_ACK_COMPLETE" && bus.targetSetOk && bus.executionOk && allFalse(busAck?.guardrails),
    { status: busAck?.status, targets: bus.targets }
  );
  pushCheck(
    checks,
    failures,
    "p069_review_ready_pass",
    reviewReady?.status === "PASS_REVIEW_READY" && (reviewReady?.checks || []).every((check) => check.passed) && allFalse(reviewReady?.guardrails),
    { status: reviewReady?.status }
  );
  pushCheck(
    checks,
    failures,
    "p070_next_gates_pass",
    nextGates?.status === "PASS_NEXT_GATES_READY" &&
      (nextGates?.checks || []).every((check) => check.passed) &&
      Array.isArray(nextGates?.failures) &&
      nextGates.failures.length === 0 &&
      allFalse(nextGates?.guardrails),
    { status: nextGates?.status }
  );
  pushCheck(checks, failures, "p070_gate_tokens_present", gateTokensOk(nextGates), {
    gateIds: (nextGates?.gate_options || []).map((gate) => gate.id)
  });
  pushCheck(checks, failures, "p057_gate_check_pass", gateCheck?.status === "PASS" && gateCheck?.failures?.length === 0, {
    status: gateCheck?.status,
    candidatePathspecs: gateCheck?.candidate_pathspec_count,
    gitStatusLines: gateCheck?.git_status_line_count
  });
  pushCheck(checks, failures, "p058_helper_dry_run_pass", helper?.status === "PASS" && helper?.executed === false && helper?.failures?.length === 0, {
    status: helper?.status,
    executed: helper?.executed
  });
  pushCheck(checks, failures, "commit_manifest_contains_operator_status", manifestOk(manifest));

  const status = failures.length === 0 ? "PASS_OPERATOR_STATUS_READY" : "FAIL_OPERATOR_STATUS_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_operator_status.v1",
    packet_id: "A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_operator_status_no_execution",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    checks,
    failures,
    gate_summary: gateSummary(nextGates),
    telegram_safe_draft: makeTelegramSafeDraft({ readiness, reviewReady, nextGates, gateCheck, helper }),
    usable_commands: [
      "pnpm active-focus:status",
      "pnpm active-focus:review-ready",
      "pnpm active-focus:next-gates"
    ],
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
    next_safe_action:
      status === "PASS_OPERATOR_STATUS_READY"
        ? "Use the Telegram-safe draft for review, then choose one exact approval token if an external/local commit action is needed."
        : "Fix operator status prerequisites before opening any external or commit gate."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Operator Status - 2026-07-03

## Status

${packet.status}

## Purpose

One-command local operator status for the Telegram error-loop fix, A2A2A local bus handoff to Codex/Hermes/OpenCode, and explicit next gates.

## Usable Commands

${packet.usable_commands.map((command) => `- \`${command}\``).join("\n")}

## Telegram-Safe Draft

\`\`\`text
${packet.telegram_safe_draft}
\`\`\`

## Gate Summary

${packet.gate_summary.map((gate) => `- ${gate.id}: ${gate.status} · token: \`${gate.approval_token}\``).join("\n")}

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

export async function writeActiveFocusOperatorStatus(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusOperatorStatus(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
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
  const packet = await writeActiveFocusOperatorStatus(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
