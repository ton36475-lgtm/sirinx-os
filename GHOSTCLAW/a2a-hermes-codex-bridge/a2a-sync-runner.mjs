/**
 * A2A Sync Runner — processes all inbox packets through the bridge.
 *
 * This is the live "Codex Captain" sidecar entry point:
 *   1. Read every packet from _A2A_QUEUE/inbox/
 *   2. Evaluate each through the command broker (deny-first tier resolver)
 *   3. For Tier A/B allowed: write outbox packet with receipt
 *   4. For Tier C/D/X blocked: write simulation manifest + blocked packet
 *   5. Produce a summary status report
 *
 * Safety invariants enforced by the bridge:
 *   - No real shell execution
 *   - No .env / secret path access
 *   - No production deploy / generic push auto-approval
 *   - Deny rules always outrank bypass
 *   - Every decision produces a receipt with checksums
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { evaluateCommand } from "./command-broker.ts";
import { writePacket } from "./packet-bus.ts";
import { writeSimulationManifest, zeroHash } from "./manifest-store.ts";

const PROJECT_ROOT = process.cwd();
const INBOX_DIR = join(PROJECT_ROOT, "_A2A_QUEUE", "inbox");
const STATUS_REPORT_PATH = join(PROJECT_ROOT, ".ghostclaw_runtime", "a2a-sync-status.json");

async function processInbox() {
  const entries = await readdir(INBOX_DIR).catch(() => []);
  const jsonFiles = entries.filter(f => f.endsWith(".json"));

  const results = [];
  let allowed = 0;
  let blocked = 0;
  let quorum = 0;

  for (const file of jsonFiles) {
    const raw = await readFile(join(INBOX_DIR, file), "utf8");
    const packet = JSON.parse(raw);

    // Extract the A2A2A message from the packet
    const msg = packet.a2a2a_message;
    if (!msg) {
      results.push({ file, status: "skipped", reason: "no a2a2a_message" });
      continue;
    }

    // Evaluate through the command broker
    const { verdict, receipt } = evaluateCommand(msg);

    // Build the outbox packet
    const outboxPacket = await writePacket({
      project: packet.project || "ghostclaw-a2a2a",
      priority: packet.priority || "P1",
      title: `a2a-sync:${msg.action_requested}:${receipt.decision_id}`,
      agent: "codex",
      status: "outbox",
      risk: verdict.tier === "A" || verdict.tier === "B" ? "safe" : verdict.tier === "C" ? "medium" : "critical",
      input: msg.context.files ?? [],
      output: [],
      approval_required: !verdict.allowed,
      a2a2a_message: msg,
      receipt: receipt,
      notes: `tier=${verdict.tier}; reason=${verdict.reason}; sync_run=${new Date().toISOString()}`,
    }, { projectRoot: PROJECT_ROOT });

    // For blocked actions, also write a simulation manifest
    let manifestId = undefined;
    if (!verdict.allowed) {
      const snapshots = {};
      for (const f of msg.context.files ?? []) {
        snapshots[f] = zeroHash();
      }
      const manifest = await writeSimulationManifest({
        correlation_id: msg.correlation_id,
        mission_id: msg.mission_id,
        simulation_only: true,
        action_requested: msg.action_requested,
        action_class: receipt.action_class,
        final_tier: receipt.final_tier,
        reason: verdict.reason,
        safe_replacement_action: verdict.safeReplacement,
        target_files: msg.context.files ?? [],
        snapshots,
        rollback_commands: (msg.context.files ?? []).map(f => `git checkout -- ${f}`),
        notes: "A2A sync runner: blocked by policy tier.",
      }, { projectRoot: PROJECT_ROOT });
      manifestId = manifest.manifest_id;
    }

    if (verdict.allowed) {
      allowed++;
    } else if (verdict.tier === "C") {
      quorum++;
    } else {
      blocked++;
    }

    results.push({
      file,
      packet_id: outboxPacket.id,
      action: msg.action_requested,
      tier: verdict.tier,
      decision: verdict.allowed ? "ALLOWED" : verdict.tier === "C" ? "QUORUM_REQUIRED" : "BLOCKED",
      reason: verdict.reason,
      manifest_id: manifestId,
      decision_id: receipt.decision_id,
      mission_id: msg.mission_id,
      correlation_id: msg.correlation_id,
    });
  }

  const report = {
    sync_run_id: `SYNC-${randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    project_root: PROJECT_ROOT,
    inbox_count: jsonFiles.length,
    allowed,
    blocked,
    quorum_required: quorum,
    results,
  };

  await mkdir(join(PROJECT_ROOT, ".ghostclaw_runtime"), { recursive: true });
  await writeFile(STATUS_REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  return report;
}

// Execute
processInbox().then(report => {
  console.log("=".repeat(60));
  console.log("A2A SYNC RUNNER — Codex Captain Sidecar");
  console.log("=".repeat(60));
  console.log(`Sync Run:   ${report.sync_run_id}`);
  console.log(`Timestamp:  ${report.timestamp}`);
  console.log(`Inbox pkts: ${report.inbox_count}`);
  console.log(`Allowed:    ${report.allowed} (Tier A/B)`);
  console.log(`Quorum:     ${report.quorum_required} (Tier C)`);
  console.log(`Blocked:    ${report.blocked} (Tier D/X)`);
  console.log("-".repeat(60));
  for (const r of report.results) {
    const icon = r.decision === "ALLOWED" ? "✅" : r.decision === "QUORUM_REQUIRED" ? "🟡" : "🚫";
    console.log(`  ${icon} [${r.tier}] ${r.action} — ${r.decision}`);
    console.log(`     file: ${r.file}`);
    console.log(`     reason: ${r.reason}`);
    if (r.manifest_id) console.log(`     manifest: ${r.manifest_id}`);
    console.log(`     decision_id: ${r.decision_id}`);
  }
  console.log("-".repeat(60));
  console.log(`Status report: ${STATUS_REPORT_PATH}`);
  console.log("=".repeat(60));
}).catch(err => {
  console.error("A2A SYNC RUNNER FAILED:", err);
  process.exit(1);
});