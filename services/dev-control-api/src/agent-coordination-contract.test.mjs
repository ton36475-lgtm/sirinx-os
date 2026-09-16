import { describe, expect, it } from "vitest";
import {
  getAgentCoordinationStatus,
  pathsOverlap,
  readCoordinationConfig,
  validateActiveAssignments,
  validateCoordinationConfig
} from "./agent-coordination-contract.mjs";

const repoRoot = new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");

describe("agent coordination contract", () => {
  it("defines one main-worktree writer and one Git owner", async () => {
    const config = await readCoordinationConfig({ repoRoot });
    expect(validateCoordinationConfig(config)).toMatchObject({
      ok: true,
      repoWriter: "codex_build_captain",
      gitOwner: "codex_build_captain"
    });
  });

  it("rejects a second repo writer", async () => {
    const config = structuredClone(await readCoordinationConfig({ repoRoot }));
    config.roles.find((role) => role.id === "opencode_glm52_reviewer").repoAccess = "write_with_lease";
    expect(validateCoordinationConfig(config).errors).toContain("repo_writer_count_mismatch");
  });

  it("detects overlapping active file leases", () => {
    expect(pathsOverlap("services/orchestrator/**", "services/orchestrator/Cargo.toml")).toBe(true);
    expect(validateActiveAssignments([
      { task_id: "task-a", owner: "codex", status: "implementing", allowed_paths: ["services/orchestrator/**"] },
      { task_id: "task-b", owner: "opencode", status: "leased", allowed_paths: ["services/orchestrator/Cargo.toml"] }
    ])).toHaveLength(1);
  });

  it("uses verified GLM-5.2 when Claude OAuth is still pending", async () => {
    const status = await getAgentCoordinationStatus({
      repoRoot,
      now: new Date("2026-07-14T08:05:00.000Z"),
      providerHealth: {
        claude_code_oauth: { status: "pending_auth" },
        codex_local: { status: "ready" },
        opencode_glm52: { status: "ready" },
        opencode_fallback: { status: "unverified" }
      }
    });
    expect(status.modelRoutes.architecture).toMatchObject({
      status: "ready_with_fallback",
      selected: "glm/glm-5.2"
    });
    expect(status.modelRoutes.review).toMatchObject({
      status: "ready",
      selected: "glm/glm-5.2"
    });
    expect(status.mission.stale).toBe(true);
  });
});
