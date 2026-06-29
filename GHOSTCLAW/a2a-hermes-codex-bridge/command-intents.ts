import { randomUUID } from "node:crypto";
import type { A2AMessage } from "./a2a-message.js";
import type { A2APacket } from "./packet-bus.js";
import { writePacket } from "./packet-bus.js";

export type CommandIntent = "goal" | "mission" | "brainstorm";
export type CommandAction = "goal_define" | "mission_create" | "brainstorm_deliberate";

export interface CommandIntentOptions {
  goal: string;
  packetId?: string | undefined;
  missionId?: string | undefined;
  correlationId?: string | undefined;
  files?: string[] | undefined;
  constraints?: string[] | undefined;
  deliverables?: string[] | undefined;
  lane?: string | undefined;
  projectRoot?: string | undefined;
  now?: () => Date;
}

const ACTION_BY_INTENT: Record<CommandIntent, CommandAction> = {
  goal: "goal_define",
  mission: "mission_create",
  brainstorm: "brainstorm_deliberate",
};

function assertCanonicalIntent(intent: string): asserts intent is CommandIntent {
  if (intent === "BestStorm" || intent === "beststrom") {
    throw new Error("invalid_brainstorm_alias:use_brainstorm");
  }
  if (!(intent in ACTION_BY_INTENT)) {
    throw new Error(`unknown_command_intent:${intent}`);
  }
}

function iso(options: CommandIntentOptions): string {
  return (options.now ?? (() => new Date()))().toISOString();
}

export function commandIntentToAction(intent: string): CommandAction {
  assertCanonicalIntent(intent);
  return ACTION_BY_INTENT[intent];
}

export function buildCommandMessage(intent: CommandIntent, options: CommandIntentOptions): A2AMessage {
  const action = commandIntentToAction(intent);
  const missionId = options.missionId ?? `M-${randomUUID().slice(0, 8)}`;
  const correlationId = options.correlationId ?? `sirinx-a2a2a-${randomUUID().slice(0, 8)}`;

  return {
    a2a2a_version: "2.0",
    mission_id: missionId,
    correlation_id: correlationId,
    ...(intent === "brainstorm" ? { brainstorm_id: `B-${randomUUID().slice(0, 8)}` } : {}),
    phase: `command_intent:${intent}`,
    from: { agent: "hermes-commander", role: "mission-commander" },
    to: { agent: "codex-captain", role: "build-captain" },
    action_requested: action,
    context: {
      goal: options.goal,
      files: options.files ?? [],
      lane: options.lane ?? "GHOSTCLAW/a2a-hermes-codex-bridge",
      constraints: [
        "dry_run=true",
        "runtime_queue_execution=false",
        "provider_call=false",
        "external_message_send=false",
        "deploy=false",
        "push=false",
        "secret_read=false",
        ...(options.constraints ?? []),
      ],
      deliverables:
        options.deliverables ??
        [
          "local_inbox_packet",
          "broker_receipt",
          "codex_dry_run_preview",
          "operator_review_notes",
        ],
      command_source: intent,
      license_policy: {
        requested_license: "MIT",
        repo_license_file_present: false,
        assertion: "intent_only_until_license_file_exists",
      },
    },
    response_expected: {
      format: "packet_and_dry_run_preview",
      within_lane: "local_file_bus_only",
      max_turns: 1,
    },
    human_approval_required: false,
    timestamp: iso(options),
    ttl_seconds: 900,
    status: "PENDING",
    safe_execution_v3: {
      mode: "full_auto_yolo_safe_execution",
      blocked_action_behavior: "auto_block_and_continue",
    },
  };
}

export function buildCommandInboxPacket(
  intent: CommandIntent,
  options: CommandIntentOptions
): Omit<A2APacket, "id" | "created_at"> & { id?: string; created_at?: string } {
  const message = buildCommandMessage(intent, options);
  const canonicalBrainstorm = intent === "brainstorm" ? "; brainstorm_canonical=true" : "";

  const packet: Omit<A2APacket, "id" | "created_at"> & { id?: string; created_at?: string } = {
    project: "sirinx-hermes-a2a-codex-sync",
    priority: intent === "goal" ? "P0" : "P1",
    title: `Hermes A2A Codex ${intent} command`,
    agent: "hermes",
    status: "inbox",
    risk: "safe",
    input: options.files ?? [],
    output: [],
    approval_required: false,
    created_at: iso(options),
    a2a2a_message: message as unknown as Record<string, unknown>,
    notes:
      "dry_run=true; runtime_queue_execution=false; provider_call=false; external_message_send=false; " +
      "deploy=false; push=false; secret_read=false; requested_license=MIT; " +
      "license_assertion=intent_only_until_license_file_exists" +
      canonicalBrainstorm,
  };
  if (options.packetId !== undefined) {
    packet.id = options.packetId;
  }
  return packet;
}

export async function writeCommandInboxPacket(
  intent: CommandIntent,
  options: CommandIntentOptions
): Promise<A2APacket> {
  return writePacket(buildCommandInboxPacket(intent, options), {
    projectRoot: options.projectRoot,
  });
}
