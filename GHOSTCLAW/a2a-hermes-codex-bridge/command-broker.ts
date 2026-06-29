/**
 * Command Broker: deny-first gateway for A2A2A actions.
 * No real shell execution. Returns a BrokerVerdict + Receipt.
 */
import { createHash, randomUUID } from "crypto";
import type { A2AMessage, ActionClass, AgentRole, BrokerVerdict, Receipt, Tier } from "./a2a-message.js";
import { classifyMessage, resolveActionClass } from "./tier-resolver.js";

export const HARD_DENY_ACTIONS = new Set([
  "jailbreak_execution",
  "policy_bypass_execution",
  "secret_access",
  "credential_dump",
  "recursive_codex_launch",
  "recursive_moa_launch",
  "kv_only_protocol",
  "ambiguous_instruction_execution",
]);

export const FORBIDDEN_PATH_PREFIXES = [
  ".env",
  ".env.",
  ".git/",
  "~/.ssh/",
  "~/.aws/",
  "~/.config/",
  "production/",
  "deploy/",
  "secrets/",
];

export const ALLOWED_MUTATION_PREFIXES = ["GHOSTCLAW/", "docs/", "tests/", ".ghostclaw_runtime/"];

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function pathIsInScope(files: string[] = []): { ok: boolean; reason?: string } {
  for (const file of files) {
    const normalized = file.startsWith("/") ? file.slice(1) : file;
    if (FORBIDDEN_PATH_PREFIXES.some((p) => normalized.startsWith(p) || normalized === ".env")) {
      return { ok: false, reason: `forbidden_path:${normalized}` };
    }
    if (!ALLOWED_MUTATION_PREFIXES.some((p) => normalized.startsWith(p))) {
      return { ok: false, reason: `out_of_lane_path:${normalized}` };
    }
  }
  return { ok: true };
}

export interface BrokerOptions {
  requesterOverride?: AgentRole;
}

export function evaluateCommand(
  msg: A2AMessage,
  _opts: BrokerOptions = {}
): { verdict: BrokerVerdict; receipt: Receipt } {
  const actionClass = resolveActionClass(msg.action_requested);
  const tierRule = classifyMessage(msg);
  const decisionId = `D-${randomUUID().slice(0, 8)}`;

  // 1. Hard deny
  if (HARD_DENY_ACTIONS.has(msg.action_requested)) {
    const verdict: BrokerVerdict = {
      allowed: false,
      tier: "X",
      reason: `hard_deny:${msg.action_requested}`,
      safeReplacement: "policy_bypass_attempt_classification",
      receiptRequired: true,
    };
    return { verdict, receipt: buildReceipt(msg, verdict, actionClass, "X", decisionId) };
  }

  // 2. Path scope check for writes
  if (actionClass === "WRITE_LANE" || actionClass === "INTEGRATE") {
    const scope = pathIsInScope(msg.context.files ?? []);
    if (!scope.ok) {
      const verdict: BrokerVerdict = {
        allowed: false,
        tier: "X",
        reason: scope.reason!,
        safeReplacement: "dry_run_diff",
        receiptRequired: true,
      };
      return { verdict, receipt: buildReceipt(msg, verdict, actionClass, "X", decisionId) };
    }
  }

  // 3. Tier resolution
  if (tierRule.behavior === "auto_execute") {
    const verdict: BrokerVerdict = {
      allowed: true,
      tier: tierRule.tier,
      reason: `auto_execute:${tierRule.tier}:${actionClass}`,
      receiptRequired: true,
    };
    return { verdict, receipt: buildReceipt(msg, verdict, actionClass, tierRule.tier, decisionId) };
  }

  if (tierRule.behavior === "agent_quorum_required") {
    const verdict: BrokerVerdict = {
      allowed: false,
      tier: tierRule.tier,
      reason: `quorum_required:${tierRule.tier}:${actionClass}`,
      safeReplacement: "agent_quorum_or_dry_run",
      receiptRequired: true,
    };
    return { verdict, receipt: buildReceipt(msg, verdict, actionClass, tierRule.tier, decisionId) };
  }

  if (tierRule.behavior === "auto_block_and_simulate") {
    const verdict: BrokerVerdict = {
      allowed: false,
      tier: tierRule.tier,
      reason: `auto_block_and_simulate:${tierRule.tier}:${actionClass}`,
      safeReplacement: tierRule.tier === "D" ? "lockfile_analysis" : "staging_dry_run",
      receiptRequired: true,
    };
    return { verdict, receipt: buildReceipt(msg, verdict, actionClass, tierRule.tier, decisionId) };
  }

  // hard_block default
  const verdict: BrokerVerdict = {
    allowed: false,
    tier: "X",
    reason: `hard_block:${actionClass}`,
    safeReplacement: "staging_dry_run",
    receiptRequired: true,
  };
  return { verdict, receipt: buildReceipt(msg, verdict, actionClass, "X", decisionId) };
}

function buildReceipt(
  msg: A2AMessage,
  verdict: BrokerVerdict,
  actionClass: ActionClass,
  tier: Tier,
  decisionId: string
): Receipt {
  const status = verdict.allowed
    ? "allowed"
    : verdict.tier === "C"
      ? "quorum_required"
      : "simulated";

  return {
    schema: "ghostclaw.receipt.v3_2",
    decision_id: decisionId,
    correlation_id: msg.correlation_id,
    mission_id: msg.mission_id,
    requester_agent: msg.from.agent,
    approver_agent: msg.to.agent,
    action_class: actionClass,
    final_tier: tier,
    decision_status: status,
    reason: verdict.reason,
    evidence_pack: {
      action_requested: msg.action_requested,
      lane: msg.context.lane,
      files: msg.context.files,
      safe_replacement: verdict.safeReplacement,
    },
    safe_replacement_action: verdict.safeReplacement,
    timestamp: new Date().toISOString(),
    checksums: {
      context_goal_sha256: sha256(msg.context.goal),
      action_requested_sha256: sha256(msg.action_requested),
    },
  };
}
