import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_A2A2A_SYNC_20260703.md";

const changedFiles = [
  "services/dev-control-api/src/telegram-command-router.mjs",
  "services/dev-control-api/src/telegram-command-router.test.mjs"
];

const validationCommands = [
  "./node_modules/.bin/vitest run services/dev-control-api/src/telegram-command-router.test.mjs",
  "node --check services/dev-control-api/src/telegram-command-router.mjs",
  "node --check services/dev-control-api/src/telegram-command-router.test.mjs"
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

const targetPlans = [
  {
    target: "codex",
    id: "A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703",
    path: ".ghostclaw_runtime/a2a2a/inbox/codex/A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703.json",
    role: "builder_validator",
    expected_behavior: "Verify the focused Telegram router regression and keep this packet local."
  },
  {
    target: "hermes",
    id: "A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703",
    path: ".ghostclaw_runtime/a2a2a/inbox/hermes/A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703.json",
    role: "commander_router",
    expected_behavior: "Treat /fusion smoke as preview-only; keep Telegram live send and provider calls closed."
  },
  {
    target: "opencode",
    id: "A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703",
    path: ".ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703.json",
    role: "read_only_reviewer",
    expected_behavior: "Review the Telegram router diff read-only; suggest patches but do not mutate source."
  }
];

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    evidence: DEFAULT_EVIDENCE,
    receipt: DEFAULT_RECEIPT,
    report: DEFAULT_REPORT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--evidence") args.evidence = argv[++index];
    else if (arg === "--receipt") args.receipt = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
  }

  return args;
}

function guardrails() {
  return {
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
  };
}

function createTaskPacket({ targetPlan, createdAt, evidencePath, reportPath }) {
  return {
    schema: "ghostclaw.a2a2a.task.v1",
    id: targetPlan.id,
    mission: "telegram_error_loop_guard_a2a2a_sync",
    source: "codex",
    target: targetPlan.target,
    created_at: createdAt,
    requires_ack: true,
    requires_receipt: true,
    dangerous_actions_allowed: false,
    paid_model_calls_allowed: false,
    secret_access_allowed: false,
    payload: {
      summary:
        "Telegram /fusion smoke now returns a local preview instead of calling OpenRouter, preventing provider retry/error loops from Telegram commands.",
      role: targetPlan.role,
      expected_behavior: targetPlan.expected_behavior,
      mutation_allowed: targetPlan.target === "codex" ? "validation_only" : false,
      changed_files: changedFiles,
      validation_commands: validationCommands,
      evidence_path: evidencePath,
      report_path: reportPath,
      guardrails: guardrails()
    }
  };
}

export function createTelegramErrorLoopA2A2ASync(options = {}) {
  const createdAt = options.createdAt || new Date().toISOString();
  const evidencePath = options.evidence || DEFAULT_EVIDENCE;
  const reportPath = options.report || DEFAULT_REPORT;
  const packets = targetPlans.map((targetPlan) => ({
    path: targetPlan.path,
    packet: createTaskPacket({ targetPlan, createdAt, evidencePath, reportPath })
  }));

  return {
    packet_id: "A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703",
    title: "Telegram Error Loop Guard A2A2A Sync",
    created_at: createdAt,
    status: "PASS_LOCAL_SYNC_PACKETS_READY",
    mode: "local_file_bus_only_no_live_send_no_provider_call",
    changed_files: changedFiles,
    validation_commands: validationCommands,
    target_packets: packets.map(({ path, packet }) => ({
      target: packet.target,
      id: packet.id,
      path,
      expected_behavior: packet.payload.expected_behavior
    })),
    guardrails: guardrails(),
    closed_gates: closedGates,
    next_safe_action:
      "Codex runs focused validation; Hermes treats the packet as route metadata; OpenCode performs read-only review. Live Telegram send and provider calls remain closed."
  };
}

function renderReport(sync) {
  return `# A2A2A Telegram Error Loop A2A2A Sync - 2026-07-03

## Status

${sync.status}: Telegram Fusion smoke is now preview-only from the Telegram router and has been synced to Codex, Hermes, and OpenCode as local file-bus packets.

## Changed Files

${sync.changed_files.map((file) => `- \`${file}\``).join("\n")}

## Validation Commands

${sync.validation_commands.map((command) => `- \`${command}\``).join("\n")}

## Target Packets

${sync.target_packets
  .map((packet) => `- ${packet.target}: \`${packet.path}\` - ${packet.expected_behavior}`)
  .join("\n")}

## Closed Gates

${sync.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${sync.next_safe_action}
`;
}

async function writeJson(root, path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(root, path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, value, "utf8");
}

export async function writeTelegramErrorLoopA2A2ASync(options = {}) {
  const root = resolve(options.root || process.cwd());
  const sync = createTelegramErrorLoopA2A2ASync(options);

  for (const targetPlan of targetPlans) {
    const packet = createTaskPacket({
      targetPlan,
      createdAt: sync.created_at,
      evidencePath: options.evidence || DEFAULT_EVIDENCE,
      reportPath: options.report || DEFAULT_REPORT
    });
    await writeJson(root, targetPlan.path, packet);
  }

  await writeJson(root, options.evidence || DEFAULT_EVIDENCE, sync);
  await writeJson(root, options.receipt || DEFAULT_RECEIPT, {
    packet_id: sync.packet_id,
    status: sync.status,
    created_at: sync.created_at,
    evidence: options.evidence || DEFAULT_EVIDENCE,
    report: options.report || DEFAULT_REPORT,
    target_packets: sync.target_packets,
    closed_gates: sync.closed_gates,
    guardrails: sync.guardrails,
    next_safe_action: sync.next_safe_action
  });
  await writeText(root, options.report || DEFAULT_REPORT, renderReport(sync));

  return sync;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sync = await writeTelegramErrorLoopA2A2ASync(args);
  console.log(JSON.stringify(sync, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
