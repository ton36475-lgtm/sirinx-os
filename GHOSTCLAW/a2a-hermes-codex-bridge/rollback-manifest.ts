/**
 * Rollback / Simulation Manifest utilities.
 * Every blocked or simulated mutation must leave a reproducible manifest.
 */
import { createHash, randomUUID } from "crypto";
import type { A2AMessage, Receipt } from "./a2a-message.js";

export interface RollbackManifest {
  schema: "ghostclaw.rollback_manifest.v3_2";
  manifest_id: string;
  correlation_id: string;
  mission_id: string;
  created_at: string;
  simulation_only: boolean;
  target_files: string[];
  snapshots: Record<string, string>; // path -> sha256 of original content (empty if new file)
  planned_actions: string[];
  rollback_commands: string[];
  reason: string;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function generateRollbackManifest(
  msg: A2AMessage,
  receipt: Receipt,
  originalContents: Record<string, string> = {}
): RollbackManifest {
  const files = msg.context.files ?? [];
  const snapshots: Record<string, string> = {};
  for (const file of files) {
    snapshots[file] = originalContents[file] ? sha256(originalContents[file]) : "0000000000000000000000000000000000000000000000000000000000000000";
  }

  return {
    schema: "ghostclaw.rollback_manifest.v3_2",
    manifest_id: `RM-${randomUUID().slice(0, 8)}`,
    correlation_id: msg.correlation_id,
    mission_id: msg.mission_id,
    created_at: new Date().toISOString(),
    simulation_only: !receipt.decision_status.startsWith("allowed"),
    target_files: files,
    snapshots,
    planned_actions: [msg.action_requested],
    rollback_commands: files.map((file) => `git checkout -- ${file}`),
    reason: receipt.reason,
  };
}
