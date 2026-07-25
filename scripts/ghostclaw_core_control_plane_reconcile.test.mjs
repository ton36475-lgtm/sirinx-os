import { mkdir, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { reconcileCoreControlPlane } from "./ghostclaw_core_control_plane_reconcile.mjs";

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
  - route_id: route-repo-arch
    task_type: repo_or_architecture
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: C
`;

const TASK = `
mission_id: GHOSTCLAW-OS-CORE-CONTROL-PLANE-20260702-001
project_id: ghostclaw-os
task_type: repo_or_architecture
tier: C
status: local_validated
priority: highest
validated_by_packet: A2A2A-P034-GHOSTCLAW-OS-CORE-CONTROL-PLANE-RECONCILE-20260703
allowed_files:
  - services/dev-control-api/**
  - .ghostclaw/registry/**
  - .ghostclaw_runtime/a2a2a/**
  - scripts/**
  - docs/**
forbidden_files:
  - .env
  - .env.*
`;

const MODULE = `
const BLOCKED_RULES = [];
export async function loadGhostClawControlPlane() {}
export async function createGhostClawDispatchPreview() {}
export function requestGhostClawFileLease() {}
export function validateGhostClawReceipt() {}
export function classifyGhostClawAction() {}
export const GHOSTCLAW_CONTROL_PLANE_RECEIPT_FIELDS = [];
`;

const DECLARATION = `
export interface GhostClawControlPlane {}
export interface GhostClawDispatchPreview {}
export function createGhostClawDispatchPreview(): Promise<GhostClawDispatchPreview>;
`;

const TEST = `
it("denies leases for forbidden files and active collisions", () => {});
it("validates required receipt fields", () => {});
it("creates a read-only dispatch preview", () => {});
`;

const SERVER = `
if (url.pathname === "/api/ghostclaw/control-plane") {}
if (url.pathname === "/api/ghostclaw/control-plane/dispatch/dry-run") {}
`;

const DOCS = `
Current route matrix path: .ghostclaw/registry/route-matrix.v1.yaml
route-repo-arch
GET /api/ghostclaw/control-plane
POST /api/ghostclaw/control-plane/dispatch/dry-run
`;

async function writeText(root, relativePath, text) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

async function seedRoot() {
  const root = mkdtempSync(join(tmpdir(), "ghostclaw-core-reconcile-"));
  await writeText(root, ".ghostclaw/registry/agent-registry.v1.yaml", AGENTS);
  await writeText(root, ".ghostclaw/registry/route-matrix.v1.yaml", ROUTES);
  await writeText(root, ".ghostclaw_runtime/a2a2a/project_queues/ghostclaw_os/TASK-001-ghostclaw-os-core-control-plane.yaml", TASK);
  await writeText(root, "services/dev-control-api/src/ghostclaw-control-plane.mjs", MODULE);
  await writeText(root, "services/dev-control-api/src/ghostclaw-control-plane.d.ts", DECLARATION);
  await writeText(root, "services/dev-control-api/src/ghostclaw-control-plane.test.mjs", TEST);
  await writeText(root, "services/dev-control-api/server.mjs", SERVER);
  await writeText(root, "docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md", DOCS);
  await writeText(root, "package.json", JSON.stringify({ scripts: { "ghostclaw-control-plane:test": "vitest" } }));
  await writeText(root, ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P032-GHOSTCLAW-CONTROL-PLANE-IMPL-20260703.json", JSON.stringify({ status: "PASS" }));
  return root;
}

describe("GhostClaw core control-plane reconciliation", () => {
  it("proves all control-plane queue requirements against local evidence", async () => {
    const root = await seedRoot();
    const result = await reconcileCoreControlPlane({
      root,
      now: () => new Date("2026-07-03T05:20:00.000Z")
    });

    expect(result.summary).toEqual({ total: 10, pass: 10, fail: 0 });
    expect(result.task_status).toBe("local_validated");
    expect(result.dispatch_preview_status).toBe("ready-ghostclaw-dispatch-preview");
    expect(result.lease_preview.granted).toBe(true);
    expect(result.guardrails.provider_call).toBe(false);
    expect(result.guardrails.push).toBe(false);
    expect(result.guardrails.deploy).toBe(false);
  });
});
