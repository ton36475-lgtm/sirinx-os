import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_NEXT_GATES_20260703.md";
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

function allFalse(object) {
  return Object.values(object || {}).every((value) => value === false);
}

function gateEntry({ id, status, approvalToken, reason, allowedCommands = [], blockedActions = [] }) {
  return {
    id,
    status,
    approval_token: approvalToken,
    reason,
    allowed_commands: allowedCommands,
    blocked_actions: blockedActions
  };
}

function buildGateOptions({ reviewReady, helper }) {
  const baseBlocked = [
    "git push",
    "deploy",
    "Cloudflare/R2 mutation",
    "provider call",
    "Telegram live send",
    "secret value print",
    ".env read",
    "install"
  ];
  return [
    gateEntry({
      id: "local_commit",
      status: "ready_for_exact_operator_gate_no_commit_performed",
      approvalToken: "APPROVE_LOCAL_COMMIT_A2A2A_ACTIVE_FOCUS_20260703",
      reason: "P069 review-ready passed and P058 generated explicit pathspec commands. This remains local-only.",
      allowedCommands: [
        helper?.commands?.stage || "node scripts/ghostclaw_local_commit_helper.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --print-stage-command",
        helper?.commands?.cached_diff_check || "git diff --cached --check",
        helper?.commands?.commit || "node scripts/ghostclaw_local_commit_helper.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --print-commit-command"
      ],
      blockedActions: baseBlocked.filter((action) => action !== ".env read")
    }),
    gateEntry({
      id: "telegram_live_send",
      status: "closed_requires_separate_exact_gate",
      approvalToken: "APPROVE_TELEGRAM_LIVE_SEND_AFTER_REVIEW_READY_20260703",
      reason: "P069 only produced Telegram-safe draft text. It did not send a live message.",
      blockedActions: baseBlocked
    }),
    gateEntry({
      id: "provider_call",
      status: "closed_requires_separate_exact_gate",
      approvalToken: "APPROVE_PROVIDER_CALL_AFTER_REVIEW_READY_20260703",
      reason: "P069 is local evidence only. No model/provider call was made.",
      blockedActions: baseBlocked
    }),
    gateEntry({
      id: "cloudflare_r2_write",
      status: "closed_requires_separate_exact_gate",
      approvalToken: "APPROVE_CLOUDFLARE_R2_WRITE_AFTER_REVIEW_READY_20260703",
      reason: "Cloudflare/R2 remains a remote mutation and is not part of local review-ready validation.",
      blockedActions: baseBlocked
    }),
    gateEntry({
      id: "push_deploy",
      status: "closed_requires_separate_exact_gate",
      approvalToken: "APPROVE_PUSH_OR_DEPLOY_AFTER_LOCAL_COMMIT_20260703",
      reason: "Push/deploy should only be considered after a reviewed local commit exists.",
      blockedActions: baseBlocked
    }),
    gateEntry({
      id: "install_or_dependency_change",
      status: "closed_requires_separate_exact_gate",
      approvalToken: "APPROVE_INSTALL_OR_DEP_CHANGE_AFTER_REVIEW_READY_20260703",
      reason: "No dependency install/change is required for the current active-focus local review lane.",
      blockedActions: baseBlocked
    })
  ].map((entry) => ({
    ...entry,
    review_ready_status: reviewReady?.status || "unknown"
  }));
}

export async function createActiveFocusNextGates(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const reviewReady = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json",
    failures,
    "p069_review_ready"
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
    "p058_commit_helper"
  );
  const manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest");

  const reviewReadyOk =
    reviewReady?.status === "PASS_REVIEW_READY" &&
    (reviewReady?.checks || []).every((check) => check.passed === true) &&
    allFalse(reviewReady?.guardrails);
  const gateOk = gateCheck?.status === "PASS" && gateCheck?.failures?.length === 0;
  const helperOk = helper?.status === "PASS" && helper?.executed === false && helper?.failures?.length === 0;
  const manifestOk =
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_next_gates.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_next_gates.test.mjs") &&
    manifest.candidate_pathspecs.includes("reports/mission/A2A2A_ACTIVE_FOCUS_NEXT_GATES_20260703.md") &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT);

  const checks = [
    { name: "p069_review_ready_pass", passed: reviewReadyOk, status: reviewReady?.status },
    {
      name: "p057_gate_check_pass",
      passed: gateOk,
      status: gateCheck?.status,
      candidatePathspecs: gateCheck?.candidate_pathspec_count,
      gitStatusLines: gateCheck?.git_status_line_count
    },
    { name: "p058_helper_dry_run_pass", passed: helperOk, status: helper?.status, executed: helper?.executed },
    { name: "commit_manifest_contains_next_gates", passed: manifestOk }
  ];
  for (const check of checks) {
    if (!check.passed) failures.push(check.name);
  }

  const status = failures.length === 0 ? "PASS_NEXT_GATES_READY" : "FAIL_NEXT_GATES_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_next_gates.v1",
    packet_id: "A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_next_gate_packet_no_execution",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    checks,
    failures,
    gate_options: buildGateOptions({ reviewReady, helper }),
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
      status === "PASS_NEXT_GATES_READY"
        ? "Operator chooses one exact approval token. Without that, continue local review only."
        : "Fix next-gate prerequisites before asking for any exact gate."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Next Gates - 2026-07-03

## Status

${packet.status}

## Purpose

Operator decision packet after P069 review-ready validation. This lists exact next gates without executing them.

## Gate Options

${packet.gate_options.map((gate) => `- ${gate.id}: ${gate.status} · token: \`${gate.approval_token}\``).join("\n")}

## Local Commit Commands

${(packet.gate_options.find((gate) => gate.id === "local_commit")?.allowed_commands || []).map((command) => `- \`${command}\``).join("\n")}

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

export async function writeActiveFocusNextGates(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusNextGates(options);
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
  const args = (() => {
    const parsed = {
      root: process.cwd(),
      evidence: DEFAULT_EVIDENCE,
      receipt: DEFAULT_RECEIPT,
      report: DEFAULT_REPORT,
      noWrite: false
    };
    const argv = process.argv.slice(2);
    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];
      if (arg === "--root") parsed.root = argv[++index];
      else if (arg === "--evidence") parsed.evidence = argv[++index];
      else if (arg === "--receipt") parsed.receipt = argv[++index];
      else if (arg === "--report") parsed.report = argv[++index];
      else if (arg === "--no-write") parsed.noWrite = true;
    }
    return parsed;
  })();
  const packet = await writeActiveFocusNextGates(args);
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
