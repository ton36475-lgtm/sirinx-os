import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTelegramErrorLoopReadiness } from "./ghostclaw_telegram_error_loop_readiness.mjs";

const falseGuardrails = {
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

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(root, relativePath, content) {
  const path = join(root, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "ghostclaw-readiness-"));
  await writeJson(root, "package.json", {
    scripts: {
      "telegram-command-router:test": "vitest",
      "telegram-error-loop:a2a2a-sync": "node scripts/ghostclaw_telegram_error_loop_a2a2a_sync.mjs",
      "telegram-error-loop:a2a2a-sync:test": "vitest",
      "ghostclaw-a2a:bus-watch": "python3 scripts/ghostclaw_a2a_bus_watcher.py --once",
      "ghostclaw-a2a:bus-watch:test": "python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_bus_watcher -v"
    }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json", {
    status: "PASS_LOCAL_SYNC_PACKETS_READY"
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json", {
    status: "PASS_LOCAL_BUS_ACK_COMPLETE",
    acknowledgements: [{ target: "codex" }, { target: "hermes" }, { target: "opencode" }],
    guardrails: falseGuardrails
  });

  for (const target of ["codex", "hermes", "opencode"]) {
    const packetName = target === "codex"
      ? "A2A2A-P063-CODEX-TELEGRAM-ERROR-LOOP-HANDOFF-20260703"
      : target === "hermes"
        ? "A2A2A-P063-HERMES-TELEGRAM-ERROR-LOOP-ROUTE-20260703"
        : "A2A2A-P063-OPENCODE-TELEGRAM-ERROR-LOOP-REVIEW-20260703";
    await writeJson(root, `.ghostclaw_runtime/a2a2a/inbox/${target}/${packetName}.json`, {
      schema: "ghostclaw.a2a2a.task.v1",
      target,
      dangerous_actions_allowed: false,
      paid_model_calls_allowed: false,
      secret_access_allowed: false
    });
    await writeJson(root, `.ghostclaw_runtime/a2a2a/receipts/bus_ack_${target}_${packetName}.json`, {
      status: "acknowledged_local_bus_sync",
      target,
      execution: {
        payload_executed: false,
        paid_model_calls: false,
        secret_access: false,
        cloud_mutation: false,
        external_message_send: false,
        package_install: false,
        git_push: false,
        deploy: false
      }
    });
  }

  const candidatePathspecs = [
    "services/dev-control-api/src/telegram-command-router.mjs",
    "services/dev-control-api/src/telegram-command-router.test.mjs",
    "scripts/ghostclaw_telegram_error_loop_a2a2a_sync.mjs",
    "scripts/ghostclaw_telegram_error_loop_a2a2a_sync.test.mjs",
    "scripts/ghostclaw_telegram_error_loop_readiness.mjs",
    "scripts/ghostclaw_telegram_error_loop_readiness.test.mjs",
    "scripts/ghostclaw_a2a_bus_watcher.py",
    "WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_bus_watcher.py",
    "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_A2A2A_SYNC_20260703.md",
    "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_BUS_ACK_20260703.md",
    "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_READINESS_20260703.md"
  ];
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: candidatePathspecs,
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json",
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P063-TELEGRAM-ERROR-LOOP-A2A2A-SYNC-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json"
    ]
  });
  await writeText(
    root,
    "reports/mission/A2A2A_TELEGRAM_ERROR_LOOP_BUS_ACK_20260703.md",
    "pnpm ghostclaw-a2a:bus-watch\npnpm ghostclaw-a2a:bus-watch:test\n"
  );
  return root;
}

describe("Telegram error-loop readiness", () => {
  it("passes when local packets, ack receipts, guardrails, and gate paths are present", async () => {
    const root = await createFixture();
    const readiness = await createTelegramErrorLoopReadiness({
      root,
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(readiness.status).toBe("PASS_TELEGRAM_ERROR_LOOP_READINESS");
    expect(readiness.failures).toEqual([]);
    expect(readiness.checks.every((check) => check.passed)).toBe(true);
    expect(readiness.guardrails.provider_call).toBe(false);
    expect(readiness.guardrails.telegram_live_send).toBe(false);
  });

  it("fails closed when a provider-call guardrail is open", async () => {
    const root = await createFixture();
    await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json", {
      status: "PASS_LOCAL_BUS_ACK_COMPLETE",
      acknowledgements: [{ target: "codex" }, { target: "hermes" }, { target: "opencode" }],
      guardrails: { ...falseGuardrails, provider_call: true }
    });

    const readiness = await createTelegramErrorLoopReadiness({ root });

    expect(readiness.status).toBe("FAIL_TELEGRAM_ERROR_LOOP_READINESS");
    expect(readiness.failures).toContain("p064_guardrails_not_closed");
  });
});
