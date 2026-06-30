import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const DEFAULT_RUNTIME_DIR = "/Users/sirinx/sirinx-os/.ghostclaw_runtime/research/github_trending";

export const TOPICS = [
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

export const OUTPUT_METADATA_FIELDS = [
  "nameWithOwner",
  "description",
  "stargazerCount",
  "url",
  "updatedAt"
];

export const ALLOWED_METADATA_FIELDS = OUTPUT_METADATA_FIELDS;

export const GH_JSON_FIELDS = [
  "fullName",
  "description",
  "stargazersCount",
  "url",
  "updatedAt",
  "visibility"
];

export const BLOCKED_ACTIONS = [
  "clone_trending_repo",
  "install_trending_repo_packages",
  "execute_unknown_code",
  "read_tokens",
  "print_tokens",
  "bypass_rate_limits"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function timestampId(date = new Date()) {
  return date.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function safeTopicName(topic) {
  return topic.replace(/[^a-z0-9]/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function ghEnv(extraEnv = {}) {
  return {
    ...process.env,
    ...extraEnv,
    GH_PROMPT_DISABLED: "1"
  };
}

function runGh(spawn, args, options = {}) {
  return spawn("gh", args, {
    encoding: "utf8",
    timeout: options.timeoutMs ?? 20000,
    env: ghEnv(options.env),
    maxBuffer: 1024 * 1024
  });
}

function statusRecord(reason, dateId, runtimeDir) {
  const statusPath = path.join(runtimeDir, `scan_status_${dateId}.json`);
  const record = {
    schema: "ghostclaw.github_toptrend_status.v1",
    status: "setup_required",
    reason,
    continue_local_implementation: true,
    no_clone: true,
    no_install: true,
    no_execute_unknown_code: true,
    no_token_read_or_print: true
  };
  fs.writeFileSync(statusPath, `${JSON.stringify(record, null, 2)}\n`);
  return statusPath;
}

function normalizeRepoRecord(record) {
  return {
    nameWithOwner: record.nameWithOwner ?? record.fullName ?? null,
    description: record.description ?? null,
    stargazerCount: Number.isFinite(record.stargazerCount)
      ? record.stargazerCount
      : Number.isFinite(record.stargazersCount)
        ? record.stargazersCount
        : null,
    url: record.url ?? null,
    updatedAt: record.updatedAt ?? null
  };
}

function writeManifest(runtimeDir, dateId, manifest) {
  const snapshotPath = path.join(runtimeDir, `toptrend_${dateId}.json`);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return snapshotPath;
}

export function checkGhPublicMetadataReadiness(options = {}) {
  const spawn = options.spawn ?? spawnSync;

  const version = runGh(spawn, ["--version"], options);
  if (version.status !== 0) {
    return { ready: false, reason: "gh_cli_missing_or_unavailable" };
  }

  const auth = runGh(spawn, ["auth", "status"], options);
  if (auth.status !== 0) {
    return { ready: false, reason: "gh_auth_unavailable_without_secret_read" };
  }

  return { ready: true, reason: "gh_cli_available_and_auth_status_ok" };
}

/**
 * GitHub Toptrend Research Worker
 * Mode: public_metadata_only
 * Allowed: `gh search repos` metadata fields only
 * Blocked: clone, install, execute unknown code, read/print tokens, bypass rate limits
 * Output: .ghostclaw_runtime/research/github_trending/
 */
export function runGithubToptrendResearch(options = {}) {
  const runtimeDir = options.runtimeDir ?? DEFAULT_RUNTIME_DIR;
  const topics = options.topics ?? TOPICS;
  const spawn = options.spawn ?? spawnSync;
  const dateId = timestampId(options.now ?? new Date());
  const limit = options.limit ?? 20;

  ensureDir(runtimeDir);

  const manifest = {
    schema: "ghostclaw.github_toptrend_snapshot.v2",
    source: "github_search_public_metadata",
    mode: "public_metadata_only",
    status: "setup_required",
    timestamp: (options.now ?? new Date()).toISOString(),
    topics,
    gh_json_fields: GH_JSON_FIELDS,
    allowed_metadata_fields: OUTPUT_METADATA_FIELDS,
    output_dir: ".ghostclaw_runtime/research/github_trending/",
    blocked_actions: BLOCKED_ACTIONS,
    safety_flags: {
      no_clone: true,
      no_install: true,
      no_execute_unknown_code: true,
      no_token_read: true,
      no_token_print: true,
      no_rate_limit_bypass: true
    }
  };

  const readiness = checkGhPublicMetadataReadiness({ ...options, spawn });
  if (!readiness.ready) {
    manifest.status = "setup_required";
    manifest.reason = readiness.reason;
    const snapshotPath = writeManifest(runtimeDir, dateId, manifest);
    const statusPath = statusRecord(readiness.reason, dateId, runtimeDir);
    return {
      status: "setup_required",
      reason: readiness.reason,
      snapshot: dateId,
      path: runtimeDir,
      snapshot_path: snapshotPath,
      status_path: statusPath
    };
  }

  const topic_results = [];
  for (const topic of topics) {
    const safeName = safeTopicName(topic);
    const outPath = path.join(runtimeDir, `${safeName}_${dateId}.json`);
    const args = [
      "search",
      "repos",
      topic,
      "--sort",
      "stars",
      "--visibility",
      "public",
      "--limit",
      String(limit),
      "--json",
      GH_JSON_FIELDS.join(",")
    ];

    const result = runGh(spawn, args, options);
    if (result.status !== 0) {
      topic_results.push({ topic, status: "skipped", reason: "gh_search_failed_or_rate_limited" });
      continue;
    }

    let rows;
    try {
      rows = JSON.parse(result.stdout || "[]");
    } catch {
      topic_results.push({ topic, status: "skipped", reason: "invalid_public_metadata_json" });
      continue;
    }

    const repos = Array.isArray(rows) ? rows.map(normalizeRepoRecord) : [];
    fs.writeFileSync(outPath, `${JSON.stringify({
      schema: "ghostclaw.github_toptrend_topic.v1",
      topic,
      mode: "public_metadata_only",
      gh_json_fields: GH_JSON_FIELDS,
      allowed_metadata_fields: OUTPUT_METADATA_FIELDS,
      repos,
      blocked_actions: BLOCKED_ACTIONS
    }, null, 2)}\n`);
    topic_results.push({ topic, status: "written", count: repos.length, path: outPath });
  }

  manifest.status = topic_results.some((entry) => entry.status === "written")
    ? "completed_public_metadata_only"
    : "setup_required";
  manifest.topic_results = topic_results;
  const snapshotPath = writeManifest(runtimeDir, dateId, manifest);

  return {
    status: manifest.status,
    snapshot: dateId,
    path: runtimeDir,
    snapshot_path: snapshotPath,
    topics: topics.length,
    topic_results
  };
}

export default runGithubToptrendResearch;
