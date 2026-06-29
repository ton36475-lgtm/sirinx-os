/**
 * A2A Hermes ↔ Codex Sync Bridge v2
 * GHOSTCLAW FULL_AUTO_BOUNDED_YOLO_CODING_TEAM
 *
 * Safe TypeScript contract for agent-to-agent messages, tier resolution,
 * command broker simulation, and receipt generation.
 */

export type AgentRole =
  | "hermes-commander"
  | "opus-architect"
  | "codex-captain"
  | "glm-worker"
  | "deepseek-worker"
  | "kob-validator"
  | "command-broker"
  | "human-operator";

export type ActionClass =
  | "READ"
  | "PLAN"
  | "WRITE_LANE"
  | "INTEGRATE"
  | "VALIDATE"
  | "COMMIT"
  | "PUSH"
  | "DEPLOY"
  | "EXTERNAL"
  | "DESTROY";

export type Tier = "A" | "B" | "C" | "D" | "X";

export type MessageStatus =
  | "PENDING"
  | "ROUTED"
  | "PROCESSING"
  | "ACTION_PENDING"
  | "ACTION_EXECUTING"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "CANCELLED";

export interface A2AContext {
  goal: string;
  constraints?: string[];
  lane?: string;
  files?: string[];
  depends_on?: string[];
}

export interface A2AMessage {
  a2a2a_version: "2.0";
  mission_id: string;
  correlation_id: string;
  brainstorm_id?: string;
  phase?: string;
  from: { agent: AgentRole; role: string };
  to: { agent: AgentRole; role: string };
  action_requested: string;
  context: A2AContext;
  response_expected?: {
    format?: string;
    within_lane?: string;
    max_turns?: number;
  };
  human_approval_required: boolean;
  timestamp: string;
  ttl_seconds: number;
  status: MessageStatus;
  safe_execution_v3?: {
    mode: "full_auto_yolo_safe_execution";
    blocked_action_behavior: "auto_block_and_continue" | "hard_block_and_simulate";
  };
}

export interface TierRule {
  tier: Tier;
  actionClass: ActionClass;
  behavior: "auto_execute" | "agent_quorum_required" | "auto_block_and_simulate" | "hard_block_and_simulate";
  humanRequired: boolean;
  examples: string[];
}

export interface BrokerVerdict {
  allowed: boolean;
  tier: Tier;
  reason: string;
  safeReplacement?: string;
  receiptRequired: boolean;
}

export interface Receipt {
  schema: "ghostclaw.receipt.v3_2";
  decision_id: string;
  correlation_id: string;
  mission_id: string;
  requester_agent: AgentRole;
  approver_agent: AgentRole;
  action_class: ActionClass;
  final_tier: Tier;
  decision_status: "allowed" | "blocked" | "simulated" | "quorum_required";
  reason: string;
  evidence_pack: Record<string, unknown>;
  safe_replacement_action?: string | undefined;
  timestamp: string;
  checksums: Record<string, string>;
}
