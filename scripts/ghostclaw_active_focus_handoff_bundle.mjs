import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_HANDOFF_BUNDLE_20260703.md";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";
const P071_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json";

const lanes = [
  {
    id: "codex",
    role: "local_builder_validator",
    instruction: "Use this as local repo work context. Inspect, patch, and test only after the relevant local-safe gate."
  },
  {
    id: "hermes",
    role: "control_plane_router",
    instruction: "Use this as a Telegram-safe control summary. Route exact gates only; do not self-approve."
  },
  {
    id: "opencode",
    role: "read_only_reviewer",
    instruction: "Use this as review context. Inspect evidence and suggest issues; do not mutate source files."
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

function manifestOk(manifest) {
  return (
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_handoff_bundle.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_handoff_bundle.test.mjs") &&
    manifest.candidate_pathspecs.includes(DEFAULT_REPORT) &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT)
  );
}

function lanePaths(laneId) {
  const base = `.ghostclaw_runtime/a2a2a/outbox/${laneId}/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703`;
  return {
    json: `${base}.json`,
    markdown: `${base}.md`
  };
}

function buildLanePayload({ lane, status }) {
  return {
    schema: "ghostclaw.a2a2a.active_focus_lane_handoff.v1",
    packet_id: `A2A2A-P072-${lane.id.toUpperCase()}-ACTIVE-FOCUS-HANDOFF-20260703`,
    target_lane: lane.id,
    role: lane.role,
    status: "ready_local_handoff_no_execution",
    instruction: lane.instruction,
    source_status_packet: P071_EVIDENCE,
    active_focus: status.active_focus || ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: status.paused_out_of_focus || ["Kusala", "Phitsanulok News"],
    telegram_safe_draft: status.telegram_safe_draft,
    usable_commands: status.usable_commands || ["pnpm active-focus:status"],
    gate_summary: status.gate_summary || [],
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
    next_safe_action: status.next_safe_action
  };
}

function renderLaneMarkdown(payload) {
  return `# ${payload.packet_id}

Target lane: ${payload.target_lane}
Role: ${payload.role}
Status: ${payload.status}

## Instruction

${payload.instruction}

## Telegram-Safe Draft

\`\`\`text
${payload.telegram_safe_draft}
\`\`\`

## Usable Commands

${payload.usable_commands.map((command) => `- \`${command}\``).join("\n")}

## Gate Summary

${payload.gate_summary.map((gate) => `- ${gate.id}: ${gate.status} · token: \`${gate.approval_token}\``).join("\n")}

## Guardrails

${Object.entries(payload.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Next Safe Action

${payload.next_safe_action}
`;
}

export async function createActiveFocusHandoffBundle(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const operatorStatus = await readJson(root, P071_EVIDENCE, failures, "p071_operator_status");
  const manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest");

  const checks = [];
  const p071Ok =
    operatorStatus?.status === "PASS_OPERATOR_STATUS_READY" &&
    (operatorStatus?.checks || []).every((check) => check.passed === true) &&
    allFalse(operatorStatus?.guardrails);
  const gateTokensOk =
    Array.isArray(operatorStatus?.gate_summary) &&
    ["local_commit", "telegram_live_send", "provider_call", "cloudflare_r2_write", "push_deploy"].every((id) =>
      operatorStatus.gate_summary.some((gate) => gate.id === id && typeof gate.approval_token === "string")
    );
  const manifestIncludes = manifestOk(manifest);
  checks.push({ name: "p071_operator_status_pass", passed: p071Ok, status: operatorStatus?.status });
  checks.push({ name: "p071_gate_tokens_present", passed: gateTokensOk });
  checks.push({ name: "commit_manifest_contains_handoff_bundle", passed: manifestIncludes });

  for (const check of checks) {
    if (!check.passed) failures.push(check.name);
  }

  const handoffs = lanes.map((lane) => {
    const paths = lanePaths(lane.id);
    return {
      lane: lane.id,
      paths,
      payload: buildLanePayload({ lane, status: operatorStatus || {} })
    };
  });

  const status = failures.length === 0 ? "PASS_HANDOFF_BUNDLE_READY" : "FAIL_HANDOFF_BUNDLE_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_handoff_bundle.v1",
    packet_id: "A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_handoff_bundle_no_execution",
    checks,
    failures,
    handoffs: handoffs.map(({ lane, paths, payload }) => ({
      lane,
      paths,
      status: payload.status,
      guardrails: payload.guardrails
    })),
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
      status === "PASS_HANDOFF_BUNDLE_READY"
        ? "Review the generated local handoff files or choose one exact approval token. No handoff payload has been executed."
        : "Fix handoff prerequisites before using generated lane files."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Handoff Bundle - 2026-07-03

## Status

${packet.status}

## Purpose

Local handoff bundle for Codex, Hermes, and OpenCode after Telegram error-loop readiness and operator status validation. This creates reviewable handoff files only.

## Handoff Files

${packet.handoffs.map((handoff) => `- ${handoff.lane}: \`${handoff.paths.markdown}\`, \`${handoff.paths.json}\``).join("\n")}

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

export async function writeActiveFocusHandoffBundle(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createActiveFocusHandoffBundle(options);
  if (!options.noWrite) {
    const operatorStatus = JSON.parse(await readFile(resolve(root, P071_EVIDENCE), "utf8"));
    for (const lane of lanes) {
      const paths = lanePaths(lane.id);
      const payload = buildLanePayload({ lane, status: operatorStatus });
      await writeJson(resolve(root, paths.json), payload);
      await writeText(resolve(root, paths.markdown), renderLaneMarkdown(payload));
    }
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      handoffs: packet.handoffs,
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
  const packet = await writeActiveFocusHandoffBundle(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
