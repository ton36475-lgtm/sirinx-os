import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusReadiness } from "./ghostclaw_active_focus_readiness.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-readiness-"));
  await writeJson(root, "package.json", {
    scripts: {
      "active-focus:preview-uat": "node scripts/ghostclaw_active_focus_local_preview_uat.mjs",
      "active-focus:preview-uat:test": "vitest",
      "telegram-error-loop:readiness": "node scripts/ghostclaw_telegram_error_loop_readiness.mjs",
      "telegram-error-loop:readiness:test": "vitest",
      "ghostclaw-a2a:bus-watch": "python3 scripts/ghostclaw_a2a_bus_watcher.py --once",
      "ghostclaw-a2a:bus-watch:test": "python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_bus_watcher -v"
    }
  });
  await writeJson(root, "reports/mission/A2A2A_ACTIVE_FOCUS_SCOPE_20260703.json", {
    active_focus: [{ id: "sirinx.co" }, { id: "agm-autoflow" }],
    paused_out_of_focus: [{ id: "kusala" }, { id: "phitsanulok-news" }]
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json", {
    status: "PASS",
    checks: {
      commands_pass: true,
      local_urls: true,
      sirinx_ready: true,
      autoglow_ready: true
    },
    sirinx_routes: [{ ok: true }, { ok: true }],
    agm_autoglow_dashboard: {
      home: { ok: true },
      project_api: { ok: true }
    },
    closed_gates: [
      "commit",
      "push",
      "deploy",
      "cloudflare_r2_mutation",
      "provider_call",
      "telegram_live_send",
      "customer_data_external_routing",
      "secret_or_env_read",
      "key_value_print",
      "install"
    ]
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json", {
    status: "PASS_TELEGRAM_ERROR_LOOP_READINESS",
    checks: [{ passed: true }],
    guardrails: {
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
    }
  });

  const candidatePathspecs = [
    "apps/sirinx-site",
    "apps/agm-site",
    "apps/agm-autoglow-dashboard",
    "packages/autoglow-core",
    "docs/creative",
    "scripts/ghostclaw_active_focus_readiness.mjs",
    "scripts/ghostclaw_active_focus_readiness.test.mjs",
    "reports/mission/A2A2A_ACTIVE_FOCUS_READINESS_20260703.md",
    ...(overrides.extraCandidates || [])
  ];
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: candidatePathspecs,
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json",
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json"
    ]
  });
  return root;
}

describe("Active focus readiness", () => {
  it("passes when current scope, local UAT, Telegram readiness, and commit gate align", async () => {
    const root = await createFixture();
    const readiness = await createActiveFocusReadiness({
      root,
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(readiness.status).toBe("PASS_ACTIVE_FOCUS_READINESS");
    expect(readiness.failures).toEqual([]);
    expect(readiness.checks.every((check) => check.passed)).toBe(true);
  });

  it("fails when a paused project is accidentally included in the commit gate", async () => {
    const root = await createFixture({ extraCandidates: ["apps/kusala-site"] });
    const readiness = await createActiveFocusReadiness({ root });

    expect(readiness.status).toBe("FAIL_ACTIVE_FOCUS_READINESS");
    expect(readiness.failures).toContain("commit_gate_forbidden_paused_project_apps/kusala-site");
  });
});
