import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createCommitGateCheck } from "./ghostclaw_local_commit_gate_check.mjs";

const execFile = promisify(execFileCallback);
const DEFAULT_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";
const DEFAULT_EVIDENCE = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    manifest: DEFAULT_MANIFEST,
    json: "",
    printStageCommand: false,
    printCommitCommand: false,
    executeLocalCommit: false,
    confirmLocalCommit: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--manifest") args.manifest = argv[++index];
    else if (arg === "--json") args.json = argv[++index];
    else if (arg === "--print-stage-command") args.printStageCommand = true;
    else if (arg === "--print-commit-command") args.printCommitCommand = true;
    else if (arg === "--execute-local-commit") args.executeLocalCommit = true;
    else if (arg === "--confirm-local-commit") args.confirmLocalCommit = true;
  }

  return args;
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

export function buildGitAddCommand(pathspecs) {
  return `git add -- ${pathspecs.map(shellQuote).join(" ")}`;
}

export function buildGitCommitCommand(message) {
  return `git commit -m ${shellQuote(message)}`;
}

export function createLocalCommitPlan(manifest, gateCheck) {
  const pathspecs = manifest.candidate_pathspecs || [];
  const commitMessage = manifest.suggested_commit_message || "feat(ghostclaw): add validated project queue delivery batch";
  const failures = [];

  if (gateCheck.status !== "PASS") failures.push("commit_gate_check_not_pass");
  if (pathspecs.length === 0) failures.push("missing_candidate_pathspecs");
  if (gateCheck.ignored_pathspecs?.length > 0) failures.push("ignored_candidate_pathspecs_present");

  return {
    packet_id: "A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    mode: "dry_run_by_default",
    manifest: DEFAULT_MANIFEST,
    candidate_pathspec_count: pathspecs.length,
    git_status_line_count: gateCheck.git_status_line_count || 0,
    commit_message: commitMessage,
    commands: {
      stage: buildGitAddCommand(pathspecs),
      cached_diff_check: "git diff --cached --check",
      commit: buildGitCommitCommand(commitMessage)
    },
    blocked_actions: [
      "git push",
      "deploy",
      "Cloudflare/R2 mutation",
      "provider call",
      "Telegram live send",
      "secret value print",
      ".env read"
    ],
    execution_guard: {
      default_executes_commit: false,
      required_flag: "--execute-local-commit",
      required_confirmation_flag: "--confirm-local-commit",
      required_environment_variable: "GHOSTCLAW_ALLOW_LOCAL_COMMIT=1"
    },
    failures,
    next_safe_action: failures.length === 0
      ? "Review printed commands, then run helper with explicit local commit flags only if local commit is approved."
      : "Fix commit helper failures before staging."
  };
}

async function readManifest(root, manifestPath) {
  const absolute = resolve(root, manifestPath);
  return JSON.parse(await readFile(absolute, "utf8"));
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function executeLocalCommit(root, manifest, plan, args) {
  if (!args.confirmLocalCommit) {
    return {
      ...plan,
      status: "BLOCKED",
      failures: [...plan.failures, "missing_confirm_local_commit_flag"],
      executed: false
    };
  }
  if (process.env.GHOSTCLAW_ALLOW_LOCAL_COMMIT !== "1") {
    return {
      ...plan,
      status: "BLOCKED",
      failures: [...plan.failures, "missing_GHOSTCLAW_ALLOW_LOCAL_COMMIT_env"],
      executed: false
    };
  }
  if (plan.status !== "PASS") {
    return {
      ...plan,
      status: "BLOCKED",
      failures: [...plan.failures, "plan_not_pass"],
      executed: false
    };
  }

  await execFile("git", ["add", "--", ...manifest.candidate_pathspecs], { cwd: root, maxBuffer: 1024 * 1024 * 8 });
  await execFile("git", ["diff", "--cached", "--check"], { cwd: root, maxBuffer: 1024 * 1024 * 8 });
  const { stdout, stderr } = await execFile("git", ["commit", "-m", plan.commit_message], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8
  });

  return {
    ...plan,
    status: "COMMITTED",
    executed: true,
    git_commit_stdout: stdout.trim(),
    git_commit_stderr: stderr.trim()
  };
}

export async function runLocalCommitHelper(options = {}) {
  const root = resolve(options.root || process.cwd());
  const manifestPath = options.manifest || DEFAULT_MANIFEST;
  const manifest = await readManifest(root, manifestPath);
  const gateCheck = await createCommitGateCheck({ root, manifest: manifestPath });
  const plan = {
    ...createLocalCommitPlan(manifest, gateCheck),
    manifest: manifestPath
  };

  if (options.executeLocalCommit) {
    return executeLocalCommit(root, manifest, plan, options);
  }

  return {
    ...plan,
    executed: false
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runLocalCommitHelper(args);

  if (args.printStageCommand) {
    console.log(result.commands.stage);
  } else if (args.printCommitCommand) {
    console.log(`${result.commands.cached_diff_check}\n${result.commands.commit}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  if (args.json) await writeJson(resolve(args.root, args.json || DEFAULT_EVIDENCE), result);
  if (result.status === "FAIL" || result.status === "BLOCKED") process.exit(1);
}

const mainPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (mainPath && fileURLToPath(import.meta.url) === mainPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
