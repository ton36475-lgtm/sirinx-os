import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const DEFAULT_OUTPUT = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703.json";

export const DEFAULT_USABILITY_CHECKS = [
  { id: "sirinx_site_build", label: "sirinx.co site build", command: "pnpm", args: ["--filter", "@sirinx/site", "build"] },
  { id: "sirinx_site_check", label: "sirinx.co site check", command: "pnpm", args: ["--filter", "@sirinx/site", "check"] },
  { id: "agm_build", label: "AGM site build", command: "pnpm", args: ["--filter", "@agm/site", "build"] },
  { id: "agm_check", label: "AGM site check", command: "pnpm", args: ["--filter", "@agm/site", "check"] },
  { id: "agm_smoke", label: "AGM local browser smoke", command: "pnpm", args: ["--filter", "@agm/site", "test:smoke"] },
  { id: "agm_autoflow_dashboard_verify", label: "AGM AutoFlow dashboard verify", command: "pnpm", args: ["--filter", "@sirinx/agm-autoglow-dashboard", "verify"] },
  { id: "agm_autoflow_core_test", label: "AGM AutoFlow core tests", command: "pnpm", args: ["--filter", "@sirinx/autoglow-core", "test"] }
];

const SECRET_PATTERN_SOURCES = [
  ["sk", "[A-Za-z0-9_-]+"].join("-"),
  ["sk", "or", "v1", "[A-Za-z0-9_-]+"].join("-"),
  ["ghp", "[A-Za-z0-9_]+"].join("_"),
  ["xoxb", "[A-Za-z0-9-]+"].join("-"),
  ["AK", "IA[A-Z0-9]+"].join("")
];
const SECRET_PATTERNS = SECRET_PATTERN_SOURCES.map((source) => new RegExp(source, "g"));

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    json: DEFAULT_OUTPUT,
    planOnly: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--json") args.json = argv[++index];
    else if (arg === "--plan-only") args.planOnly = true;
  }

  return args;
}

function redact(text = "") {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, "[REDACTED_SECRET]"), String(text));
}

function excerpt(text = "") {
  const clean = redact(text).trim();
  if (clean.length <= 1600) return clean;
  return `${clean.slice(0, 700)}\n...\n${clean.slice(-700)}`;
}

async function runCheck(check, root, runner) {
  const started = Date.now();
  try {
    const result = await runner(check.command, check.args, root);
    return {
      id: check.id,
      label: check.label,
      command: [check.command, ...check.args].join(" "),
      status: "PASS",
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(result.stdout),
      stderr_excerpt: excerpt(result.stderr)
    };
  } catch (error) {
    return {
      id: check.id,
      label: check.label,
      command: [check.command, ...check.args].join(" "),
      status: "FAIL",
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message),
      error: redact(error.message)
    };
  }
}

async function defaultRunner(command, args, root) {
  return execFile(command, args, {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8
  });
}

export async function createProjectAppUsabilityAudit(options = {}) {
  const root = resolve(options.root || process.cwd());
  const checks = options.checks || DEFAULT_USABILITY_CHECKS;

  if (options.planOnly) {
    return {
      packet_id: "A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703",
      status: "PLAN_ONLY",
      repo: root,
      planned_checks: checks.map((check) => ({
        id: check.id,
        label: check.label,
        command: [check.command, ...check.args].join(" ")
      }))
    };
  }

  const runner = options.runner || defaultRunner;
  const results = [];
  for (const check of checks) {
    results.push(await runCheck(check, root, runner));
  }

  const failedChecks = results.filter((result) => result.status !== "PASS");
  return {
    packet_id: "A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703",
    title: "GhostClaw Project App Usability Audit",
    timestamp: new Date().toISOString(),
    repo: root,
    mode: "local_safe_app_usability_no_external_mutation",
    status: failedChecks.length === 0 ? "PASS" : "FAIL",
    summary: {
      total_checks: results.length,
      passed_checks: results.filter((result) => result.status === "PASS").length,
      failed_checks: failedChecks.length,
      apps_checked: ["@sirinx/site", "@agm/site", "@sirinx/agm-autoglow-dashboard", "@sirinx/autoglow-core"]
    },
    results,
    guardrails: {
      install: false,
      provider_call: false,
      live_send: false,
      customer_data_external_routing: false,
      push: false,
      deploy: false,
      cloud_mutation: false,
      secret_read: false,
      key_value_print: false
    },
    next_safe_action: failedChecks.length === 0
      ? "Use this evidence with the local commit gate, or open a separate explicit commit gate."
      : "Fix failed local usability checks before commit or release review."
  };
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await createProjectAppUsabilityAudit(args);

  if (args.json && !args.planOnly) {
    await writeJson(resolve(args.root, args.json), result);
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "FAIL") process.exit(1);
}

const mainPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (mainPath && fileURLToPath(import.meta.url) === mainPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
