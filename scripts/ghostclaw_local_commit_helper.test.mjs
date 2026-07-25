import { describe, expect, it } from "vitest";
import {
  buildGitAddCommand,
  buildGitCommitCommand,
  createLocalCommitPlan,
  shellQuote
} from "./ghostclaw_local_commit_helper.mjs";

const manifest = {
  candidate_pathspecs: [
    "apps/example",
    "docs/example with space.md",
    "scripts/example.mjs"
  ],
  suggested_commit_message: "feat(ghostclaw): add validated project queue delivery batch"
};

const passingGate = {
  status: "PASS",
  git_status_line_count: 3,
  ignored_pathspecs: []
};

describe("GhostClaw local commit helper", () => {
  it("quotes shell pathspecs and commit messages", () => {
    expect(shellQuote("docs/owner's note.md")).toBe("'docs/owner'\"'\"'s note.md'");
    expect(buildGitAddCommand(manifest.candidate_pathspecs)).toContain("'docs/example with space.md'");
    expect(buildGitCommitCommand(manifest.suggested_commit_message)).toContain("'feat(ghostclaw): add validated project queue delivery batch'");
  });

  it("creates a dry-run plan from a passing gate", () => {
    const result = createLocalCommitPlan(manifest, passingGate);

    expect(result.status).toBe("PASS");
    expect(result.candidate_pathspec_count).toBe(3);
    expect(result.commands.stage).toContain("git add --");
    expect(result.commands.cached_diff_check).toBe("git diff --cached --check");
    expect(result.execution_guard.default_executes_commit).toBe(false);
  });

  it("fails the plan if the gate check has not passed", () => {
    const result = createLocalCommitPlan(manifest, {
      status: "FAIL",
      git_status_line_count: 0,
      ignored_pathspecs: ["apps/example"]
    });

    expect(result.status).toBe("FAIL");
    expect(result.failures).toContain("commit_gate_check_not_pass");
    expect(result.failures).toContain("ignored_candidate_pathspecs_present");
  });
});
