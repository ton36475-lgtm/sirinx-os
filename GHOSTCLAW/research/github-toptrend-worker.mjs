import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const RUNTIME_DIR = "/Users/sirinx/sirinx-os/.ghostclaw_runtime/research/github_trending";

const TOPICS = [
  "ai-agent",
  "multi-agent",
  "agent-framework",
  "agent-orchestration",
  "browser-use",
  "mcp",
  "a2a",
  "autonomous-agent",
  "workflow-automation",
  "edgeone",
  "kimi",
  "deepseek",
  "glm",
  "openai agents",
  "claude opus"
];

/**
 * GitHub Toptrend Research Worker
 * Mode: public_read_only
 * Allowed: public metadata only, gh search repos metadata only
 * Blocked: clone trending repo, install trending repo packages, execute unknown code
 * Output: .ghostclaw_runtime/research/github_trending/
 */
export function runGithubToptrendResearch() {
  if (!fs.existsSync(RUNTIME_DIR)) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  }

  const dateId = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const snapshotPath = path.join(RUNTIME_DIR, `toptrend_${dateId}.json`);

  const manifest = {
    schema: "ghostclaw.github_toptrend_snapshot.v1",
    source: "github_trending_and_github_search",
    mode: "public_read_only",
    status: "completed",
    timestamp: new Date().toISOString(),
    topics: TOPICS,
    note: "This is read-only research input. It never authorizes execution or mutation.",
    blocked_actions: [
      "clone trending repo",
      "install trending repo packages",
      "execute unknown code"
    ]
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(manifest, null, 2));

  let ghAvailable = false;
  try {
    execSync("which gh", { stdio: "ignore" });
    ghAvailable = true;
  } catch {
    // gh CLI not available
  }

  if (!ghAvailable) {
    const statusPath = path.join(RUNTIME_DIR, `scan_status_${dateId}.log`);
    fs.writeFileSync(
      statusPath,
      "toptrend_scan_status = skipped_no_gh_cli\ncontinue_local_implementation = true"
    );
    return { status: "skipped_no_gh_cli", snapshot: dateId, path: RUNTIME_DIR };
  }

  for (const topic of TOPICS) {
    const safeName = topic.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const outPath = path.join(RUNTIME_DIR, `${safeName}_${dateId}.json`);
    try {
      const cmd = `gh search repos "${topic}" --sort stars --limit 20 --json nameWithOwner,description,stargazerCount,url,updatedAt > "${outPath}"`;
      execSync(cmd, { stdio: "ignore" });
    } catch {
      // Continue on per-topic errors
    }
  }

  return { status: "success", snapshot: dateId, path: RUNTIME_DIR, topics: TOPICS.length };
}

export default runGithubToptrendResearch;
