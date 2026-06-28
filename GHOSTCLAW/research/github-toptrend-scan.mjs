import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const RUNTIME_DIR = "/Users/sirinx/sirinx-os/.ghostclaw_runtime/research/github_trending";

export function runTrendingEvidenceScan() {
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
    note: "This is read-only research input. It never authorizes execution or mutation."
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(manifest, null, 2));

  try {
    execSync("which gh", { stdio: "ignore" });

    const queries = [
      { q: "ai agent framework", name: "ai_agent_frameworks" },
      { q: "multi agent orchestration", name: "multi_agent_orchestration" },
      { q: "mcp a2a agent", name: "mcp_a2a_agent" }
    ];

    for (const { q, name } of queries) {
      const outPath = path.join(RUNTIME_DIR, `${name}_${dateId}.json`);
      const cmd = `gh search repos "${q}" --sort stars --limit 20 --json nameWithOwner,description,stargazerCount,url,updatedAt > "${outPath}"`;
      execSync(cmd, { stdio: "ignore" });
    }

    return { status: "success", snapshot: dateId, path: RUNTIME_DIR };
  } catch (err) {
    const statusPath = path.join(RUNTIME_DIR, `scan_status_${dateId}.log`);
    fs.writeFileSync(
      statusPath,
      "toptrend_scan_status = skipped_no_gh_cli\ncontinue_local_implementation = true"
    );
    return { status: "skipped_no_gh_cli", snapshot: dateId };
  }
}

export default runTrendingEvidenceScan;
