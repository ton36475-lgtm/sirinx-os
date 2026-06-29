import { describe, expect, it } from "vitest";
import type { A2AMessage } from "./a2a-message.js";
import { evaluateCommand, sha256 } from "./command-broker.js";
import { isPathInLane, laneForPath, matchGlob } from "./lane-registry.js";

function makeMessage(action: string, files?: string[]): A2AMessage {
  return {
    a2a2a_version: "2.0",
    mission_id: "M-2026-0629-001",
    correlation_id: "sirinx-a2a2a-00000001",
    from: { agent: "hermes-commander", role: "mission-commander" },
    to: { agent: "codex-captain", role: "build-captain" },
    action_requested: action,
    context: {
      goal: "Build A2A bridge",
      files: files ?? [],
      lane: "GHOSTCLAW/a2a-hermes-codex-bridge",
      constraints: [],
    },
    human_approval_required: false,
    timestamp: new Date().toISOString(),
    ttl_seconds: 600,
    status: "PENDING",
    safe_execution_v3: {
      mode: "full_auto_yolo_safe_execution",
      blocked_action_behavior: "auto_block_and_continue",
    },
  };
}

describe("A2A Hermes-Codex Command Broker", () => {
  it("Tier A: read-only actions auto-execute", () => {
    const msg = makeMessage("repo_scan");
    const { verdict, receipt } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(true);
    expect(verdict.tier).toBe("A");
    expect(receipt.decision_status).toBe("allowed");
    expect(receipt.checksums.context_goal_sha256).toBe(sha256(msg.context.goal));
  });

  it("Tier B: allowed path code patch auto-executes", () => {
    const msg = makeMessage("write_module", ["GHOSTCLAW/a2a-hermes-codex-bridge/router.ts"]);
    const { verdict, receipt } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(true);
    expect(verdict.tier).toBe("B");
    expect(receipt.decision_status).toBe("allowed");
  });

  it("Tier C: stage_commit requires quorum", () => {
    const msg = makeMessage("stage_commit");
    const { verdict, receipt } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(false);
    expect(verdict.tier).toBe("C");
    expect(receipt.decision_status).toBe("quorum_required");
  });

  it("Tier D: dependency_install blocked and simulated", () => {
    const msg = makeMessage("dependency_install");
    const { verdict, receipt } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(false);
    expect(verdict.tier).toBe("D");
    expect(receipt.decision_status).toBe("simulated");
    expect(verdict.safeReplacement).toBe("lockfile_analysis");
  });

  it("Tier X: generic_push hard blocked", () => {
    const msg = makeMessage("generic_push");
    const { verdict, receipt } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(false);
    expect(verdict.tier).toBe("X");
    expect(receipt.decision_status).toBe("simulated");
    expect(verdict.safeReplacement).toBe("staging_dry_run");
  });

  it("forbidden path write is hard blocked", () => {
    const msg = makeMessage("write_module", [".env"]);
    const { verdict } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(false);
    expect(verdict.tier).toBe("X");
    expect(verdict.reason).toMatch(/forbidden_path/);
  });

  it("out-of-lane path write is hard blocked", () => {
    const msg = makeMessage("write_module", ["services/dev-control-api/server.mjs"]);
    const { verdict } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(false);
    expect(verdict.tier).toBe("X");
    expect(verdict.reason).toMatch(/out_of_lane_path/);
  });

  it("hard-denied actions are X", () => {
    const msg = makeMessage("jailbreak_execution");
    const { verdict } = evaluateCommand(msg);
    expect(verdict.allowed).toBe(false);
    expect(verdict.tier).toBe("X");
    expect(verdict.reason).toMatch(/hard_deny/);
  });
});

describe("Lane Registry", () => {
  it("matches glob patterns", () => {
    expect(matchGlob("GHOSTCLAW/foo/bar.ts", "GHOSTCLAW/**")).toBe(true);
    expect(matchGlob("services/api/main.mjs", "services/**")).toBe(true);
    expect(matchGlob("packages/core/index.ts", "apps/**")).toBe(false);
  });

  it("resolves lane for paths", () => {
    expect(laneForPath("GHOSTCLAW/a2a-hermes-codex-bridge/router.ts")?.id).toBe("ghostclaw_core");
    expect(laneForPath("services/dev-control-api/server.mjs")?.id).toBe("services");
    expect(laneForPath("apps/dev-dashboard/server.mjs")?.id).toBe("apps");
  });

  it("checks path belongs to lane", () => {
    expect(isPathInLane("GHOSTCLAW/foo.ts", "ghostclaw_core")).toBe(true);
    expect(isPathInLane("services/api/main.mjs", "services")).toBe(true);
    expect(isPathInLane("services/api/main.mjs", "ghostclaw_core")).toBe(false);
    expect(isPathInLane(".env", "ghostclaw_core")).toBe(false);
  });
});
