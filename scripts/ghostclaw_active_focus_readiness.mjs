import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703.json";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_READINESS_20260703.md";

const requiredScripts = [
  "active-focus:preview-uat",
  "active-focus:preview-uat:test",
  "telegram-error-loop:readiness",
  "telegram-error-loop:readiness:test",
  "ghostclaw-a2a:bus-watch",
  "ghostclaw-a2a:bus-watch:test"
];

const requiredCandidatePathspecs = [
  "apps/sirinx-site",
  "apps/agm-site",
  "apps/agm-autoglow-dashboard",
  "packages/autoglow-core",
  "docs/creative",
  "scripts/ghostclaw_active_focus_readiness.mjs",
  "scripts/ghostclaw_active_focus_readiness.test.mjs",
  DEFAULT_REPORT
];

const forbiddenFocusPathspecs = [
  "apps/kusala-site",
  "apps/phitsanulok-news",
  "services/news-api",
  "packages/types/phitsanulok-news"
];

const requiredEvidence = [
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json",
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json",
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json",
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json"
];

const closedGateKeys = [
  "commit",
  "push",
  "deploy",
  "cloudflare_r2_mutation",
  "provider_call",
  "telegram_live_send",
  "customer_data_external_routing",
  "secret_or_env_read",
  "key_value_print",
  "install"
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

async function readJson(root, path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function tryReadJson(root, path, failures, label) {
  try {
    return await readJson(root, path);
  } catch (error) {
    failures.push(`missing_or_invalid_${label}_${path}: ${error.message}`);
    return null;
  }
}

function pushCheck(checks, name, passed, details = {}) {
  checks.push({ name, passed, ...details });
}

function includesAll(set, values) {
  return values.filter((value) => !set.has(value));
}

function hasNoForbiddenCandidate(candidates) {
  return forbiddenFocusPathspecs.filter((forbidden) =>
    candidates.some((candidate) => candidate === forbidden || candidate.startsWith(`${forbidden}/`))
  );
}

function guardrailsClosedFromArray(values) {
  const set = new Set(values || []);
  return closedGateKeys.filter((key) => !set.has(key));
}

export async function createActiveFocusReadiness(options = {}) {
  const root = resolve(options.root || process.cwd());
  const checks = [];
  const failures = [];

  const packageJson = await tryReadJson(root, "package.json", failures, "package_json");
  const scripts = packageJson?.scripts || {};
  const missingScripts = requiredScripts.filter((scriptName) => !scripts[scriptName]);
  pushCheck(checks, "required_scripts_present", missingScripts.length === 0, { missingScripts });
  for (const scriptName of missingScripts) failures.push(`missing_package_script_${scriptName}`);

  const scope = await tryReadJson(root, "reports/mission/A2A2A_ACTIVE_FOCUS_SCOPE_20260703.json", failures, "active_focus_scope");
  const activeIds = new Set((scope?.active_focus || []).map((item) => item.id));
  const pausedIds = new Set((scope?.paused_out_of_focus || []).map((item) => item.id));
  const missingActive = includesAll(activeIds, ["sirinx.co", "agm-autoflow"]);
  const missingPaused = includesAll(pausedIds, ["kusala", "phitsanulok-news"]);
  pushCheck(checks, "active_focus_scope_locked", missingActive.length === 0 && missingPaused.length === 0, {
    missingActive,
    missingPaused
  });
  for (const id of missingActive) failures.push(`missing_active_focus_${id}`);
  for (const id of missingPaused) failures.push(`missing_paused_focus_${id}`);

  const p062 = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json",
    failures,
    "p062_evidence"
  );
  const p062ChecksOk = p062?.status === "PASS" &&
    p062?.checks?.commands_pass === true &&
    p062?.checks?.local_urls === true &&
    p062?.checks?.sirinx_ready === true &&
    p062?.checks?.autoglow_ready === true &&
    (p062?.sirinx_routes || []).every((route) => route.ok === true) &&
    p062?.agm_autoglow_dashboard?.home?.ok === true &&
    p062?.agm_autoglow_dashboard?.project_api?.ok === true;
  pushCheck(checks, "p062_local_preview_uat_pass", p062ChecksOk, { status: p062?.status });
  if (!p062ChecksOk) failures.push("p062_local_preview_uat_not_ready");
  const missingClosedGates = guardrailsClosedFromArray(p062?.closed_gates);
  pushCheck(checks, "p062_closed_gates_present", missingClosedGates.length === 0, { missingClosedGates });
  for (const gate of missingClosedGates) failures.push(`p062_missing_closed_gate_${gate}`);

  const p065 = await tryReadJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json",
    failures,
    "p065_evidence"
  );
  const p065Ok = p065?.status === "PASS_TELEGRAM_ERROR_LOOP_READINESS" &&
    (p065?.checks || []).every((check) => check.passed === true) &&
    Object.values(p065?.guardrails || {}).every((value) => value === false);
  pushCheck(checks, "p065_telegram_readiness_pass", p065Ok, { status: p065?.status });
  if (!p065Ok) failures.push("p065_telegram_readiness_not_ready");

  const gate = await tryReadJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", failures, "commit_gate");
  const candidates = new Set(gate?.candidate_pathspecs || []);
  const missingCandidates = requiredCandidatePathspecs.filter((pathspec) => !candidates.has(pathspec));
  const forbiddenCandidates = hasNoForbiddenCandidate(gate?.candidate_pathspecs || []);
  pushCheck(checks, "commit_gate_contains_active_focus_readiness_paths", missingCandidates.length === 0, {
    missingCandidates
  });
  pushCheck(checks, "commit_gate_excludes_paused_projects", forbiddenCandidates.length === 0, {
    forbiddenCandidates
  });
  for (const pathspec of missingCandidates) failures.push(`commit_gate_missing_candidate_${pathspec}`);
  for (const pathspec of forbiddenCandidates) failures.push(`commit_gate_forbidden_paused_project_${pathspec}`);
  const requiredEvidenceSet = new Set(gate?.required_evidence || []);
  const missingEvidence = requiredEvidence.filter((pathspec) => !requiredEvidenceSet.has(pathspec));
  pushCheck(checks, "commit_gate_contains_active_focus_runtime_evidence", missingEvidence.length === 0, {
    missingEvidence
  });
  for (const pathspec of missingEvidence) failures.push(`commit_gate_missing_evidence_${pathspec}`);

  const status = failures.length === 0 ? "PASS_ACTIVE_FOCUS_READINESS" : "FAIL_ACTIVE_FOCUS_READINESS";
  return {
    schema: "ghostclaw.a2a2a.active_focus_readiness.v1",
    packet_id: "A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703",
    status,
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_readiness_verifier_no_live_send_no_provider_call_no_deploy",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    checks,
    failures,
    guardrails: {
      telegram_live_send: false,
      provider_call: false,
      paid_model_call: false,
      repo_content_external_routing: false,
      customer_data_external_routing: false,
      secret_read: false,
      secret_value_print: false,
      install: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false
    },
    next_safe_action: status.startsWith("PASS")
      ? "Review the explicit-path local commit gate or rerun active-focus preview UAT before human review."
      : "Fix readiness failures before treating the active-focus slice as locally usable."
  };
}

function renderReport(readiness) {
  const failed = readiness.checks.filter((check) => !check.passed);
  return `# A2A2A Active Focus Readiness - 2026-07-03

## Status

${readiness.status}

## Scope

This verifier checks the currently active local delivery slice:

- \`sirinx.co\` local public site readiness from P062.
- AGM AutoFlow / AutoGlow local preview readiness from P062.
- Telegram error-loop readiness from P065.
- Kusala and Phitsanulok News remain paused/out-of-focus.
- The explicit local commit gate includes the readiness verifier and excludes paused projects.

## Failed Checks

${failed.length === 0 ? "- None" : failed.map((check) => `- ${check.name}`).join("\n")}

## Guardrails

${Object.entries(readiness.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Next Safe Action

${readiness.next_safe_action}
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

export async function writeActiveFocusReadiness(options = {}) {
  const root = resolve(options.root || process.cwd());
  const readiness = await createActiveFocusReadiness(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), readiness);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: readiness.packet_id,
      status: readiness.status,
      created_at: readiness.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      report: options.report || DEFAULT_REPORT,
      guardrails: readiness.guardrails,
      failures: readiness.failures,
      next_safe_action: readiness.next_safe_action
    });
    await writeText(resolve(root, options.report || DEFAULT_REPORT), renderReport(readiness));
  }
  return readiness;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const readiness = await writeActiveFocusReadiness(args);
  console.log(JSON.stringify(readiness, null, 2));
  if (!readiness.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
