import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectQueue,
  parseProjectQueueTask
} from "./ghostclaw_project_queue_dispatch_preview.mjs";

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
  - route_id: route-docs-config
    task_type: docs_config_update
    primary_agent: codex
    reviewer_agent: validator
    validator_agent: validator
    tier: B
`;

const PUBLIC_TASK = `
mission_id: SIRINX-SITE-PUBLIC-GUARDIAN-TEST
project_id: sirinx-site
task_type: public_site_ui
tier: B
primary_agent: codex
reviewer_agent: opencode
status: pending
priority: high
summary: >
  Validate public website routes in local-safe mode.
allowed_files:
  - apps/sirinx-site/**
  - docs/website/**
forbidden_files:
  - .env
  - services/**
verification:
  - Build passes
  - Smoke tests pass
`;

const UNKNOWN_TASK = `
mission_id: UNKNOWN-TASK
project_id: unknown
task_type: missing_task_type
tier: C
status: pending
priority: low
`;

const CLOSED_TASK = `
mission_id: CLOSED-TASK
project_id: ghostclaw-os
task_type: docs_config_update
tier: B
status: local_validated
priority: highest
allowed_files:
  - docs/**
forbidden_files:
  - .env
`;

async function writeText(root, relativePath, text) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

async function seedRoot() {
  const root = mkdtempSync(join(tmpdir(), "ghostclaw-project-queue-"));
  await writeText(root, ".ghostclaw/registry/agent-registry.v1.yaml", AGENTS);
  await writeText(root, ".ghostclaw/registry/route-matrix.v1.yaml", ROUTES);
  await writeText(root, ".ghostclaw_runtime/a2a2a/project_queues/sirinx/TASK-001.yaml", PUBLIC_TASK);
  await writeText(root, ".ghostclaw_runtime/a2a2a/project_queues/unknown/TASK-001.yaml", UNKNOWN_TASK);
  await writeText(root, ".ghostclaw_runtime/a2a2a/project_queues/closed/TASK-001.yaml", CLOSED_TASK);
  return root;
}

describe("GhostClaw project queue dispatch preview", () => {
  it("parses project queue YAML task metadata and path scopes", () => {
    const task = parseProjectQueueTask(PUBLIC_TASK, "TASK-001.yaml");

    expect(task.mission_id).toBe("SIRINX-SITE-PUBLIC-GUARDIAN-TEST");
    expect(task.task_type).toBe("public_site_ui");
    expect(task.allowed_files).toEqual(["apps/sirinx-site/**", "docs/website/**"]);
    expect(task.forbidden_files).toEqual([".env", "services/**"]);
    expect(task.verification).toEqual(["Build passes", "Smoke tests pass"]);
    expect(task.summary).toContain("Validate public website routes");
  });

  it("evaluates all project queue tasks through the control-plane without executing workers", async () => {
    const root = await seedRoot();
    const result = await evaluateProjectQueue({
      root,
      now: () => new Date("2026-07-03T05:20:00.000Z")
    });

    expect(result.summary.total).toBe(3);
    expect(result.summary.ready_for_scoped_local_packet).toBe(1);
    expect(result.summary.blocked).toBe(1);
    expect(result.summary.closed).toBe(1);
    expect(result.summary.by_queue_status.local_validated).toBe(1);
    expect(result.summary.next_ready_task.mission_id).toBe("SIRINX-SITE-PUBLIC-GUARDIAN-TEST");
    expect(result.guardrails.worker_execution).toBe(false);
    expect(result.guardrails.provider_call).toBe(false);
    expect(result.guardrails.push).toBe(false);
    expect(result.guardrails.deploy).toBe(false);

    const ready = result.tasks.find((task) => task.mission_id === "SIRINX-SITE-PUBLIC-GUARDIAN-TEST");
    const blocked = result.tasks.find((task) => task.mission_id === "UNKNOWN-TASK");
    const closed = result.tasks.find((task) => task.mission_id === "CLOSED-TASK");

    expect(ready.dispatch_status).toBe("ready_for_scoped_local_packet");
    expect(result.tasks[0].mission_id).toBe("SIRINX-SITE-PUBLIC-GUARDIAN-TEST");
    expect(ready.primary_agent).toBe("codex");
    expect(ready.reviewer_agent).toBe("opencode");
    expect(ready.requires_scoped_file_lease_before_mutation).toBe(true);
    expect(ready.can_execute_now).toBe(false);
    expect(blocked.dispatch_status).toBe("blocked_route_not_found");
    expect(blocked.blockers).toContain("route_not_found");
    expect(closed.dispatch_status).toBe("closed_local_validated");
    expect(closed.requires_scoped_file_lease_before_mutation).toBe(false);
    expect(closed.next_safe_action).toContain("No action required");
  });
});
