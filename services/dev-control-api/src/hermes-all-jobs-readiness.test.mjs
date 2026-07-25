import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { A2A2A_STATUS_PATHS } from "./a2a2a-status-surface.mjs";
import {
  HERMES_ALL_JOBS_READY_CONFIG_PATH,
  formatHermesAllJobsReadinessMessage,
  getHermesAllJobsReadiness
} from "./hermes-all-jobs-readiness.mjs";

const fixedNow = () => new Date("2026-07-03T03:00:00.000Z");

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function seedAllJobsConfig(root) {
  await writeJson(root, HERMES_ALL_JOBS_READY_CONFIG_PATH, {
    status: "local_safe_all_jobs_ready",
    mode: "route_preview_validate_receipt_only",
    config_id: "HERMES-ALL-JOBS-READY-TEST",
    controlPlane: "Hermes",
    sourceOfTruth: "local_repo",
    defaultBehavior: {
      dryRun: true,
      liveSend: false,
      providerCall: false,
      repoContentExternalSend: false,
      customerDataRouting: false,
      install: false,
      push: false,
      deploy: false,
      cloudMutation: false,
      secretRead: false,
      keyValuePrint: false
    },
    commands: {
      accepted: ["/commands", "/status", "/hermes all jobs ready"],
      callbackCommands: ["cmd:status", "cmd:hermes-all-jobs-ready"]
    },
    lanes: [
      { id: "hermes_control_plane", owner: "Hermes", status: "ready", mode: "route", canMutateSource: false },
      { id: "codex_local_builder", owner: "Codex", status: "ready", mode: "local", canMutateSource: true },
      { id: "cloudflare_r2_gate_preview", owner: "Policy", status: "gated", mode: "preview", canMutateSource: false }
    ],
    exactGates: {
      telegramLiveSend: "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE",
      openRouterFable5ProviderCall: "APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE",
      cloudflareR2Write: "APPROVE_CLOUDFLARE_R2_WRITE_A2A2A_A019E53EE",
      install: "APPROVE_INSTALL_EXACT_PACKAGE_A019E53EE",
      push: "APPROVE_GIT_PUSH_EXACT_BRANCH_A019E53EE",
      deploy: "APPROVE_DEPLOY_EXACT_TARGET_A019E53EE"
    },
    blockedActions: {
      liveTelegramSend: true,
      keyValuePrint: true,
      secretRead: true,
      install: true,
      push: true,
      deploy: true,
      cloudMutation: true,
      providerCallByDefault: true
    },
    obsidianBrainSync: {
      vault: "/Users/sirinx/Documents/Obsidian Vault/SIRINX",
      digestNote: "/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md",
      writePolicy: "append_concise_pulse_only_no_secrets_no_raw_logs"
    },
    nextSafeAction: "Inspect readiness."
  });
}

async function seedA2A2A(root) {
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
    approval_matches: true,
    summary: { workers_used: [] }
  });
  await writeJson(root, A2A2A_STATUS_PATHS.p004Execute, {
    status: "local_worker_packets_dispatched",
    required_approval: "APPROVE_A2A2A_P003_LOCAL_WORKER_PACKET_DISPATCH_ONLY_A019E53EE",
    approval_matches: true,
    execute_requested: true,
    summary: {
      planned_worker_packets: 10,
      worker_packets_written: 10,
      safe_local_dispatch_candidates: 5,
      workers_started: [],
      workers_used: []
    },
    planned_writes: []
  });
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

describe("Hermes all jobs readiness", () => {
  it("reports local-safe readiness with all external actions closed", async () => {
    const root = mkdtempSync(join(tmpdir(), "hermes-all-jobs-"));
    await seedAllJobsConfig(root);
    await seedA2A2A(root);

    const surface = await getHermesAllJobsReadiness({
      root,
      envPath: "/tmp/sirinx-hermes-all-jobs-missing-env",
      now: fixedNow
    });

    expect(surface.status).toBe("hermes-all-jobs-ready-local-safe");
    expect(surface.localSafeReady).toBe(true);
    expect(surface.failedChecks).toEqual([]);
    expect(surface.guardrails.liveTelegramSend).toBe(false);
    expect(surface.guardrails.providerCall).toBe(false);
    expect(surface.guardrails.keyValuePrint).toBe(false);
    expect(surface.externalRequests.telegramLiveSend.requested).toBe(false);
    expect(surface.telegramGateway.acceptedCommands).toContain("/hermes all jobs ready");
  });

  it("treats liveSend true as an exact-gate request, not live execution", async () => {
    const root = mkdtempSync(join(tmpdir(), "hermes-all-jobs-"));
    await seedAllJobsConfig(root);
    await seedA2A2A(root);

    const surface = await getHermesAllJobsReadiness({
      root,
      envPath: "/tmp/sirinx-hermes-all-jobs-missing-env",
      liveSendRequested: true,
      now: fixedNow
    });
    const message = formatHermesAllJobsReadinessMessage(surface);

    expect(surface.status).toBe("hermes-all-jobs-ready-local-safe-external-request-gated");
    expect(surface.externalRequests.telegramLiveSend.status).toBe("exact_gate_required");
    expect(surface.externalRequests.telegramLiveSend.requiredApproval).toBe(
      "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE"
    );
    expect(surface.externalRequests.telegramLiveSend.canSendNow).toBe(false);
    expect(surface.liveGate.liveExecutionApproved).toBe(false);
    expect(message).toContain("Telegram liveSend requested: yes");
    expect(message).toContain("Telegram liveSend can send now: no");
  });
});
