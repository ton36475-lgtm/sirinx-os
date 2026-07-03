import { describe, expect, it } from "vitest";
import { createCommitGateCheck, validateCommitGateManifest } from "./ghostclaw_local_commit_gate_check.mjs";

const validManifest = {
  gate_id: "TEST-GATE",
  candidate_pathspecs: [
    "apps/example",
    "docs/example.md",
    "scripts/example.mjs"
  ],
  explicitly_excluded_pathspecs: [
    ".ghostclaw_runtime/**",
    ".env",
    ".env.*",
    "secrets/**",
    "customer-data/**"
  ],
  required_evidence: [
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P056-PROJECT-QUEUE-FINAL-AUDIT-20260703.json"
  ],
  suggested_commit_message: "feat: test",
  blocked_without_separate_gate: [
    "git push",
    "deploy",
    "Cloudflare/R2 mutation",
    "provider call",
    "Telegram live send"
  ]
};

describe("GhostClaw local commit gate check", () => {
  it("accepts a safe explicit-path manifest", () => {
    const result = validateCommitGateManifest(validManifest);
    expect(result.status).toBe("PASS");
    expect(result.failures).toEqual([]);
    expect(result.candidate_pathspec_count).toBe(3);
  });

  it("rejects forbidden or ambiguous candidate pathspecs", () => {
    const result = validateCommitGateManifest({
      ...validManifest,
      candidate_pathspecs: [
        "apps/example",
        ".env",
        ".ghostclaw_runtime/a2a2a/evidence",
        "../outside"
      ]
    });

    expect(result.status).toBe("FAIL");
    expect(result.failures).toContain("forbidden_candidate_pathspec_.env");
    expect(result.failures).toContain("forbidden_candidate_pathspec_.ghostclaw_runtime/a2a2a/evidence");
    expect(result.failures).toContain("unsafe_candidate_pathspec_../outside");
  });

  it("fails when candidate git status includes forbidden paths", async () => {
    const result = await createCommitGateCheck({
      manifestPayload: {
        ...validManifest,
        candidate_pathspecs: ["services/news-api"]
      },
      gitStatusLines: ["?? services/news-api/node_modules/cache.json"],
      ignoredPathspecs: []
    });

    expect(result.status).toBe("FAIL");
    expect(result.forbidden_git_status_lines).toEqual(["?? services/news-api/node_modules/cache.json"]);
    expect(result.failures.some((failure) => failure.includes("forbidden_git_status_line"))).toBe(true);
  });
});
