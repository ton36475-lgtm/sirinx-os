import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GH_JSON_FIELDS,
  BLOCKED_ACTIONS,
  checkGhPublicMetadataReadiness,
  runGithubToptrendResearch
} from "./github-toptrend-worker.mjs";

function tempRuntimeDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ghostclaw-toptrend-"));
}

describe("Phase 11 GitHub Toptrend Research Worker", () => {
  it("marks setup_required when gh is unavailable without installing anything", () => {
    const runtimeDir = tempRuntimeDir();
    const calls = [];
    const spawn = (command, args) => {
      calls.push({ command, args });
      return { status: command === "gh" && args[0] === "--version" ? 1 : 0, stdout: "", stderr: "missing" };
    };

    const result = runGithubToptrendResearch({
      runtimeDir,
      topics: ["ai-agent"],
      now: new Date("2026-06-30T03:00:00.000Z"),
      spawn
    });

    expect(result).toMatchObject({
      status: "setup_required",
      reason: "gh_cli_missing_or_unavailable"
    });
    expect(calls).toEqual([{ command: "gh", args: ["--version"] }]);
    expect(fs.existsSync(path.join(runtimeDir, "toptrend_20260630030000.json"))).toBe(true);
    expect(fs.existsSync(path.join(runtimeDir, "scan_status_20260630030000.json"))).toBe(true);
  });

  it("checks gh auth status without reading or printing tokens", () => {
    const calls = [];
    const spawn = (command, args) => {
      calls.push({ command, args });
      if (args[0] === "--version") return { status: 0, stdout: "gh version 2", stderr: "" };
      if (args[0] === "auth") return { status: 1, stdout: "", stderr: "not logged in" };
      return { status: 0, stdout: "[]", stderr: "" };
    };

    const readiness = checkGhPublicMetadataReadiness({ spawn });

    expect(readiness).toEqual({
      ready: false,
      reason: "gh_auth_unavailable_without_secret_read"
    });
    expect(calls).toEqual([
      { command: "gh", args: ["--version"] },
      { command: "gh", args: ["auth", "status"] }
    ]);
  });

  it("writes public metadata only using argument-based gh search", () => {
    const runtimeDir = tempRuntimeDir();
    const calls = [];
    const spawn = (command, args) => {
      calls.push({ command, args });
      if (args[0] === "--version") return { status: 0, stdout: "gh version 2", stderr: "" };
      if (args[0] === "auth") return { status: 0, stdout: "", stderr: "" };
      if (args[0] === "search") {
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              fullName: "example/agent",
              description: "public metadata",
              stargazersCount: 123,
              url: "https://github.com/example/agent",
              updatedAt: "2026-06-01T00:00:00Z",
              visibility: "public",
              privateFieldShouldBeDropped: "not persisted"
            }
          ]),
          stderr: ""
        };
      }
      return { status: 1, stdout: "", stderr: "" };
    };

    const result = runGithubToptrendResearch({
      runtimeDir,
      topics: ["ai-agent"],
      now: new Date("2026-06-30T03:01:00.000Z"),
      spawn,
      limit: 3
    });

    expect(result.status).toBe("completed_public_metadata_only");
    expect(calls[2]).toEqual({
      command: "gh",
      args: [
        "search",
        "repos",
        "ai-agent",
        "--sort",
        "stars",
        "--visibility",
        "public",
        "--limit",
        "3",
        "--json",
        GH_JSON_FIELDS.join(",")
      ]
    });

    const topicPath = path.join(runtimeDir, "ai_agent_20260630030100.json");
    const topic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
    expect(topic.repos).toEqual([
      {
        nameWithOwner: "example/agent",
        description: "public metadata",
        stargazerCount: 123,
        url: "https://github.com/example/agent",
        updatedAt: "2026-06-01T00:00:00Z"
      }
    ]);
    expect(JSON.stringify(topic)).not.toContain("privateFieldShouldBeDropped");
  });

  it("documents hard blocks against clone, install, execute, token reads, and rate-limit bypass", () => {
    const workerText = readFileSync(new URL("./github-toptrend-worker.mjs", import.meta.url), "utf8");
    const mapText = readFileSync(new URL("./github-toptrend-map.yaml", import.meta.url), "utf8");
    const docText = readFileSync(
      new URL("../../docs/knowledge/GITHUB_TOPTREND_AGENT_RESEARCH_WORKFLOW.md", import.meta.url),
      "utf8"
    );

    for (const marker of [
      "clone_trending_repo",
      "install_trending_repo_packages",
      "execute_unknown_code",
      "read_tokens",
      "print_tokens",
      "bypass_rate_limits"
    ]) {
      expect(BLOCKED_ACTIONS).toContain(marker);
      expect(workerText).toContain(marker);
      expect(mapText).toContain(marker);
      expect(docText).toContain(marker);
    }

    for (const marker of ["--visibility", "visibility_filter: public"]) {
      expect(workerText + mapText + docText).toContain(marker);
    }

    expect(workerText).not.toContain("execSync");
    expect(workerText).not.toContain("git clone");
    expect(workerText).not.toContain("npm install");
    expect(workerText).not.toContain("curl | bash");
  });
});
