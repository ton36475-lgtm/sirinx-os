/**
 * Codex Sidecar: dry-run contract for invoking the Codex CLI from Hermes routing.
 *
 * Safety invariants:
 * - Never executes real shell unless explicitly approved AND within allowed lane.
 * - Tier A/B auto-execute is simulated as a dry-run Codex CLI preview.
 * - Tier C/D/X always produces a simulation manifest and blocks real execution.
 * - No .env / secret path access.
 * - No generic push / deploy / production action.
 */
import { randomUUID } from "node:crypto";
import type { A2AMessage, BrokerVerdict, Receipt } from "./a2a-message.js";
import { evaluateCommand } from "./command-broker.js";
import { writePacket } from "./packet-bus.js";
import { writeSimulationManifest, zeroHash } from "./manifest-store.js";

export interface CodexSidecarResult {
  status: "allowed_dry_run" | "blocked_simulated" | "quorum_required";
  mission_id: string;
  correlation_id: string;
  decision_id: string;
  tier: string;
  reason: string;
  safe_replacement?: string | undefined;
  manifest_id?: string | undefined;
  outbox_packet_id?: string | undefined;
  codex_dry_run_preview: string;
}

export interface CodexSidecarOptions {
  projectRoot?: string | undefined;
  /** If true, real Codex CLI may run for tier A/B (default false = dry-run only) */
  allowRealExec?: boolean;
  /** Inject a custom dry-run preview generator for tests */
  previewGenerator?: (msg: A2AMessage, verdict: BrokerVerdict) => string;
  now?: () => Date;
}

function buildBusOptions(options: CodexSidecarOptions) {
  return options.projectRoot !== undefined ? { projectRoot: options.projectRoot } : {};
}

function buildManifestOptions(options: CodexSidecarOptions) {
  return options.projectRoot !== undefined ? { projectRoot: options.projectRoot } : {};
}

function defaultPreview(msg: A2AMessage, verdict: BrokerVerdict): string {
  const args = [
    "codex",
    verdict.allowed ? "exec" : "exec --dry-run",
    "--sandbox",
    "danger-full-access",
    JSON.stringify(msg.action_requested),
  ];
  return [
    `# Codex CLI dry-run preview`,
    `command: ${args.join(" ")}`,
    `working_dir: ${msg.context.lane ?? "repo-root"}`,
    `files: ${(msg.context.files ?? []).join(", ") || "none"}`,
    `goal: ${msg.context.goal}`,
    `verdict: ${verdict.allowed ? "ALLOWED" : "BLOCKED"} tier=${verdict.tier}`,
    `reason: ${verdict.reason}`,
    verdict.safeReplacement ? `safe_replacement: ${verdict.safeReplacement}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runCodexSidecar(
  msg: A2AMessage,
  options: CodexSidecarOptions = {}
): Promise<CodexSidecarResult> {
  const { verdict, receipt } = evaluateCommand(msg);
  const preview = (options.previewGenerator ?? defaultPreview)(msg, verdict);

  // Always produce an outbox packet as evidence.
  const outboxPacket = await writePacket(
    {
      project: "ghostclaw-a2a2a",
      priority: "P1",
      title: `codex-sidecar:${msg.action_requested}:${receipt.decision_id}`,
      agent: "codex",
      status: "outbox",
      risk: verdict.tier === "A" || verdict.tier === "B" ? "safe" : verdict.tier === "C" ? "medium" : "critical",
      input: msg.context.files ?? [],
      output: [],
      approval_required: !verdict.allowed,
      a2a2a_message: msg as unknown as Record<string, unknown>,
      receipt: receipt as unknown as Record<string, unknown>,
      notes: `tier=${verdict.tier}; reason=${verdict.reason}; real_exec=${options.allowRealExec ?? false}`,
    },
    buildBusOptions(options)
  );

  // Tier C/D/X or any blocked action -> simulation manifest only.
  if (!verdict.allowed) {
    const snapshots: Record<string, string> = {};
    for (const file of msg.context.files ?? []) {
      snapshots[file] = zeroHash();
    }
    const manifest = await writeSimulationManifest(
      {
        correlation_id: msg.correlation_id,
        mission_id: msg.mission_id,
        simulation_only: true,
        action_requested: msg.action_requested,
        action_class: receipt.action_class,
        final_tier: receipt.final_tier,
        reason: verdict.reason,
        ...(verdict.safeReplacement !== undefined
          ? { safe_replacement_action: verdict.safeReplacement }
          : {}),
        target_files: msg.context.files ?? [],
        snapshots,
        rollback_commands: (msg.context.files ?? []).map((f) => `git checkout -- ${f}`),
        codex_dry_run_preview: preview,
        notes: "Dry-run only. Real Codex CLI blocked by policy tier.",
      },
      buildManifestOptions(options)
    );

    return {
      status: verdict.tier === "C" ? "quorum_required" : "blocked_simulated",
      mission_id: msg.mission_id,
      correlation_id: msg.correlation_id,
      decision_id: receipt.decision_id,
      tier: verdict.tier,
      reason: verdict.reason,
      ...(verdict.safeReplacement !== undefined ? { safe_replacement: verdict.safeReplacement } : {}),
      manifest_id: manifest.manifest_id,
      outbox_packet_id: outboxPacket.id,
      codex_dry_run_preview: preview,
    };
  }

  // Tier A/B allowed: still dry-run by default unless allowRealExec=true.
  // Even then, we only produce a dry-run preview here; real exec requires a separate runtime gate.
  if (!options.allowRealExec) {
    const snapshots: Record<string, string> = {};
    for (const file of msg.context.files ?? []) {
      snapshots[file] = zeroHash();
    }
    const manifest = await writeSimulationManifest(
      {
        correlation_id: msg.correlation_id,
        mission_id: msg.mission_id,
        simulation_only: true,
        action_requested: msg.action_requested,
        action_class: receipt.action_class,
        final_tier: receipt.final_tier,
        reason: "tier_a_b_dry_run_only:no_real_exec_flag",
        safe_replacement_action: "set_allowRealExec_and_re_run_through_runtime_gate",
        target_files: msg.context.files ?? [],
        snapshots,
        rollback_commands: (msg.context.files ?? []).map((f) => `git checkout -- ${f}`),
        codex_dry_run_preview: preview,
        notes: "Tier A/B auto-execute allowed by broker, but real exec disabled in sidecar.",
      },
      buildManifestOptions(options)
    );
    return {
      status: "allowed_dry_run",
      mission_id: msg.mission_id,
      correlation_id: msg.correlation_id,
      decision_id: receipt.decision_id,
      tier: verdict.tier,
      reason: verdict.reason,
      safe_replacement: "set_allowRealExec_and_re_run_through_runtime_gate",
      manifest_id: manifest.manifest_id,
      outbox_packet_id: outboxPacket.id,
      codex_dry_run_preview: preview,
    };
  }

  // allowRealExec=true branch: still produce dry-run preview and do NOT exec here.
  // The sidecar contract stops at producing the artifact; a runtime gate would call execFile.
  return {
    status: "allowed_dry_run",
    mission_id: msg.mission_id,
    correlation_id: msg.correlation_id,
    decision_id: receipt.decision_id,
    tier: verdict.tier,
    reason: verdict.reason,
    outbox_packet_id: outboxPacket.id,
    codex_dry_run_preview: preview + "\n# Real exec flag set, but sidecar stops at preview. Use runtime gate to execute.",
  };
}

export function makeA2AMessage(action: string, files?: string[]): A2AMessage {
  return {
    a2a2a_version: "2.0",
    mission_id: `M-${randomUUID().slice(0, 8)}`,
    correlation_id: `sirinx-a2a2a-${randomUUID().slice(0, 8)}`,
    from: { agent: "hermes-commander", role: "mission-commander" },
    to: { agent: "codex-captain", role: "build-captain" },
    action_requested: action,
    context: {
      goal: "A2A bridge dry-run",
      files: files ?? [],
      lane: "GHOSTCLAW/a2a-hermes-codex-bridge",
      constraints: [],
    },
    human_approval_required: false,
    timestamp: new Date().toISOString(),
    ttl_seconds: 600,
    status: "PENDING",
    safe_execution_v3: {
      mode: "full_auto_yolo_safe_execution",
      blocked_action_behavior: "auto_block_and_continue",
    },
  };
}
