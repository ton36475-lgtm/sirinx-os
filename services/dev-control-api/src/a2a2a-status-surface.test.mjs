import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  A2A2A_STATUS_PATHS,
  formatA2A2ACompletionAuditMessage,
  formatA2A2AExecuteCommandPreviewMessage,
  formatA2A2ADispatchPreviewMessage,
  formatA2A2AExecuteReadinessMessage,
  formatA2A2AGateCheckMessage,
  formatA2A2ALiveGateReadinessMessage,
  formatA2A2AStatusMessage,
  getA2A2ACompletionAuditSurface,
  getA2A2AExecuteCommandPreviewSurface,
  getA2A2ADispatchPreviewSurface,
  getA2A2AExecuteReadinessSurface,
  getA2A2AGateCheckSurface,
  getA2A2ALiveGateReadinessSurface,
  getA2A2AStatusSurface
} from "./a2a2a-status-surface.mjs";

const fixedNow = () => new Date("2026-07-03T02:20:00.000Z");

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function seedStatusFiles(root) {
  await writeJson(root, A2A2A_STATUS_PATHS.p002Plan, {
    status: "ready_for_safe_local_review_not_live_dispatch",
    summary: {
      safe_local_dispatch_candidates: 5,
      approval_gated_candidates: 33,
      workers_used: []
    }
  });
  await writeJson(root, A2A2A_STATUS_PATHS.p003Gate, {
    status: "awaiting_exact_local_dispatch_gate",
    required_approval: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE",
    approval_matches: false,
    summary: { workers_used: [] }
  });
  await writeJson(root, A2A2A_STATUS_PATHS.p004Execute, {
    status: "blocked_missing_or_invalid_exact_gate",
    required_approval: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE",
    approval_matches: false,
    execute_requested: false,
    summary: {
      planned_worker_packets: 10,
      workers_started: [],
      workers_used: []
    },
    planned_writes: [
      {
        path: ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json",
        queue_packet_id: "packet_041",
        target: "hermes"
      },
      {
        path: ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_041_kob.json",
        queue_packet_id: "packet_041",
        target: "kob"
      }
    ]
  });
  await writeJson(root, A2A2A_STATUS_PATHS.telegramConfig, {
    status: "local_safe_config_ready",
    mode: "dry_run_first",
    gateway: {
      defaultLiveSend: false,
      webhook: { enabled: false },
      polling: { enabled: false }
    },
    credentials: {
      storeValuesInRepo: false,
      printValues: false
    },
    routing: { queuePayloadExecution: false },
    gates: {
      liveSend: {
        status: "closed",
        requiredApproval: "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE",
        requiresRecipientEvidence: true,
        requiresTokenPresenceOnlyCheck: true
      },
      webhookActivation: {
        status: "closed",
        requiredApproval: "APPROVE_TELEGRAM_GATEWAY_WEBHOOK_ACTIVATION_A019E53EE"
      },
      runtimeRestart: {
        status: "closed",
        requiredApproval: "APPROVE_HERMES_GATEWAY_RESTART_A019E53EE"
      }
    }
  });
}

async function seedP004ExactGateReady(root) {
  await writeJson(root, A2A2A_STATUS_PATHS.p004Execute, {
    status: "ready_for_execute_flag_after_exact_gate",
    required_approval: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE",
    approval_matches: true,
    dry_run: false,
    execute_requested: false,
    summary: {
      planned_worker_packets: 10,
      safe_local_dispatch_candidates: 5,
      workers_started: [],
      workers_used: []
    },
    planned_writes: [
      {
        path: ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json",
        queue_packet_id: "packet_041",
        target: "hermes"
      },
      {
        path: ".ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_041_kob.json",
        queue_packet_id: "packet_041",
        target: "kob"
      }
    ]
  });
}

async function seedP004Dispatched(root) {
  await writeJson(root, A2A2A_STATUS_PATHS.p004Execute, {
    status: "local_worker_packets_dispatched",
    required_approval: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE",
    approval_matches: true,
    dry_run: false,
    execute_requested: true,
    summary: {
      planned_worker_packets: 10,
      worker_packets_written: 10,
      safe_local_dispatch_candidates: 5,
      workers_started: [],
      workers_used: []
    },
    planned_writes: [
      {
        path: ".ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes.json",
        queue_packet_id: "packet_041",
        target: "hermes"
      }
    ]
  });
}

async function seedP014Ack(root) {
  await writeJson(root, A2A2A_STATUS_PATHS.p014Ack, {
    status: "pass_targeted_local_worker_ack_receipts_written",
    total_ack_receipts_written: 20,
    bus_ack_receipts: 10,
    hermes_route_receipts: 5,
    kob_verdict_receipts: 5,
    payload_execution: false,
    provider_call: false,
    secret_read: false
  });
}

describe("A2A2A status surface", () => {
  it("summarizes P002-P004 and keeps all live gates closed", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const surface = await getA2A2AStatusSurface({ root, now: fixedNow });

    expect(surface.status).toBe("a2a2a-awaiting-exact-local-dispatch-gate");
    expect(surface.packets.p002.safeLocalDispatchCandidates).toBe(5);
    expect(surface.packets.p004.plannedWorkerPackets).toBe(10);
    expect(surface.guardrails.readOnly).toBe(true);
    expect(surface.guardrails.workerPacketWrite).toBe(false);
    expect(surface.guardrails.providerCall).toBe(false);
    expect(surface.guardrails.secretRead).toBe(false);
    expect(surface.acknowledgement.status).toBe("missing");
    expect(surface.acknowledgement.totalAckReceiptsWritten).toBe(0);
    expect(surface.telegramGateway.defaultLiveSend).toBe(false);
    expect(surface.nextGate).toBe("APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE");
  });

  it("recognizes stored P004 exact-gate readiness without opening worker writes", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);
    await seedP004ExactGateReady(root);

    const surface = await getA2A2AStatusSurface({ root, now: fixedNow });
    const message = formatA2A2AStatusMessage(surface);

    expect(surface.status).toBe("a2a2a-exact-gate-ready-execute-still-closed");
    expect(surface.packets.p004.approvalMatches).toBe(true);
    expect(surface.packets.p004.executeRequested).toBe(false);
    expect(surface.packets.p004.workerPacketsWritten).toBe(0);
    expect(surface.guardrails.workerPacketWrite).toBe(false);
    expect(message).toContain("P004 executor: ready_for_execute_flag_after_exact_gate");
  });

  it("blocks repeat execute command preview after worker packets are dispatched", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);
    await seedP004Dispatched(root);

    const surface = await getA2A2AStatusSurface({ root, now: fixedNow });
    const readiness = await getA2A2AExecuteReadinessSurface({
      root,
      now: fixedNow,
      gateText: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"
    });
    const preview = await getA2A2AExecuteCommandPreviewSurface({
      root,
      now: fixedNow,
      gateText: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"
    });

    expect(surface.status).toBe("a2a2a-local-worker-packets-dispatched");
    expect(surface.packets.p004.workerPacketsWritten).toBe(10);
    expect(readiness.readyForExecute).toBe(false);
    expect(readiness.failedChecks).toContain("p004_not_already_dispatched");
    expect(preview.status).toBe("a2a2a-execute-command-preview-blocked");
    expect(preview.commandPreviewReady).toBe(false);
    expect(preview.command).toEqual([]);
  });

  it("summarizes targeted P014 acknowledgement receipts when present", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);
    await seedP004Dispatched(root);
    await seedP014Ack(root);

    const surface = await getA2A2AStatusSurface({ root, now: fixedNow });
    const message = formatA2A2AStatusMessage(surface);

    expect(surface.acknowledgement.status).toBe("pass_targeted_local_worker_ack_receipts_written");
    expect(surface.acknowledgement.totalAckReceiptsWritten).toBe(20);
    expect(surface.acknowledgement.payloadExecution).toBe(false);
    expect(surface.acknowledgement.providerCall).toBe(false);
    expect(surface.acknowledgement.secretRead).toBe(false);
    expect(message).toContain("Ack receipts: 20");
    expect(message).toContain("Ack status: pass_targeted_local_worker_ack_receipts_written");
  });

  it("passes local-safe completion audit when dispatch and targeted ack are complete", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);
    await seedP004Dispatched(root);
    await seedP014Ack(root);

    const audit = await getA2A2ACompletionAuditSurface({ root, now: fixedNow });
    const message = formatA2A2ACompletionAuditMessage(audit);

    expect(audit.status).toBe("a2a2a-local-safe-completion-pass");
    expect(audit.localSafeComplete).toBe(true);
    expect(audit.workerPacketsWritten).toBe(10);
    expect(audit.acknowledgement.totalAckReceiptsWritten).toBe(20);
    expect(audit.repeatExecutePreviewStatus).toBe("a2a2a-execute-command-preview-blocked");
    expect(audit.failedChecks).toEqual([]);
    expect(audit.guardrails.liveTelegramSend).toBe(false);
    expect(audit.guardrails.providerCall).toBe(false);
    expect(audit.guardrails.secretRead).toBe(false);
    expect(message).toContain("GhostClaw A2A2A Completion Audit");
    expect(message).toContain("Local-safe complete: yes");
    expect(message).toContain("Blocked checks: none");
  });

  it("reports live gate readiness after local-safe completion while execution stays closed", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);
    await seedP004Dispatched(root);
    await seedP014Ack(root);

    const readiness = await getA2A2ALiveGateReadinessSurface({ root, now: fixedNow });
    const message = formatA2A2ALiveGateReadinessMessage(readiness);

    expect(readiness.status).toBe("a2a2a-live-gate-ready-for-exact-approval-execution-closed");
    expect(readiness.readyForExactGateRequest).toBe(true);
    expect(readiness.liveExecutionApproved).toBe(false);
    expect(readiness.localSafeComplete).toBe(true);
    expect(readiness.exactGates.liveSend.status).toBe("closed");
    expect(readiness.exactGates.liveSend.requiredApproval).toBe("APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE");
    expect(readiness.failedChecks).toEqual([]);
    expect(readiness.guardrails.liveTelegramSend).toBe(false);
    expect(readiness.guardrails.webhookActivation).toBe(false);
    expect(readiness.guardrails.secretRead).toBe(false);
    expect(message).toContain("GhostClaw A2A2A Live Gate Readiness");
    expect(message).toContain("Live execution approved: no");
    expect(message).toContain("Blocked checks: none");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("formats a Telegram-safe preview message", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const message = formatA2A2AStatusMessage(await getA2A2AStatusSurface({ root, now: fixedNow }));

    expect(message).toContain("GhostClaw A2A2A Status");
    expect(message).toContain("Safe candidates: 5");
    expect(message).toContain("Planned worker packets: 10");
    expect(message).toContain("Live send, webhook, polling");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("builds a dispatch preview without enabling writes", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const preview = await getA2A2ADispatchPreviewSurface({ root, now: fixedNow });
    const message = formatA2A2ADispatchPreviewMessage(preview);

    expect(preview.status).toBe("a2a2a-local-dispatch-preview-only");
    expect(preview.plannedWrites).toHaveLength(2);
    expect(preview.guardrails.workerPacketWrite).toBe(false);
    expect(preview.guardrails.queuePayloadExecution).toBe(false);
    expect(preview.guardrails.liveTelegramSend).toBe(false);
    expect(preview.requiredApproval).toBe("APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE");
    expect(message).toContain("GhostClaw A2A2A Dispatch Preview");
    expect(message).toContain("packet_041 -> hermes");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("checks missing gate text without enabling writes or echoing input", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const gate = await getA2A2AGateCheckSurface({ root, now: fixedNow });
    const message = formatA2A2AGateCheckMessage(gate);

    expect(gate.status).toBe("a2a2a-gate-check-missing-approval");
    expect(gate.approvalProvided).toBe(false);
    expect(gate.approvalMatches).toBe(false);
    expect(gate.providedGateEchoed).toBe(false);
    expect(gate.executeRequested).toBe(false);
    expect(gate.guardrails.workerPacketWrite).toBe(false);
    expect(message).toContain("GhostClaw A2A2A Gate Check");
    expect(message).toContain("Approval matched: no");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("accepts only the exact gate and still keeps execute closed", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const gate = await getA2A2AGateCheckSurface({
      root,
      now: fixedNow,
      gateText: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"
    });
    const message = formatA2A2AGateCheckMessage(gate);

    expect(gate.status).toBe("a2a2a-gate-check-match-execute-still-closed");
    expect(gate.approvalProvided).toBe(true);
    expect(gate.approvalMatches).toBe(true);
    expect(gate.executeStillRequired).toBe(true);
    expect(gate.workerPacketWrite).toBe(false);
    expect(gate.guardrails.queuePayloadExecution).toBe(false);
    expect(message).toContain("Exact gate matches");
    expect(message).toContain("Execute requested: no");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("reports stored P004 approval evidence but still requires command gate text", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);
    await seedP004ExactGateReady(root);

    const gate = await getA2A2AGateCheckSurface({ root, now: fixedNow });
    const readiness = await getA2A2AExecuteReadinessSurface({ root, now: fixedNow });

    expect(gate.status).toBe("a2a2a-gate-check-missing-approval");
    expect(gate.approvalProvided).toBe(false);
    expect(gate.storedApprovalMatches).toBe(true);
    expect(gate.approvalSource).toBe("none");
    expect(gate.providedGateEchoed).toBe(false);
    expect(readiness.approvalMatches).toBe(false);
    expect(readiness.readyForExecute).toBe(false);
    expect(readiness.failedChecks).toContain("p003_exact_gate_matches");
    expect(readiness.failedChecks).toContain("p004_execute_requested");
  });

  it("reports execute readiness as blocked until exact gate and execute mode exist", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const readiness = await getA2A2AExecuteReadinessSurface({ root, now: fixedNow });
    const message = formatA2A2AExecuteReadinessMessage(readiness);

    expect(readiness.status).toBe("a2a2a-execute-readiness-blocked");
    expect(readiness.readyForExecute).toBe(false);
    expect(readiness.failedChecks).toContain("p003_exact_gate_matches");
    expect(readiness.failedChecks).toContain("p004_execute_requested");
    expect(readiness.guardrails.workerPacketWrite).toBe(false);
    expect(message).toContain("Ready for P004 execute: no");
    expect(message).toContain("BLOCK p003_exact_gate_matches");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("can verify exact gate readiness while still requiring execute mode", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const readiness = await getA2A2AExecuteReadinessSurface({
      root,
      now: fixedNow,
      gateText: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"
    });

    expect(readiness.approvalMatches).toBe(true);
    expect(readiness.readyForExecute).toBe(false);
    expect(readiness.failedChecks).not.toContain("p003_exact_gate_matches");
    expect(readiness.failedChecks).toContain("p004_execute_requested");
    expect(readiness.guardrails.queuePayloadExecution).toBe(false);
  });

  it("previews the exact local execute command without running it", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const preview = await getA2A2AExecuteCommandPreviewSurface({
      root,
      now: fixedNow,
      gateText: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE"
    });
    const message = formatA2A2AExecuteCommandPreviewMessage(preview);

    expect(preview.status).toBe("a2a2a-execute-command-preview-ready-no-execution");
    expect(preview.commandPreviewReady).toBe(true);
    expect(preview.commandExecuted).toBe(false);
    expect(preview.workerPacketWrite).toBe(false);
    expect(preview.command).toEqual([
      "python3",
      "scripts/ghostclaw_a2a_local_dispatch_execute.py",
      "--approval",
      "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE",
      "--execute",
      "--write"
    ]);
    expect(message).toContain("Local command:");
    expect(message).toContain("does not run the command");
    expect(message).not.toMatch(/bot[0-9]+:[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/);
  });

  it("blocks command preview when the exact gate is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "a2a2a-status-"));
    await seedStatusFiles(root);

    const preview = await getA2A2AExecuteCommandPreviewSurface({ root, now: fixedNow });

    expect(preview.status).toBe("a2a2a-execute-command-preview-blocked");
    expect(preview.commandPreviewReady).toBe(false);
    expect(preview.command).toEqual([]);
    expect(preview.commandText).toBe(null);
    expect(preview.workerPacketWrite).toBe(false);
  });
});
