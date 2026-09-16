import { mkdir, rm, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createGhostClawControlPlaneStatusHandler,
  getGhostClawControlPlaneStatus
} from "./ghostclaw-control-plane-status.mjs";

const fixedNow = () => new Date("2026-07-05T09:35:00.000Z");

const baseFixture = {
  contract_id: "ghostclaw-control-plane-status-v1",
  status: "ready",
  mode: "read_only_control_plane_status",
  dry_run: true,
  live_execution: false,
  projects: [
    {
      project_id: "project-sirinx-core",
      name: "SIRINX Core OS",
      slug: "sirinx-core",
      focus_state: "active",
      status: "architecture_ready",
      public_domain: null,
      private_domain: "dev.sirinx.co"
    },
    {
      project_id: "project-agm-autoflow",
      name: "AGM AutoFlow",
      slug: "agm-autoflow",
      focus_state: "active",
      status: "local_safe_build_lane",
      public_domain: null,
      private_domain: null
    }
  ],
  missions: [
    {
      mission_id: "mission-control-plane-contract",
      project_slug: "sirinx-core",
      title: "Define control-plane status API contract",
      action_tier: "A",
      status: "contract_ready",
      priority: 1,
      correlation_id: "P104-20260705"
    },
    {
      mission_id: "mission-agm-autoflow",
      project_slug: "agm-autoflow",
      title: "Keep AGM AutoFlow in active focus",
      action_tier: "A",
      status: "ready",
      priority: 2,
      correlation_id: "P104-AGM"
    }
  ],
  packets: [
    {
      packet_id: "P104_CONTROL_PLANE_STATUS_HANDLER_LOCAL_FIXTURE_ONLY",
      mission_id: "mission-control-plane-contract",
      lane: "api_handler",
      status: "ready_for_review",
      dry_run: true,
      live_execution: false,
      next_action: "P105 dashboard read model",
      artifact_path: "services/dev-control-api/src/ghostclaw-control-plane-status.mjs"
    },
    {
      packet_id: "P104_AGM_STATUS_READONLY",
      mission_id: "mission-agm-autoflow",
      lane: "dashboard_status",
      status: "ready_for_review",
      dry_run: true,
      live_execution: false,
      next_action: "P105 dashboard read model",
      artifact_path: "services/dev-control-api/src/ghostclaw-control-plane-status.test.mjs"
    }
  ],
  approval_gates: [
    {
      gate_code: "P105_DASHBOARD_READ_MODEL_LOCAL_ONLY",
      mission_id: "mission-control-plane-contract",
      action_type: "local_dashboard_read_model",
      status: "pending",
      risk_level: "low",
      rollback_plan_path: null
    },
    {
      gate_code: "P105_AGM_DASHBOARD_READ_MODEL_LOCAL_ONLY",
      mission_id: "mission-agm-autoflow",
      action_type: "local_dashboard_read_model",
      status: "pending",
      risk_level: "low",
      rollback_plan_path: null
    }
  ],
  receipts: [
    {
      receipt_id: "receipt-p104-contract",
      status: "written",
      artifact_path: "reports/mission/A2A2A_P104_CONTROL_PLANE_STATUS_HANDLER_20260705.md",
      artifact_sha256: null,
      redaction_status: "redacted_or_no_sensitive_data"
    }
  ],
  dashboard: {
    active_project_count: 2,
    active_mission_count: 2,
    pending_approval_count: 2,
    active_packet_id: "P104_CONTROL_PLANE_STATUS_HANDLER_LOCAL_FIXTURE_ONLY",
    next_safe_action: "P105 dashboard read model",
    warnings: ["database_migration_blocked", "live_execution_blocked"]
  },
  guardrails: {
    read_only: true,
    worker_execution: false,
    live_telegram_send: false,
    provider_call: false,
    secret_read: false,
    install: false,
    push: false,
    deploy: false,
    cloudflare_r2_mutation: false,
    database_migration: false
  },
  updated_at: "2026-07-05T16:35:00+07:00"
};

async function withFixture(payload, callback) {
  const root = mkdtempSync(join(tmpdir(), "ghostclaw-status-"));
  const fixturePath = "fixtures/status.json";
  const absolutePath = join(root, fixturePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  try {
    return await callback({ root, fixturePath });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("GhostClaw control-plane status", () => {
  it("returns a local fixture-backed response with all live actions closed", async () => {
    await withFixture(baseFixture, async ({ root, fixturePath }) => {
      const status = await getGhostClawControlPlaneStatus({
        root,
        fixturePath,
        include_receipts: true,
        now: fixedNow
      });

      expect(status.contract_id).toBe("ghostclaw-control-plane-status-v1");
      expect(status.mode).toBe("read_only_control_plane_status");
      expect(status.dry_run).toBe(true);
      expect(status.live_execution).toBe(false);
      expect(status.guardrails).toMatchObject({
        read_only: true,
        worker_execution: false,
        live_telegram_send: false,
        provider_call: false,
        secret_read: false,
        install: false,
        push: false,
        deploy: false,
        cloudflare_r2_mutation: false,
        database_migration: false
      });
      expect(status.receipts).toHaveLength(1);
      expect(status.updated_at).toBe("2026-07-05T09:35:00.000Z");
    });
  });

  it("filters by project and recomputes dashboard counters without executing workers", async () => {
    await withFixture(baseFixture, async ({ root, fixturePath }) => {
      const status = await getGhostClawControlPlaneStatus({
        root,
        fixturePath,
        project: "agm-autoflow",
        include_receipts: false,
        now: fixedNow
      });

      expect(status.projects.map((project) => project.slug)).toEqual(["agm-autoflow"]);
      expect(status.missions.map((mission) => mission.project_slug)).toEqual(["agm-autoflow"]);
      expect(status.packets.map((packet) => packet.packet_id)).toEqual(["P104_AGM_STATUS_READONLY"]);
      expect(status.approval_gates.map((gate) => gate.gate_code)).toEqual([
        "P105_AGM_DASHBOARD_READ_MODEL_LOCAL_ONLY"
      ]);
      expect(status.receipts).toEqual([]);
      expect(status.dashboard.active_project_count).toBe(1);
      expect(status.dashboard.active_mission_count).toBe(1);
      expect(status.dashboard.pending_approval_count).toBe(1);
      expect(status.guardrails.worker_execution).toBe(false);
    });
  });

  it("can hide local paths while preserving contract-safe rows", async () => {
    await withFixture(baseFixture, async ({ root, fixturePath }) => {
      const status = await getGhostClawControlPlaneStatus({
        root,
        fixturePath,
        include_receipts: true,
        include_paths: false,
        limit: 1,
        now: fixedNow
      });

      expect(status.packets).toHaveLength(1);
      expect(status.approval_gates).toHaveLength(1);
      expect(status.receipts).toHaveLength(1);
      expect(status.packets[0].artifact_path).toBeNull();
      expect(status.approval_gates[0].rollback_plan_path).toBeNull();
      expect(status.receipts[0].artifact_path).toBeNull();
    });
  });

  it("rejects live-execution fixture drift with a contract violation error", async () => {
    const unsafeFixture = {
      ...baseFixture,
      live_execution: true
    };

    await withFixture(unsafeFixture, async ({ root, fixturePath }) => {
      const status = await getGhostClawControlPlaneStatus({ root, fixturePath, now: fixedNow });

      expect(status.error.code).toBe("CONTRACT_VIOLATION");
      expect(status.error.details.failures).toContain("live_execution");
    });
  });

  it("exposes a handler-shaped wrapper without binding a server route", async () => {
    await withFixture(baseFixture, async ({ root, fixturePath }) => {
      const handler = createGhostClawControlPlaneStatusHandler({
        root,
        fixturePath,
        now: fixedNow
      });
      const result = await handler({ query: { include_receipts: "true" } });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(result.headers["cache-control"]).toBe("no-store");
      expect(body.receipts).toHaveLength(1);
      expect(body.guardrails.provider_call).toBe(false);
    });
  });

  it("returns INVALID_QUERY for malformed boolean parameters", async () => {
    await withFixture(baseFixture, async ({ root, fixturePath }) => {
      const handler = createGhostClawControlPlaneStatusHandler({
        root,
        fixturePath,
        now: fixedNow
      });
      const result = await handler({ query: { include_receipts: "sometimes" } });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.error.code).toBe("INVALID_QUERY");
    });
  });
});
