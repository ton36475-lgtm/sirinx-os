import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyGhostClawAction,
  createGhostClawDispatchPreview,
  loadGhostClawControlPlane,
  parseAgentRegistry,
  parseRouteMatrix,
  requestGhostClawFileLease,
  validateGhostClawReceipt
} from "./ghostclaw-control-plane.mjs";

const fixedNow = () => new Date("2026-07-03T05:00:00.000Z");

const AGENTS = `
agents:
  - id: codex
    name: Codex
    lane: primary_builder
    mutates_files: true
    requires_lease: true
    requires_receipt: true
    default_model_hint: deepseek-v4
  - id: opencode
    name: OpenCode
    lane: qa_review_only
    mutates_files: false
    requires_lease: false
    requires_receipt: true
    default_model_hint: claude-opus-4
  - id: validator
    name: Validator
    lane: validation
    mutates_files: false
    requires_lease: false
    requires_receipt: true
    default_model_hint: deepseek-v4
`;

const ROUTES = `
routes:
  - route_id: route-public-site
    task_type: public_site_ui
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: B
  - route_id: route-repo-arch
    task_type: repo_or_architecture
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: C
`;

async function writeText(root, relativePath, text) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

async function seedRegistries() {
  const root = mkdtempSync(join(tmpdir(), "ghostclaw-control-plane-"));
  await writeText(root, ".ghostclaw/registry/agent-registry.v1.yaml", AGENTS);
  await writeText(root, ".ghostclaw/registry/route-matrix.v1.yaml", ROUTES);
  return root;
}

describe("GhostClaw control plane registry parsing", () => {
  it("parses agent and route registries into local-safe dispatch data", () => {
    const agents = parseAgentRegistry(AGENTS);
    const routes = parseRouteMatrix(ROUTES);

    expect(agents.map((agent) => agent.id)).toEqual(["codex", "opencode", "validator"]);
    expect(agents.find((agent) => agent.id === "codex").requiresLease).toBe(true);
    expect(routes.find((route) => route.taskType === "public_site_ui")).toMatchObject({
      routeId: "route-public-site",
      primaryAgent: "codex",
      reviewerAgent: "opencode",
      tier: "B"
    });
  });

  it("loads the registry from disk without enabling external actions", async () => {
    const root = await seedRegistries();
    const status = await loadGhostClawControlPlane(root, { now: fixedNow });

    expect(status.status).toBe("ghostclaw-control-plane-registry-ready");
    expect(status.summary.agents).toBe(3);
    expect(status.summary.routes).toBe(2);
    expect(status.guardrails.providerCall).toBe(false);
    expect(status.guardrails.push).toBe(false);
    expect(status.guardrails.deploy).toBe(false);
  });
});

describe("GhostClaw policy, lease, receipt, and dispatch preview", () => {
  it("classifies external and secret actions as blocked D/X tiers", () => {
    expect(classifyGhostClawAction({ action: "deploy to Cloudflare R2" })).toMatchObject({
      blocked: true,
      actionTier: "D"
    });
    expect(classifyGhostClawAction({ action: "read .env api key" })).toMatchObject({
      blocked: true,
      actionTier: "X"
    });
  });

  it("grants a lease only when files are allowed, non-forbidden, and non-conflicting", () => {
    const lease = requestGhostClawFileLease(
      {
        taskId: "site-public-guardian",
        files: ["apps/sirinx-site/src/app.js"],
        allowedFiles: ["apps/sirinx-site/**"],
        forbiddenFiles: [".env", "services/**"],
        existingLeases: []
      },
      { now: fixedNow }
    );

    expect(lease.granted).toBe(true);
    expect(lease.status).toBe("granted");
  });

  it("denies leases for forbidden files and active collisions", () => {
    const denied = requestGhostClawFileLease({
      files: [".env"],
      allowedFiles: ["apps/sirinx-site/**"],
      forbiddenFiles: [".env", ".env.*"],
      existingLeases: []
    });
    const conflict = requestGhostClawFileLease({
      files: ["apps/sirinx-site/src/app.js"],
      allowedFiles: ["apps/sirinx-site/**"],
      forbiddenFiles: [],
      existingLeases: [{ status: "active", files: ["apps/sirinx-site/src/app.js"] }]
    });

    expect(denied.granted).toBe(false);
    expect(denied.deniedFiles).toEqual([".env"]);
    expect(conflict.granted).toBe(false);
    expect(conflict.conflictingFiles).toEqual(["apps/sirinx-site/src/app.js"]);
  });

  it("validates required receipt fields", () => {
    const valid = validateGhostClawReceipt({
      receipt_id: "r1",
      mission_id: "m1",
      task_id: "t1",
      agent: "codex",
      action_tier: "B",
      files_touched: ["apps/sirinx-site/src/app.js"],
      validation_commands: ["pnpm test"],
      validation_result: "pass",
      created_at: "2026-07-03T05:00:00+0700"
    });
    const invalid = validateGhostClawReceipt({ receipt_id: "r2" });

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.missingFields).toContain("mission_id");
  });

  it("creates a read-only dispatch preview with a lease and OpenCode review target", async () => {
    const root = await seedRegistries();
    const preview = await createGhostClawDispatchPreview(
      {
        taskId: "site-public-guardian",
        taskType: "public_site_ui",
        filesToMutate: ["apps/sirinx-site/src/app.js"],
        allowedFiles: ["apps/sirinx-site/**"],
        forbiddenFiles: [".env", "services/**"],
        receipt: {
          receipt_id: "r1",
          mission_id: "m1",
          task_id: "site-public-guardian",
          agent: "codex",
          action_tier: "B",
          files_touched: ["apps/sirinx-site/src/app.js"],
          validation_commands: ["pnpm --filter @sirinx/site check"],
          validation_result: "pass",
          created_at: "2026-07-03T05:00:00+0700"
        }
      },
      { root, now: fixedNow }
    );

    expect(preview.status).toBe("ready-ghostclaw-dispatch-preview");
    expect(preview.route.routeId).toBe("route-public-site");
    expect(preview.agents.primary.id).toBe("codex");
    expect(preview.reviewDispatch).toMatchObject({
      reviewer: "opencode",
      mode: "read_only_diff_review",
      canMutate: false,
      providerCall: false
    });
    expect(preview.lease.granted).toBe(true);
    expect(preview.guardrails.workerExecution).toBe(false);
  });

  it("blocks dispatch previews for D-tier actions before leases or workers run", async () => {
    const root = await seedRegistries();
    const preview = await createGhostClawDispatchPreview(
      {
        taskId: "deploy-request",
        taskType: "public_site_ui",
        action: "deploy and push production website"
      },
      { root, now: fixedNow }
    );

    expect(preview.status).toBe("blocked-ghostclaw-dispatch-preview");
    expect(preview.blockers).toContain("policy_guardian_block");
    expect(preview.action.actionTier).toBe("D");
    expect(preview.guardrails.deploy).toBe(false);
    expect(preview.guardrails.push).toBe(false);
  });
});

