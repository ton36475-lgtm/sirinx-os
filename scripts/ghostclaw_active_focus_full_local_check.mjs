import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_FULL_LOCAL_CHECK_20260703.md";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";

export const fullLocalCheckCommands = [
  {
    id: "active_focus_preview_uat",
    bin: "pnpm",
    args: ["active-focus:preview-uat"],
    display: "pnpm active-focus:preview-uat"
  },
  {
    id: "telegram_error_loop_readiness",
    bin: "pnpm",
    args: ["telegram-error-loop:readiness"],
    display: "pnpm telegram-error-loop:readiness"
  },
  {
    id: "a2a_bus_watcher_tests",
    bin: "pnpm",
    args: ["ghostclaw-a2a:bus-watch:test"],
    display: "pnpm ghostclaw-a2a:bus-watch:test"
  },
  {
    id: "active_focus_readiness",
    bin: "pnpm",
    args: ["active-focus:readiness"],
    display: "pnpm active-focus:readiness"
  },
  {
    id: "local_commit_gate_check",
    bin: "node",
    args: [
      "scripts/ghostclaw_local_commit_gate_check.mjs",
      "--manifest",
      COMMIT_GATE_MANIFEST,
      "--json",
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json"
    ],
    display:
      "node scripts/ghostclaw_local_commit_gate_check.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --json .ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json"
  },
  {
    id: "local_commit_helper_dry_run",
    bin: "node",
    args: [
      "scripts/ghostclaw_local_commit_helper.mjs",
      "--manifest",
      COMMIT_GATE_MANIFEST,
      "--json",
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json"
    ],
    display:
      "node scripts/ghostclaw_local_commit_helper.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --json .ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json"
  },
  {
    id: "active_focus_operator_packet",
    bin: "pnpm",
    args: ["active-focus:operator-packet"],
    display: "pnpm active-focus:operator-packet"
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

function excerpt(value, maxLength = 1200) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

async function defaultRunCommand(command, root) {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execFile(command.bin, command.args, {
      cwd: root,
      maxBuffer: 1024 * 1024 * 20
    });
    return {
      id: command.id,
      command: command.display,
      status: "PASS",
      exit_code: 0,
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(stdout),
      stderr_excerpt: excerpt(stderr)
    };
  } catch (error) {
    return {
      id: command.id,
      command: command.display,
      status: "FAIL",
      exit_code: typeof error.code === "number" ? error.code : 1,
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message)
    };
  }
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

function makeTelegramSafeDraft({ operatorPacket, gateCheck, helper }) {
  return [
    "Hermes Full Local Check",
    `status: ${operatorPacket?.status || "unknown"}`,
    "scope: sirinx.co + AGM AutoFlow only",
    "paused: Kusala + Phitsanulok News",
    `commit_gate: ${gateCheck?.status || "unknown"} (${gateCheck?.candidate_pathspec_count || 0} pathspecs)`,
    `commit_helper: ${helper?.status || "unknown"} (dry_run=true, executed=${helper?.executed === true})`,
    "next: review explicit-path local commit gate; do not push/deploy/live-send/provider-call",
    "live_send=false; provider_call=false; external_message_send=false; commit=false; push=false; deploy=false; cloudflare_r2_mutation=false; secret_read=false; install=false"
  ].join("\n");
}

export async function createActiveFocusFullLocalCheck(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const runCommand = options.runCommand || ((command) => defaultRunCommand(command, root));
  const commands = [];

  for (const command of fullLocalCheckCommands) {
    const result = await runCommand(command);
    commands.push(result);
    if (result.status !== "PASS") failures.push(`command_failed_${command.id}`);
    if (options.stopOnFailure !== false && result.status !== "PASS") break;
  }

  const operatorPacket = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703.json",
    failures,
    "p067_operator_packet"
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

  const operatorOk =
    operatorPacket?.status === "PASS_OPERATOR_PACKET_READY" &&
    (operatorPacket?.checks || []).every((check) => check.passed === true) &&
    allFalse(operatorPacket?.guardrails);
  const gateOk = gateCheck?.status === "PASS" && gateCheck?.failures?.length === 0;
  const helperOk = helper?.status === "PASS" && helper?.executed === false && helper?.failures?.length === 0;
  const manifestOk =
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_full_local_check.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_full_local_check.test.mjs") &&
    manifest.candidate_pathspecs.includes("reports/mission/A2A2A_ACTIVE_FOCUS_FULL_LOCAL_CHECK_20260703.md") &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT);

  const checks = [
    {
      name: "all_commands_passed",
      passed: commands.length === fullLocalCheckCommands.length && commands.every((command) => command.status === "PASS"),
      commandCount: commands.length
    },
    { name: "p067_operator_packet_pass", passed: operatorOk, status: operatorPacket?.status },
    {
      name: "p057_gate_check_pass",
      passed: gateOk,
      status: gateCheck?.status,
      candidatePathspecs: gateCheck?.candidate_pathspec_count,
      gitStatusLines: gateCheck?.git_status_line_count
    },
    { name: "p058_helper_dry_run_pass", passed: helperOk, status: helper?.status, executed: helper?.executed },
    { name: "commit_manifest_contains_full_local_check", passed: manifestOk }
  ];

  for (const check of checks) {
    if (!check.passed) failures.push(check.name);
  }

  const status = failures.length === 0 ? "PASS_FULL_LOCAL_CHECK_READY" : "FAIL_FULL_LOCAL_CHECK";
  return {
    schema: "ghostclaw.a2a2a.active_focus_full_local_check.v1",
    packet_id: "A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_full_check_no_live_send_no_provider_call_no_deploy",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    commands,
    checks,
    failures,
    telegram_safe_draft: makeTelegramSafeDraft({ operatorPacket, gateCheck, helper }),
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
      status === "PASS_FULL_LOCAL_CHECK_READY"
        ? "Review the explicit-path local commit gate, or rerun pnpm active-focus:full-local-check before opening any exact external gate."
        : "Fix the failed full-local-check command or stale evidence before using this operator handoff."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Full Local Check - 2026-07-03

## Status

${packet.status}

## Purpose

One-command local-safe validation chain for the active delivery slice: \`sirinx.co\`, AGM AutoFlow/AutoGlow, Telegram error-loop guard, A2A2A local bus receipts, local commit gate, and operator packet.

## Commands

${packet.commands.map((command) => `- ${command.status}: \`${command.command}\``).join("\n")}

## Telegram-Safe Draft

\`\`\`text
${packet.telegram_safe_draft}
\`\`\`

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

export async function writeActiveFocusFullLocalCheck(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusFullLocalCheck(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      command_count: packet.commands.length,
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
  const args = parseArgs(process.argv.slice(2));
  const packet = await writeActiveFocusFullLocalCheck(args);
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
