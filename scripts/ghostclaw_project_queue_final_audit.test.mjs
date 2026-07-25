import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProjectQueueFinalAudit } from "./ghostclaw_project_queue_final_audit.mjs";

const AGENTS = `
agents:
  - id: codex
    name: Codex
    lane: primary_builder
    mutates_files: true
    requires_lease: true
    requires_receipt: true
  - id: opencode
    name: OpenCode
    lane: qa_review_only
    mutates_files: false
    requires_lease: false
    requires_receipt: true
  - id: validator
    name: Validator
    lane: validation
    mutates_files: false
    requires_lease: false
    requires_receipt: true
`;

const ROUTES = `
routes:
  - route_id: route-public-site
    task_type: public_site_ui
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: B
`;

const CLOSED_TASK = `
mission_id: CLOSED-MISSION
project_id: closed-project
task_type: public_site_ui
tier: B
status: local_validated
priority: high
allowed_files:
  - apps/example/**
forbidden_files:
  - .env
`;

const OPEN_TASK = `
mission_id: OPEN-MISSION
project_id: open-project
task_type: public_site_ui
tier: B
status: pending
priority: high
allowed_files:
  - apps/example/**
forbidden_files:
  - .env
`;

async function writeText(root, relativePath, text) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

async function seedRoot({ includeOpenTask = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "ghostclaw-final-audit-"));
  await writeText(root, ".ghostclaw/registry/agent-registry.v1.yaml", AGENTS);
  await writeText(root, ".ghostclaw/registry/route-matrix.v1.yaml", ROUTES);
  await writeText(root, ".ghostclaw_runtime/a2a2a/project_queues/closed/TASK-001.yaml", CLOSED_TASK);
  await writeText(root, ".ghostclaw_runtime/a2a2a/receipts/CLOSED-MISSION.json", JSON.stringify({
    mission_id: "CLOSED-MISSION",
    status: "local_validated"
  }));
  await writeText(root, ".ghostclaw_runtime/a2a2a/evidence/CLOSED-MISSION.json", JSON.stringify({
    mission_id: "CLOSED-MISSION",
    status: "PASS"
  }));

  if (includeOpenTask) {
    await writeText(root, ".ghostclaw_runtime/a2a2a/project_queues/open/TASK-001.yaml", OPEN_TASK);
  }

  return root;
}

describe("GhostClaw project queue final audit", () => {
  it("passes when closed tasks have accepted receipts and evidence", async () => {
    const root = await seedRoot();
    const result = await createProjectQueueFinalAudit({ root });

    expect(result.status).toBe("PASS");
    expect(result.summary.total_tasks).toBe(1);
    expect(result.summary.passed_tasks).toBe(1);
    expect(result.summary.failed_tasks).toBe(0);
    expect(result.tasks[0].receipt_paths).toHaveLength(1);
    expect(result.tasks[0].evidence_paths).toHaveLength(1);
  });

  it("fails when any queue task is still open or lacks proof", async () => {
    const root = await seedRoot({ includeOpenTask: true });
    const result = await createProjectQueueFinalAudit({ root });
    const openTask = result.tasks.find((task) => task.mission_id === "OPEN-MISSION");

    expect(result.status).toBe("FAIL");
    expect(openTask.blockers).toContain("queue_status_not_closed");
    expect(openTask.blockers).toContain("missing_exact_mission_receipt");
    expect(openTask.blockers).toContain("missing_mission_evidence");
  });
});
