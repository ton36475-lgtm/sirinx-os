import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const FORBIDDEN_CANDIDATE_PATTERNS = [
  /^\.env(?:$|\.)/,
  /^\.ghostclaw_runtime(?:\/|$)/,
  /^\.git(?:\/|$)/,
  /^node_modules(?:\/|$)/,
  /^secrets(?:\/|$)/,
  /^customer-data(?:\/|$)/,
  /(^|\/)dist(?:\/|$)/,
  /(^|\/)build(?:\/|$)/,
  /(^|\/)coverage(?:\/|$)/
];
const FORBIDDEN_STATUS_PATH_PATTERNS = [
  /^\.env(?:$|\.)/,
  /^\.ghostclaw_runtime(?:\/|$)/,
  /^\.git(?:\/|$)/,
  /^node_modules(?:\/|$)/,
  /^secrets(?:\/|$)/,
  /^customer-data(?:\/|$)/,
  /(^|\/)node_modules(?:\/|$)/,
  /(^|\/)\.env(?:$|\.)/,
  /(^|\/)secrets(?:\/|$)/,
  /(^|\/)customer-data(?:\/|$)/
];

function parseArgs(argv) {
  const args = {
    manifest: "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json",
    json: "",
    printPathspecs: false,
    root: process.cwd()
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") args.manifest = argv[++index];
    else if (arg === "--json") args.json = argv[++index];
    else if (arg === "--root") args.root = argv[++index];
    else if (arg === "--print-pathspecs") args.printPathspecs = true;
  }

  return args;
}

function unique(values) {
  return [...new Set(values)];
}

function isForbiddenCandidate(pathspec) {
  return FORBIDDEN_CANDIDATE_PATTERNS.some((pattern) => pattern.test(pathspec));
}

export function validateCommitGateManifest(manifest) {
  const failures = [];
  const candidatePathspecs = Array.isArray(manifest.candidate_pathspecs) ? manifest.candidate_pathspecs : [];
  const excludedPathspecs = Array.isArray(manifest.explicitly_excluded_pathspecs) ? manifest.explicitly_excluded_pathspecs : [];
  const requiredEvidence = Array.isArray(manifest.required_evidence) ? manifest.required_evidence : [];

  if (!manifest.gate_id) failures.push("missing_gate_id");
  if (candidatePathspecs.length === 0) failures.push("missing_candidate_pathspecs");
  if (new Set(candidatePathspecs).size !== candidatePathspecs.length) failures.push("duplicate_candidate_pathspecs");

  for (const pathspec of candidatePathspecs) {
    if (pathspec.startsWith("/") || pathspec.includes("..")) failures.push(`unsafe_candidate_pathspec_${pathspec}`);
    if (isForbiddenCandidate(pathspec)) failures.push(`forbidden_candidate_pathspec_${pathspec}`);
  }

  for (const required of [".ghostclaw_runtime/**", ".env", ".env.*", "secrets/**", "customer-data/**"]) {
    if (!excludedPathspecs.includes(required)) failures.push(`missing_exclusion_${required}`);
  }
  if (!requiredEvidence.some((path) => path.includes("A2A2A-P056-PROJECT-QUEUE-FINAL-AUDIT"))) {
    failures.push("missing_p056_final_audit_evidence");
  }
  if (!manifest.suggested_commit_message) failures.push("missing_suggested_commit_message");
  for (const blocked of ["git push", "deploy", "Cloudflare/R2 mutation", "provider call", "Telegram live send"]) {
    if (!manifest.blocked_without_separate_gate?.includes(blocked)) failures.push(`missing_blocked_gate_${blocked}`);
  }

  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    candidate_pathspec_count: candidatePathspecs.length,
    excluded_pathspec_count: excludedPathspecs.length,
    required_evidence_count: requiredEvidence.length,
    failures,
    candidate_pathspecs: candidatePathspecs
  };
}

async function gitStatusForPathspecs(root, pathspecs) {
  const { stdout } = await execFile("git", ["status", "--short", "--", ...pathspecs], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8
  });
  return stdout.split(/\r?\n/).filter(Boolean);
}

function pathFromGitStatusLine(line) {
  return String(line || "").slice(3).replace(/^"|"$/g, "").trim();
}

function forbiddenGitStatusLines(statusLines) {
  return statusLines.filter((line) => {
    const path = pathFromGitStatusLine(line);
    return FORBIDDEN_STATUS_PATH_PATTERNS.some((pattern) => pattern.test(path));
  });
}

async function gitIgnoredPathspecs(root, pathspecs) {
  const ignored = [];
  for (const pathspec of pathspecs) {
    try {
      await execFile("git", ["check-ignore", "-q", "--", pathspec], { cwd: root });
      ignored.push(pathspec);
    } catch {
      // check-ignore exits non-zero when the path is not ignored.
    }
  }
  return ignored;
}

export async function createCommitGateCheck(options = {}) {
  const root = resolve(options.root || process.cwd());
  const manifestPath = resolve(root, options.manifest || "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json");
  const manifest = options.manifestPayload || JSON.parse(await readFile(manifestPath, "utf8"));
  const base = validateCommitGateManifest(manifest);
  const pathspecs = unique(base.candidate_pathspecs || []);
  const statusLines = options.gitStatusLines || (pathspecs.length > 0 ? await gitStatusForPathspecs(root, pathspecs) : []);
  const ignoredPathspecs = options.ignoredPathspecs || (pathspecs.length > 0 ? await gitIgnoredPathspecs(root, pathspecs) : []);
  const forbiddenStatusLines = forbiddenGitStatusLines(statusLines);
  const failures = [...base.failures];

  if (statusLines.length === 0) failures.push("candidate_pathspecs_have_no_git_status_changes");
  for (const ignored of ignoredPathspecs) failures.push(`candidate_pathspec_ignored_${ignored}`);
  for (const line of forbiddenStatusLines) failures.push(`forbidden_git_status_line_${line}`);

  return {
    packet_id: "A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    manifest: options.manifest || "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json",
    candidate_pathspec_count: pathspecs.length,
    git_status_line_count: statusLines.length,
    ignored_pathspecs: ignoredPathspecs,
    forbidden_git_status_lines: forbiddenStatusLines,
    failures,
    git_status_lines: statusLines,
    blocked_actions: manifest.blocked_without_separate_gate || [],
    next_safe_action: failures.length === 0
      ? "Commit gate is review-ready. A separate explicit local commit gate can stage these pathspecs."
      : "Fix commit gate failures before staging."
  };
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(resolve(args.root, args.manifest), "utf8"));

  if (args.printPathspecs) {
    console.log((manifest.candidate_pathspecs || []).join("\n"));
    return;
  }

  const result = await createCommitGateCheck(args);
  if (args.json) await writeJson(resolve(args.root, args.json), result);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "PASS") process.exit(1);
}

const mainPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (mainPath && fileURLToPath(import.meta.url) === mainPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
