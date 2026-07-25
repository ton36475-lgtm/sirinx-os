import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_REVIEW_READY_20260703.md";
const COMMIT_GATE_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";

const focusedTestFiles = [
  "services/dev-control-api/src/telegram-command-router.test.mjs",
  "scripts/ghostclaw_telegram_error_loop_a2a2a_sync.test.mjs",
  "scripts/ghostclaw_active_focus_local_preview_uat.test.mjs",
  "scripts/ghostclaw_active_focus_readiness.test.mjs",
  "scripts/ghostclaw_active_focus_operator_packet.test.mjs",
  "scripts/ghostclaw_active_focus_full_local_check.test.mjs",
  "scripts/ghostclaw_active_focus_review_ready.test.mjs",
  "scripts/ghostclaw_telegram_error_loop_readiness.test.mjs",
  "scripts/ghostclaw_local_commit_gate_check.test.mjs",
  "scripts/ghostclaw_local_commit_helper.test.mjs",
  "scripts/ghostclaw_project_app_usability_audit.test.mjs"
];

export const reviewReadyCommands = [
  {
    id: "active_focus_full_local_check",
    kind: "exec",
    bin: "pnpm",
    args: ["active-focus:full-local-check"],
    display: "pnpm active-focus:full-local-check"
  },
  {
    id: "focused_vitest",
    kind: "exec",
    bin: "./node_modules/.bin/vitest",
    args: ["run", ...focusedTestFiles],
    display: `./node_modules/.bin/vitest run ${focusedTestFiles.join(" ")}`
  },
  {
    id: "scoped_diff_check",
    kind: "scoped_diff_check",
    display:
      "git diff --check -- $(node scripts/ghostclaw_local_commit_gate_check.mjs --manifest reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json --print-pathspecs)"
  },
  {
    id: "required_json_parse",
    kind: "required_json_parse",
    display: "parse local commit gate required JSON evidence and receipts"
  },
  {
    id: "bounded_secret_scan",
    kind: "exec",
    bin: "node",
    args: ["scripts/secret-scan.mjs"],
    display: "node scripts/secret-scan.mjs"
  }
];

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    evidence: DEFAULT_EVIDENCE,
    receipt: DEFAULT_RECEIPT,
    report: DEFAULT_REPORT,
    noWrite: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--evidence") args.evidence = argv[++index];
    else if (arg === "--receipt") args.receipt = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
    else if (arg === "--no-write") args.noWrite = true;
  }
  return args;
}

function excerpt(value, maxLength = 1200) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

async function readJson(root, path, failures, label) {
  try {
    return JSON.parse(await readFile(resolve(root, path), "utf8"));
  } catch (error) {
    failures.push(`missing_or_invalid_${label}_${path}: ${error.message}`);
    return null;
  }
}

async function defaultExec(command, root) {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execFile(command.bin, command.args, {
      cwd: root,
      maxBuffer: 1024 * 1024 * 30
    });
    return {
      id: command.id,
      command: command.display,
      status: "PASS",
      exit_code: 0,
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(stdout),
      stderr_excerpt: excerpt(stderr)
    };
  } catch (error) {
    return {
      id: command.id,
      command: command.display,
      status: "FAIL",
      exit_code: typeof error.code === "number" ? error.code : 1,
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message)
    };
  }
}

async function runScopedDiffCheck(command, root) {
  const started = Date.now();
  try {
    const { stdout } = await execFile(
      "node",
      ["scripts/ghostclaw_local_commit_gate_check.mjs", "--manifest", COMMIT_GATE_MANIFEST, "--print-pathspecs"],
      { cwd: root, maxBuffer: 1024 * 1024 * 4 }
    );
    const pathspecs = stdout.split(/\r?\n/).filter(Boolean);
    const result = await execFile("git", ["diff", "--check", "--", ...pathspecs], {
      cwd: root,
      maxBuffer: 1024 * 1024 * 8
    });
    return {
      id: command.id,
      command: command.display,
      status: "PASS",
      exit_code: 0,
      duration_ms: Date.now() - started,
      pathspec_count: pathspecs.length,
      stdout_excerpt: excerpt(result.stdout),
      stderr_excerpt: excerpt(result.stderr)
    };
  } catch (error) {
    return {
      id: command.id,
      command: command.display,
      status: "FAIL",
      exit_code: typeof error.code === "number" ? error.code : 1,
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message)
    };
  }
}

function requiredJsonPaths(manifest) {
  const required = Array.isArray(manifest?.required_evidence) ? manifest.required_evidence : [];
  return [
    COMMIT_GATE_MANIFEST,
    ...required.filter((path) => path !== DEFAULT_EVIDENCE && path !== DEFAULT_RECEIPT && path.endsWith(".json"))
  ];
}

async function runRequiredJsonParse(command, root, manifest) {
  const started = Date.now();
  const failures = [];
  const paths = requiredJsonPaths(manifest);
  const required = Array.isArray(manifest?.required_evidence) ? manifest.required_evidence : [];
  const skippedNonJson = required.filter((path) => path !== DEFAULT_EVIDENCE && path !== DEFAULT_RECEIPT && !path.endsWith(".json"));
  for (const path of paths) {
    try {
      JSON.parse(await readFile(resolve(root, path), "utf8"));
    } catch (error) {
      failures.push(`${path}: ${error.message}`);
    }
  }
  return {
    id: command.id,
    command: command.display,
    status: failures.length === 0 ? "PASS" : "FAIL",
    exit_code: failures.length === 0 ? 0 : 1,
    duration_ms: Date.now() - started,
    json_file_count: paths.length,
    skipped_non_json_required_paths: skippedNonJson,
    failures,
    stdout_excerpt: failures.length === 0 ? `OK ${paths.length} JSON files; skipped ${skippedNonJson.length} non-JSON required paths` : "",
    stderr_excerpt: excerpt(failures.join("\n"))
  };
}

async function runReviewCommand(command, root, manifest) {
  if (command.kind === "scoped_diff_check") return runScopedDiffCheck(command, root);
  if (command.kind === "required_json_parse") return runRequiredJsonParse(command, root, manifest);
  return defaultExec(command, root);
}

function allFalse(object) {
  return Object.values(object || {}).every((value) => value === false);
}

function makeTelegramSafeDraft({ fullLocalCheck, gateCheck, helper }) {
  return [
    "Hermes Review Ready",
    `status: ${fullLocalCheck?.status || "unknown"}`,
    "scope: sirinx.co + AGM AutoFlow only",
    "paused: Kusala + Phitsanulok News",
    `commit_gate: ${gateCheck?.status || "unknown"} (${gateCheck?.candidate_pathspec_count || 0} pathspecs)`,
    `commit_helper: ${helper?.status || "unknown"} (dry_run=true, executed=${helper?.executed === true})`,
    "next: review explicit-path local commit gate; do not push/deploy/live-send/provider-call",
    "live_send=false; provider_call=false; external_message_send=false; commit=false; push=false; deploy=false; cloudflare_r2_mutation=false; secret_read=false; install=false"
  ].join("\n");
}

export async function createActiveFocusReviewReady(options = {}) {
  const root = resolve(options.root || process.cwd());
  const failures = [];
  const commands = [];
  const runCommand = options.runCommand || ((command, manifest) => runReviewCommand(command, root, manifest));
  let manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest");

  for (const command of reviewReadyCommands) {
    const result = await runCommand(command, manifest);
    commands.push(result);
    if (result.status !== "PASS") failures.push(`command_failed_${command.id}`);
    if (options.stopOnFailure !== false && result.status !== "PASS") break;
    if (command.id === "active_focus_full_local_check") {
      manifest = await readJson(root, COMMIT_GATE_MANIFEST, failures, "commit_manifest_after_full_check");
    }
  }

  const fullLocalCheck = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json",
    failures,
    "p068_full_local_check"
  );
  const gateCheck = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json",
    failures,
    "p057_gate_check"
  );
  const helper = await readJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json",
    failures,
    "p058_commit_helper"
  );

  const fullLocalOk =
    fullLocalCheck?.status === "PASS_FULL_LOCAL_CHECK_READY" &&
    (fullLocalCheck?.checks || []).every((check) => check.passed === true) &&
    allFalse(fullLocalCheck?.guardrails);
  const gateOk = gateCheck?.status === "PASS" && gateCheck?.failures?.length === 0;
  const helperOk = helper?.status === "PASS" && helper?.executed === false && helper?.failures?.length === 0;
  const manifestOk =
    Array.isArray(manifest?.candidate_pathspecs) &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_review_ready.mjs") &&
    manifest.candidate_pathspecs.includes("scripts/ghostclaw_active_focus_review_ready.test.mjs") &&
    manifest.candidate_pathspecs.includes("reports/mission/A2A2A_ACTIVE_FOCUS_REVIEW_READY_20260703.md") &&
    Array.isArray(manifest?.required_evidence) &&
    manifest.required_evidence.includes(DEFAULT_EVIDENCE) &&
    manifest.required_evidence.includes(DEFAULT_RECEIPT);

  const checks = [
    {
      name: "all_review_commands_passed",
      passed: commands.length === reviewReadyCommands.length && commands.every((command) => command.status === "PASS"),
      commandCount: commands.length
    },
    { name: "p068_full_local_check_pass", passed: fullLocalOk, status: fullLocalCheck?.status },
    {
      name: "p057_gate_check_pass",
      passed: gateOk,
      status: gateCheck?.status,
      candidatePathspecs: gateCheck?.candidate_pathspec_count,
      gitStatusLines: gateCheck?.git_status_line_count
    },
    { name: "p058_helper_dry_run_pass", passed: helperOk, status: helper?.status, executed: helper?.executed },
    { name: "commit_manifest_contains_review_ready", passed: manifestOk }
  ];

  for (const check of checks) {
    if (!check.passed) failures.push(check.name);
  }

  const status = failures.length === 0 ? "PASS_REVIEW_READY" : "FAIL_REVIEW_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_review_ready.v1",
    packet_id: "A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_review_ready_no_live_send_no_provider_call_no_deploy",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    commands,
    checks,
    failures,
    telegram_safe_draft: makeTelegramSafeDraft({ fullLocalCheck, gateCheck, helper }),
    guardrails: {
      live_send: false,
      provider_call: false,
      external_message_send: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false,
      secret_read: false,
      install: false
    },
    next_safe_action:
      status === "PASS_REVIEW_READY"
        ? "Review the explicit-path local commit gate. Open a separate exact gate for local commit, live send, provider call, push, deploy, or Cloudflare/R2 mutation."
        : "Fix review-ready failures before using this as the operator handoff."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Review Ready - 2026-07-03

## Status

${packet.status}

## Purpose

Local review-ready bundle for the active delivery slice. This wraps P068 plus focused tests, scoped diff check, required JSON parse, and bounded secret scan.

## Commands

${packet.commands.map((command) => `- ${command.status}: \`${command.command}\``).join("\n")}

## Telegram-Safe Draft

\`\`\`text
${packet.telegram_safe_draft}
\`\`\`

## Checks

${packet.checks.map((check) => `- ${check.name}: ${check.passed}`).join("\n")}

## Failures

${packet.failures.length === 0 ? "- None" : packet.failures.map((failure) => `- ${failure}`).join("\n")}

## Guardrails

${Object.entries(packet.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}
`;
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

export async function writeActiveFocusReviewReady(options = {}) {
  const root = resolve(options.root || process.cwd());
  const reportPath = resolve(root, options.report || DEFAULT_REPORT);
  if (!options.noWrite) {
    await writeText(reportPath, "# A2A2A Active Focus Review Ready - 2026-07-03\n\n## Status\n\nRUNNING_LOCAL_REVIEW_READY_CHECK\n");
  }
  const packet = await createActiveFocusReviewReady(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      command_count: packet.commands.length,
      checks: packet.checks,
      failures: packet.failures,
      guardrails: packet.guardrails,
      next_safe_action: packet.next_safe_action
    });
    await writeText(reportPath, renderReport(packet));
  }
  return packet;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = await writeActiveFocusReviewReady(args);
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
