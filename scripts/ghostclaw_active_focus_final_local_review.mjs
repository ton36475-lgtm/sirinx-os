import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKET_ID = "A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703";
const DEFAULT_EVIDENCE = `.ghostclaw_runtime/a2a2a/evidence/${PACKET_ID}.json`;
const DEFAULT_RECEIPT = `.ghostclaw_runtime/a2a2a/receipts/${PACKET_ID}.json`;
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_FINAL_LOCAL_REVIEW_20260703.md";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";

const requiredEvidence = {
  telegram_readiness: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json",
  review_ready: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json",
  next_gates: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json",
  operator_status: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json",
  handoff_bundle: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json",
  handoff_index: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json",
  handoff_verify: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json",
  commit_gate: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json",
  commit_helper: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json"
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

function checksPassed(packet) {
  return (packet?.checks || []).every((check) => check.passed === true);
}

function gateOptionsClosed(nextGates) {
  const allowedReady = new Set(["local_commit"]);
  return (nextGates?.gate_options || []).every((gate) => {
    if (allowedReady.has(gate.id)) return gate.status === "ready_for_exact_operator_gate_no_commit_performed";
    return gate.status === "closed_requires_separate_exact_gate";
  });
}

function manifestOk(manifest) {
  return (
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_final_local_review.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_final_local_review.test.mjs") &&
    manifest.candidate_pathspecs.includes(DEFAULT_REPORT) &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT)
  );
}

function pushCheck(checks, failures, name, passed, details = {}) {
  checks.push({ name, passed, ...details });
  if (!passed) failures.push(name);
}

function makeReviewDraft({ telegram, reviewReady, nextGates, operatorStatus, handoffVerify, commitGate, helper }) {
  return [
    "Hermes Final Local Review",
    `telegram_error_loop: ${telegram?.status || "unknown"}`,
    `review_ready: ${reviewReady?.status || "unknown"}`,
    `next_gates: ${nextGates?.status || "unknown"}`,
    `operator_status: ${operatorStatus?.status || "unknown"}`,
    `handoff_verify: ${handoffVerify?.status || "unknown"}`,
    `commit_gate: ${commitGate?.status || "unknown"} (${commitGate?.candidate_pathspec_count || 0} pathspecs, ${
      commitGate?.git_status_line_count || 0
    } scoped status lines)`,
    `commit_helper: ${helper?.status || "unknown"} (executed=${helper?.executed === true})`,
    "scope: sirinx.co + AGM AutoFlow only",
    "paused: Kusala + Phitsanulok News",
    "codex/hermes/opencode: local handoff verified by checksum; no payload execution claimed",
    "next: continue local review or open one exact approval token",
    "live_send=false; provider_call=false; external_message_send=false; commit=false; push=false; deploy=false; cloudflare_r2_mutation=false; secret_read=false; install=false"
  ].join("\n");
}

export async function createActiveFocusFinalLocalReview(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const [
    telegram,
    reviewReady,
    nextGates,
    operatorStatus,
    handoffBundle,
    handoffIndex,
    handoffVerify,
    commitGate,
    helper,
    manifest
  ] = await Promise.all([
    readJson(root, requiredEvidence.telegram_readiness, failures, "telegram_readiness"),
    readJson(root, requiredEvidence.review_ready, failures, "review_ready"),
    readJson(root, requiredEvidence.next_gates, failures, "next_gates"),
    readJson(root, requiredEvidence.operator_status, failures, "operator_status"),
    readJson(root, requiredEvidence.handoff_bundle, failures, "handoff_bundle"),
    readJson(root, requiredEvidence.handoff_index, failures, "handoff_index"),
    readJson(root, requiredEvidence.handoff_verify, failures, "handoff_verify"),
    readJson(root, requiredEvidence.commit_gate, failures, "commit_gate"),
    readJson(root, requiredEvidence.commit_helper, failures, "commit_helper"),
    readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest")
  ]);
  const checks = [];
  pushCheck(
    checks,
    failures,
    "telegram_error_loop_readiness_pass",
    telegram?.status === "PASS_TELEGRAM_ERROR_LOOP_READINESS" && allFalse(telegram?.guardrails),
    { status: telegram?.status }
  );
  pushCheck(
    checks,
    failures,
    "review_ready_pass",
    reviewReady?.status === "PASS_REVIEW_READY" && checksPassed(reviewReady) && allFalse(reviewReady?.guardrails),
    { status: reviewReady?.status }
  );
  pushCheck(
    checks,
    failures,
    "next_gates_safe",
    nextGates?.status === "PASS_NEXT_GATES_READY" && checksPassed(nextGates) && allFalse(nextGates?.guardrails) && gateOptionsClosed(nextGates),
    { status: nextGates?.status }
  );
  pushCheck(
    checks,
    failures,
    "operator_status_pass",
    operatorStatus?.status === "PASS_OPERATOR_STATUS_READY" && checksPassed(operatorStatus) && allFalse(operatorStatus?.guardrails),
    { status: operatorStatus?.status }
  );
  pushCheck(
    checks,
    failures,
    "handoff_bundle_pass",
    handoffBundle?.status === "PASS_HANDOFF_BUNDLE_READY" && checksPassed(handoffBundle) && allFalse(handoffBundle?.guardrails),
    { status: handoffBundle?.status }
  );
  pushCheck(
    checks,
    failures,
    "handoff_index_pass",
    handoffIndex?.status === "PASS_HANDOFF_INDEX_READY" &&
      checksPassed(handoffIndex) &&
      allFalse(handoffIndex?.guardrails) &&
      handoffIndex?.file_hashes?.length === 6,
    { status: handoffIndex?.status, fileCount: handoffIndex?.file_hashes?.length || 0 }
  );
  pushCheck(
    checks,
    failures,
    "handoff_verify_pass",
    handoffVerify?.status === "PASS_HANDOFF_VERIFY_READY" &&
      checksPassed(handoffVerify) &&
      allFalse(handoffVerify?.guardrails) &&
      (handoffVerify?.hash_results || []).every((result) => result.matched === true),
    { status: handoffVerify?.status, fileCount: handoffVerify?.hash_results?.length || 0 }
  );
  pushCheck(
    checks,
    failures,
    "commit_gate_pass",
    commitGate?.status === "PASS" &&
      commitGate?.candidate_pathspec_count === manifest?.candidate_pathspecs?.length &&
      commitGate?.git_status_line_count >= commitGate?.candidate_pathspec_count &&
      Array.isArray(commitGate?.failures) &&
      commitGate.failures.length === 0,
    {
      status: commitGate?.status,
      candidatePathspecs: commitGate?.candidate_pathspec_count,
      gitStatusLines: commitGate?.git_status_line_count
    }
  );
  pushCheck(
    checks,
    failures,
    "commit_helper_dry_run_pass",
    helper?.status === "PASS" && helper?.executed === false && Array.isArray(helper?.failures) && helper.failures.length === 0,
    { status: helper?.status, executed: helper?.executed }
  );
  pushCheck(checks, failures, "commit_manifest_contains_final_local_review", manifestOk(manifest));

  const status = failures.length === 0 ? "PASS_FINAL_LOCAL_REVIEW_READY" : "FAIL_FINAL_LOCAL_REVIEW_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_final_local_review.v1",
    packet_id: PACKET_ID,
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_final_review_no_execution",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    required_evidence: requiredEvidence,
    checks,
    failures,
    commit_gate_summary: {
      candidate_pathspecs: commitGate?.candidate_pathspec_count || 0,
      git_status_lines: commitGate?.git_status_line_count || 0,
      helper_executed: helper?.executed === true
    },
    telegram_safe_draft: makeReviewDraft({ telegram, reviewReady, nextGates, operatorStatus, handoffVerify, commitGate, helper }),
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
      status === "PASS_FINAL_LOCAL_REVIEW_READY"
        ? "Use this packet as the local review surface, or open one exact approval token."
        : "Fix failed checks before local commit, live send, provider call, deploy, or cloud mutation gates."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Final Local Review - 2026-07-03

## Status

${packet.status}

## Purpose

One local-safe review surface for the Telegram error-loop guard, active-focus readiness, Codex/Hermes/OpenCode handoff chain, and explicit-path commit gate.

## Active Focus

${packet.active_focus.map((item) => `- ${item}`).join("\n")}

## Paused / Out Of Focus

${packet.paused_out_of_focus.map((item) => `- ${item}`).join("\n")}

## Checks

${packet.checks.map((check) => `- ${check.name}: ${check.passed}`).join("\n")}

## Commit Gate Summary

- candidate_pathspecs: ${packet.commit_gate_summary.candidate_pathspecs}
- git_status_lines: ${packet.commit_gate_summary.git_status_lines}
- helper_executed: ${packet.commit_gate_summary.helper_executed}

## Telegram-Safe Draft

\`\`\`text
${packet.telegram_safe_draft}
\`\`\`

## Guardrails

${Object.entries(packet.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Failures

${packet.failures.length === 0 ? "- None" : packet.failures.map((failure) => `- ${failure}`).join("\n")}

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

export async function writeActiveFocusFinalLocalReview(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusFinalLocalReview(options);
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
      commit_gate_summary: packet.commit_gate_summary,
      guardrails: packet.guardrails,
      next_safe_action: packet.next_safe_action
    });
    await writeText(resolve(root, options.report || DEFAULT_REPORT), renderReport(packet));
  }
  return packet;
}

async function main() {
  const packet = await writeActiveFocusFinalLocalReview(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
