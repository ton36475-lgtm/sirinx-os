import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_READINESS_20260703.md";

const requiredScripts = [
  "telegram-command-router:test",
  "telegram-error-loop:a2a2a-sync",
  "telegram-error-loop:a2a2a-sync:test",
  "ghostclaw-a2a:bus-watch",
  "ghostclaw-a2a:bus-watch:test"
];

const closedGates = [
  "telegram_live_send",
  "provider_call",
  "paid_model_call",
  "repo_content_external_routing",
  "customer_data_external_routing",
  "secret_read",
  "secret_value_print",
  "install",
  "commit",
  "push",
  "deploy",
  "cloudflare_r2_mutation"
];

const requiredCandidatePathspecs = [
  "services/dev-control-api/src/telegram-command-router.mjs",
  "services/dev-control-api/src/telegram-command-router.test.mjs",
  "scripts/ghostclaw_telegram_error_loop_a2a2a_sync.mjs",
  "scripts/ghostclaw_telegram_error_loop_a2a2a_sync.test.mjs",
  "scripts/ghostclaw_telegram_error_loop_readiness.mjs",
  "scripts/ghostclaw_telegram_error_loop_readiness.test.mjs",
  "scripts/ghostclaw_a2a_bus_watcher.py",
  "WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_bus_watcher.py",
  "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_A2A2A_SYNC_20260703.md",
  "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_BUS_ACK_20260703.md",
  DEFAULT_REPORT
];

const targetPackets = [
  {
    target: "codex",
    packet: ".ghostclaw_runtime/a2a2a/inbox/codex/A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json",
    ack: ".ghostclaw_runtime/a2a2a/receipts/bus_ack_codex_A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json"
  },
  {
    target: "hermes",
    packet: ".ghostclaw_runtime/a2a2a/inbox/hermes/A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json",
    ack: ".ghostclaw_runtime/a2a2a/receipts/bus_ack_hermes_A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json"
  },
  {
    target: "opencode",
    packet: ".ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json",
    ack: ".ghostclaw_runtime/a2a2a/receipts/bus_ack_opencode_A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json"
  }
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

async function readText(root, path) {
  return readFile(resolve(root, path), "utf8");
}

async function readJson(root, path) {
  return JSON.parse(await readText(root, path));
}

async function tryReadJson(root, path, failures, label) {
  try {
    return await readJson(root, path);
  } catch (error) {
    failures.push(`missing_or_invalid_${label}_${path}: ${error.message}`);
    return null;
  }
}

function allFalse(object, keys) {
  return keys.every((key) => object?.[key] === false);
}

function pushCheck(checks, name, passed, details = {}) {
  checks.push({ name, passed, ...details });
}

export async function createTelegramErrorLoopReadiness(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const checks = [];

  const packageJson = await tryReadJson(root, "package.json", failures, "package_json");
  const scripts = packageJson?.scripts || {};
  const missingScripts = requiredScripts.filter((scriptName) => !scripts[scriptName]);
  pushCheck(checks, "package_scripts_present", missingScripts.length === 0, { missingScripts });
  for (const scriptName of missingScripts) failures.push(`missing_package_script_${scriptName}`);

  const p063 = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json",
    failures,
    "p063_evidence"
  );
  pushCheck(checks, "p063_sync_status", p063?.status === "PASS_LOCAL_SYNC_PACKETS_READY", { status: p063?.status });
  if (p063?.status !== "PASS_LOCAL_SYNC_PACKETS_READY") failures.push("p063_sync_not_ready");

  const p064 = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json",
    failures,
    "p064_evidence"
  );
  pushCheck(checks, "p064_bus_ack_status", p064?.status === "PASS_LOCAL_BUS_ACK_COMPLETE", { status: p064?.status });
  if (p064?.status !== "PASS_LOCAL_BUS_ACK_COMPLETE") failures.push("p064_bus_ack_not_complete");
  const p064Targets = new Set((p064?.acknowledgements || []).map((ack) => ack.target));
  const missingP064Targets = targetPackets.map((packet) => packet.target).filter((target) => !p064Targets.has(target));
  pushCheck(checks, "p064_targets_acknowledged", missingP064Targets.length === 0, { missingP064Targets });
  for (const target of missingP064Targets) failures.push(`p064_missing_target_${target}`);
  pushCheck(checks, "p064_guardrails_closed", allFalse(p064?.guardrails, closedGates), { closedGates });
  if (!allFalse(p064?.guardrails, closedGates)) failures.push("p064_guardrails_not_closed");

  const packetResults = [];
  for (const target of targetPackets) {
    const packet = await tryReadJson(root, target.packet, failures, `${target.target}_packet`);
    const ack = await tryReadJson(root, target.ack, failures, `${target.target}_ack`);
    const packetOk =
      packet?.schema === "ghostclaw.a2a2a.task.v1" &&
      packet?.target === target.target &&
      packet?.dangerous_actions_allowed === false &&
      packet?.paid_model_calls_allowed === false &&
      packet?.secret_access_allowed === false;
    const ackOk =
      ack?.status === "acknowledged_local_bus_sync" &&
      ack?.target === target.target &&
      allFalse(ack?.execution, [
        "payload_executed",
        "paid_model_calls",
        "secret_access",
        "cloud_mutation",
        "external_message_send",
        "package_install",
        "git_push",
        "deploy"
      ]);
    packetResults.push({ target: target.target, packetOk, ackOk });
    if (!packetOk) failures.push(`invalid_packet_${target.target}`);
    if (!ackOk) failures.push(`invalid_ack_${target.target}`);
  }
  pushCheck(checks, "target_packets_safe", packetResults.every((result) => result.packetOk), { packetResults });
  pushCheck(checks, "target_ack_receipts_safe", packetResults.every((result) => result.ackOk), { packetResults });

  const gate = await tryReadJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", failures, "commit_gate");
  const candidates = new Set(gate?.candidate_pathspecs || []);
  const missingCandidates = requiredCandidatePathspecs.filter((pathspec) => !candidates.has(pathspec));
  pushCheck(checks, "commit_gate_contains_readiness_paths", missingCandidates.length === 0, { missingCandidates });
  for (const pathspec of missingCandidates) failures.push(`commit_gate_missing_candidate_${pathspec}`);

  const requiredEvidence = new Set(gate?.required_evidence || []);
  const missingEvidence = [
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json",
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json",
    ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json",
    ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json"
  ].filter((pathspec) => !requiredEvidence.has(pathspec));
  pushCheck(checks, "commit_gate_contains_required_runtime_evidence", missingEvidence.length === 0, { missingEvidence });
  for (const pathspec of missingEvidence) failures.push(`commit_gate_missing_evidence_${pathspec}`);

  let busAckReport = "";
  try {
    busAckReport = await readText(root, "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_BUS_ACK_20260703.md");
  } catch (error) {
    failures.push(`missing_bus_ack_report: ${error.message}`);
  }
  const reportHasRerun = busAckReport.includes("pnpm ghostclaw-a2a:bus-watch") &&
    busAckReport.includes("pnpm ghostclaw-a2a:bus-watch:test");
  pushCheck(checks, "bus_ack_report_has_rerun_commands", reportHasRerun);
  if (!reportHasRerun) failures.push("bus_ack_report_missing_rerun_commands");

  const status = failures.length === 0 ? "PASS_TELEGRAM_ERROR_LOOP_READINESS" : "FAIL_TELEGRAM_ERROR_LOOP_READINESS";
  return {
    schema: "ghostclaw.a2a2a.telegram_error_loop_readiness.v1",
    packet_id: "A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_readiness_verifier_no_live_send_no_provider_call",
    checks,
    failures,
    guardrails: {
      telegram_live_send: false,
      provider_call: false,
      paid_model_call: false,
      repo_content_external_routing: false,
      customer_data_external_routing: false,
      secret_read: false,
      secret_value_print: false,
      install: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false
    },
    next_safe_action: status.startsWith("PASS")
      ? "Review the explicit-path local commit gate or run the readiness command again after further Telegram/A2A2A edits."
      : "Fix readiness failures before treating the Telegram/A2A2A lane as usable."
  };
}

function renderReport(readiness) {
  const failed = readiness.checks.filter((check) => !check.passed);
  return `# A2A2A Telegram Error Loop Readiness - 2026-07-03

## Status

${readiness.status}

## Scope

This verifier checks that the Telegram error-loop guard is usable as a repeatable local workflow:

- Telegram /fusion smoke remains preview-only from the router.
- P063 Codex/Hermes/OpenCode local handoff packets exist.
- P064 local bus ack receipts exist for all 3 targets.
- Re-run commands are present in package scripts and the bus-ack report.
- The explicit local commit gate includes the source, sync, watcher, readiness, and report files.

## Failed Checks

${failed.length === 0 ? "- None" : failed.map((check) => `- ${check.name}`).join("\n")}

## Guardrails

${Object.entries(readiness.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Next Safe Action

${readiness.next_safe_action}
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

export async function writeTelegramErrorLoopReadiness(options = {}) {
  const root = resolve(options.root || process.cwd());
  const readiness = await createTelegramErrorLoopReadiness(options);
  if (!options.noWrite) {
    const evidencePath = resolve(root, options.evidence || DEFAULT_EVIDENCE);
    const receiptPath = resolve(root, options.receipt || DEFAULT_RECEIPT);
    const reportPath = resolve(root, options.report || DEFAULT_REPORT);
    await writeJson(evidencePath, readiness);
    await writeJson(receiptPath, {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: readiness.packet_id,
      status: readiness.status,
      created_at: readiness.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      guardrails: readiness.guardrails,
      failures: readiness.failures,
      next_safe_action: readiness.next_safe_action
    });
    await writeText(reportPath, renderReport(readiness));
  }
  return readiness;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const readiness = await writeTelegramErrorLoopReadiness(args);
  console.log(JSON.stringify(readiness, null, 2));
  if (!readiness.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
