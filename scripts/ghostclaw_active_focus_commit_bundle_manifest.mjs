import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);

const PACKET_ID = "A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703";
const DEFAULT_EVIDENCE = `.ghostclaw_runtime/a2a2a/evidence/${PACKET_ID}.json`;
const DEFAULT_MANIFEST_JSON = ".ghostclaw_runtime/a2a2a/evidence/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.json";
const DEFAULT_RECEIPT = `.ghostclaw_runtime/a2a2a/receipts/${PACKET_ID}.json`;
const DEFAULT_HOME_RECEIPT = "~/.ghostclaw/receipts/p076a_active_focus_commit_bundle_manifest_20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.md";
const DEFAULT_MANIFEST = "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json";
const P075_EVIDENCE =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json";

const FORBIDDEN_PATTERNS = [
  /^\.env(?:$|\.)/,
  /^\.ghostclaw_runtime(?:\/|$)/,
  /^\.git(?:\/|$)/,
  /^node_modules(?:\/|$)/,
  /^secrets(?:\/|$)/,
  /^customer-data(?:\/|$)/,
  /(^|\/)node_modules(?:\/|$)/,
  /(^|\/)\.env(?:$|\.)/,
  /(^|\/)secrets(?:\/|$)/,
  /(^|\/)customer-data(?:\/|$)/,
  /(^|\/)dist(?:\/|$)/,
  /(^|\/)build(?:\/|$)/,
  /(^|\/)coverage(?:\/|$)/
];

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    manifest: DEFAULT_MANIFEST,
    p075Evidence: P075_EVIDENCE,
    evidence: DEFAULT_EVIDENCE,
    manifestJson: DEFAULT_MANIFEST_JSON,
    receipt: DEFAULT_RECEIPT,
    homeReceipt: DEFAULT_HOME_RECEIPT,
    report: DEFAULT_REPORT,
    markVerificationPassed: false,
    fullDiffCheckNote: "",
    noWrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--manifest") args.manifest = argv[++index];
    else if (arg === "--p075-evidence") args.p075Evidence = argv[++index];
    else if (arg === "--evidence") args.evidence = argv[++index];
    else if (arg === "--manifest-json") args.manifestJson = argv[++index];
    else if (arg === "--receipt") args.receipt = argv[++index];
    else if (arg === "--home-receipt") args.homeReceipt = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
    else if (arg === "--mark-verification-passed") args.markVerificationPassed = true;
    else if (arg === "--full-diff-check-note") args.fullDiffCheckNote = argv[++index];
    else if (arg === "--no-write") args.noWrite = true;
  }

  return args;
}

function unique(values) {
  return [...new Set(values)];
}

function isForbiddenPath(path) {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(path));
}

function validatePathspec(pathspec) {
  if (!pathspec || typeof pathspec !== "string") return "empty_or_non_string_pathspec";
  if (pathspec.startsWith("/") || pathspec.includes("..")) return `unsafe_pathspec_${pathspec}`;
  if (isForbiddenPath(pathspec)) return `forbidden_pathspec_${pathspec}`;
  return "";
}

function validateP075(p075) {
  const failures = [];
  if (p075?.status !== "PASS_FINAL_LOCAL_REVIEW_READY") failures.push("p075_not_pass_final_local_review_ready");
  if (!(p075?.checks || []).every((check) => check.passed === true)) failures.push("p075_checks_not_all_passed");
  if (!Object.values(p075?.guardrails || {}).every((value) => value === false)) failures.push("p075_guardrails_not_closed");
  return failures;
}

function validateManifest(manifest) {
  const failures = [];
  const pathspecs = Array.isArray(manifest?.candidate_pathspecs) ? manifest.candidate_pathspecs : [];
  if (pathspecs.length === 0) failures.push("missing_candidate_pathspecs");
  if (new Set(pathspecs).size !== pathspecs.length) failures.push("duplicate_candidate_pathspecs");
  for (const pathspec of pathspecs) {
    const failure = validatePathspec(pathspec);
    if (failure) failures.push(failure);
  }
  for (const required of [
    "scripts/ghostclaw_active_focus_commit_bundle_manifest.mjs",
    "scripts/ghostclaw_active_focus_commit_bundle_manifest.test.mjs"
  ]) {
    if (!pathspecs.includes(required)) failures.push(`missing_p076_candidate_pathspec_${required}`);
  }
  for (const required of [DEFAULT_EVIDENCE, DEFAULT_RECEIPT]) {
    if (!(manifest?.required_evidence || []).includes(required)) failures.push(`missing_p076_required_evidence_${required}`);
  }
  return failures;
}

async function gitBranch(root) {
  const { stdout } = await execFile("git", ["branch", "--show-current"], { cwd: root });
  return stdout.trim();
}

async function gitHeadSha(root) {
  const { stdout } = await execFile("git", ["rev-parse", "--short", "HEAD"], { cwd: root });
  return stdout.trim();
}

async function gitStatusEntries(root, pathspecs) {
  const { stdout } = await execFile("git", ["status", "--porcelain=v1", "-uall", "--", ...pathspecs], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 16
  });
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawStatus = line.slice(0, 2);
      let path = line.slice(3).replace(/^"|"$/g, "").trim();
      if (rawStatus.includes("R") && path.includes(" -> ")) path = path.split(" -> ").pop();
      return {
        path,
        git_status: rawStatus.trim() || rawStatus
      };
    });
}

async function gitListChangedFiles(root, pathspecs) {
  const entries = await gitStatusEntries(root, pathspecs);
  return unique(entries.map((entry) => entry.path)).sort();
}

function statusMap(entries) {
  return new Map(entries.map((entry) => [entry.path, entry.git_status]));
}

function scopeForPath(path) {
  if (path.startsWith("apps/sirinx-site/")) return "sirinx.co";
  if (path.startsWith("apps/agm-site/")) return "AGM AutoFlow";
  if (path.startsWith("apps/agm-autoglow-dashboard/")) return "AGM AutoFlow";
  if (path.startsWith("packages/autoglow-core/")) return "AGM AutoFlow";
  if (path.includes("AGM") || path.includes("agm")) return "AGM AutoFlow";
  return "shared_active_infra";
}

function laneForPath(path) {
  if (path.startsWith("apps/")) return "active_focus_app";
  if (path.startsWith("packages/")) return "active_focus_package";
  if (path.startsWith("services/")) return "telegram_error_loop_guard";
  if (path.startsWith("scripts/")) return "a2a2a_local_validation";
  if (path.startsWith("reports/")) return "receipt_evidence";
  if (path.startsWith("docs/")) return "active_focus_docs";
  return "shared_active_infra";
}

function reviewNoteForPath(path) {
  if (path.startsWith("docs/creative/") && !path.toLowerCase().includes("agm")) {
    return "Included by existing docs/creative active-focus pathspec; review before commit.";
  }
  if (path === "package.json") return "Shared workspace script/config surface; review before commit.";
  return "Review required before local commit.";
}

function isPausedOutOfScope(path) {
  return /kusala|กุศลา|final[-_ ]?farewell|phitsanulok|พิษณุโลก/i.test(path);
}

async function fileRecord(root, path) {
  if (isForbiddenPath(path)) {
    return {
      path,
      forbidden: true,
      deleted: false
    };
  }

  try {
    const absolute = resolve(root, path);
    const [info, content] = await Promise.all([stat(absolute), readFile(absolute)]);
    return {
      path,
      bytes: info.size,
      sha256: createHash("sha256").update(content).digest("hex"),
      deleted: false,
      forbidden: false
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        path,
        bytes: 0,
        sha256: null,
        deleted: true,
        forbidden: false
      };
    }
    throw error;
  }
}

async function candidateFileRecord(root, path, gitStatus) {
  const record = await fileRecord(root, path);
  return {
    path: record.path,
    git_status: gitStatus || "unknown",
    sha256: record.sha256,
    bytes: record.bytes || 0,
    lane: laneForPath(path),
    scope: scopeForPath(path),
    review_required: true,
    review_note: reviewNoteForPath(path),
    deleted: record.deleted,
    forbidden: record.forbidden
  };
}

export async function createCommitBundleManifest(options = {}) {
  const root = resolve(options.root || process.cwd());
  const manifestPath = options.manifest || DEFAULT_MANIFEST;
  const p075Path = options.p075Evidence || P075_EVIDENCE;
  const manifest = options.manifestPayload || JSON.parse(await readFile(resolve(root, manifestPath), "utf8"));
  const p075 = options.p075Payload || JSON.parse(await readFile(resolve(root, p075Path), "utf8"));
  const candidatePathspecs = unique(manifest.candidate_pathspecs || []);
  const failures = [...validateManifest(manifest), ...validateP075(p075)];
  const gitEntries = options.gitEntries || (candidatePathspecs.length > 0 ? await gitStatusEntries(root, candidatePathspecs) : []);
  const gitStatusByPath = statusMap(gitEntries);
  const changedFiles = options.changedFiles || unique(gitEntries.map((entry) => entry.path)).sort();
  const fileRecords = await Promise.all(changedFiles.map((path) => candidateFileRecord(root, path, gitStatusByPath.get(path))));
  const forbiddenFiles = fileRecords.filter((record) => record.forbidden).map((record) => record.path);
  const pausedFiles = fileRecords.filter((record) => isPausedOutOfScope(record.path)).map((record) => record.path);
  const branch = options.branch || (options.skipGitMeta ? "" : await gitBranch(root));
  const headSha = options.baseSha || (options.skipGitMeta ? "" : await gitHeadSha(root));

  for (const path of forbiddenFiles) failures.push(`forbidden_changed_file_${path}`);
  for (const path of pausedFiles) failures.push(`paused_out_of_scope_changed_file_${path}`);
  if (changedFiles.length === 0) failures.push("no_changed_files_in_commit_bundle");

  const status = failures.length === 0 ? "PASS_COMMIT_BUNDLE_MANIFEST_READY" : "FAIL_COMMIT_BUNDLE_MANIFEST_NOT_READY";
  return {
    schema: "ghostclaw.a2a2a.active_focus_commit_bundle_manifest.v1",
    mission_id: "GHOSTCLAW-P076A-ACTIVE-FOCUS-COMMIT-BUNDLE-20260703",
    packet_id: PACKET_ID,
    gate: "P076A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST",
    status,
    final_status: status === "PASS_COMMIT_BUNDLE_MANIFEST_READY"
      ? "P076A_COMMIT_BUNDLE_MANIFEST_READY_FOR_OPENCODE_REVIEW"
      : "P076A_COMMIT_BUNDLE_MANIFEST_BLOCKED_WITH_FINDINGS",
    created_at: options.createdAt || new Date().toISOString(),
    mode: "local_only_no_commit",
    repo: root,
    branch,
    base_sha: headSha,
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_scope: ["Kusala", "กุศลา", "Final Farewell", "Phitsanulok News", "Phitsanulok United News"],
    source_gate: "P075_PASS_FINAL_LOCAL_REVIEW_READY",
    source_manifest: manifestPath,
    source_final_review: p075Path,
    local_commit_gate: {
      pathspec_count: candidatePathspecs.length,
      scoped_git_status_lines: p075?.commit_gate_summary?.git_status_lines || gitEntries.length,
      commit_allowed: false,
      push_allowed: false,
      deploy_allowed: false,
      cloudflare_mutation_allowed: false,
      telegram_live_send_allowed: false
    },
    candidate_pathspec_count: candidatePathspecs.length,
    changed_file_count: changedFiles.length,
    deleted_file_count: fileRecords.filter((record) => record.deleted).length,
    total_bytes: fileRecords.reduce((sum, record) => sum + (record.bytes || 0), 0),
    candidate_files: fileRecords,
    excluded_files: [
      { path: "apps/kusala-site/**", reason: "paused_project_or_out_of_scope" },
      { path: "apps/phitsanulok-news/**", reason: "paused_project_or_out_of_scope" },
      { path: "apps/final-farewell/**", reason: "paused_project_or_out_of_scope" },
      { path: ".env", reason: "secret_or_environment_file" },
      { path: ".env.*", reason: "secret_or_environment_file" },
      { path: "secrets/**", reason: "secret_or_private_material" },
      { path: "customer-data/**", reason: "customer_data_not_allowed_in_bundle" }
    ],
    verification: {
      pnpm_active_focus_final_local_review: p075?.status === "PASS_FINAL_LOCAL_REVIEW_READY" ? "passed" : "failed",
      pnpm_active_focus_final_local_review_test: options.markVerificationPassed ? "passed" : "pending_current_run",
      secret_scan: options.markVerificationPassed ? "passed_no_findings" : "pending_current_run",
      active_focus_git_diff_check: options.markVerificationPassed ? "passed_scoped_active_focus" : "pending_current_run",
      full_repo_git_diff_check: options.fullDiffCheckNote || (options.markVerificationPassed ? "not_passed_out_of_scope_blocker" : "pending_current_run"),
      receipts_parsed: ["P075", "P057", "P058"]
    },
    blocked_actions_confirmed: [
      "no_live_telegram_send",
      "no_provider_model_call",
      "no_external_customer_data_routing",
      "no_secret_read_or_print",
      "no_install",
      "no_commit",
      "no_push",
      "no_deploy",
      "no_cloudflare_or_r2_mutation"
    ],
    failures,
    guardrails: {
      live_send: false,
      provider_call: false,
      external_message_send: false,
      payload_executed: false,
      stage: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false,
      secret_read: false,
      install: false
    },
    next_gate: {
      id: "P076B_HUMAN_LOCAL_COMMIT_DECISION",
      status: "WAITING_AFTER_P076A",
      purpose: "Human reviews manifest before choosing local commit or defer."
    },
    next_safe_action:
      status === "PASS_COMMIT_BUNDLE_MANIFEST_READY"
        ? "Route this manifest to OpenCode review-only, then wait for P076B human local commit decision."
        : "Fix bundle manifest failures before staging or committing."
  };
}

function renderReport(packet) {
  return `# A2A2A Active Focus Commit Bundle Manifest - 2026-07-03

## Status

${packet.status}

## Purpose

Local-safe path and hash inventory for the explicit-path commit gate. This packet does not stage, commit, push, deploy, send Telegram, call providers, or mutate Cloudflare/R2.

## Scope

- Active: ${packet.active_focus.join(", ")}
- Paused / out-of-focus: ${packet.paused_out_of_scope.join(", ")}

## Bundle Summary

| Metric | Value |
|---|---:|
| Candidate pathspecs | ${packet.candidate_pathspec_count} |
| Changed files | ${packet.changed_file_count} |
| Deleted files | ${packet.deleted_file_count} |
| Total bytes hashed | ${packet.total_bytes} |
| Failures | ${packet.failures.length} |

## Artifacts

- Evidence: \`${DEFAULT_EVIDENCE}\`
- JSON manifest alias: \`${DEFAULT_MANIFEST_JSON}\`
- Receipt: \`${DEFAULT_RECEIPT}\`
- Home receipt: \`${DEFAULT_HOME_RECEIPT}\`
- Source manifest: \`${packet.source_manifest}\`
- Source final review: \`${packet.source_final_review}\`

## Guardrails

${Object.entries(packet.guardrails).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Verification

${Object.entries(packet.verification).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\n")}

## Failures

${packet.failures.length === 0 ? "- None" : packet.failures.map((failure) => `- ${failure}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

## P076B Gate

- ${packet.next_gate.id}: ${packet.next_gate.status}
- ${packet.next_gate.purpose}
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

function expandHome(path) {
  if (!path || !path.startsWith("~/")) return path;
  return resolve(process.env.HOME || process.cwd(), path.slice(2));
}

export async function writeCommitBundleManifest(options = {}) {
  const root = resolve(options.root || process.cwd());
  const packet = await createCommitBundleManifest(options);
  if (!options.noWrite) {
    await writeJson(resolve(root, options.evidence || DEFAULT_EVIDENCE), packet);
    await writeJson(resolve(root, options.manifestJson || DEFAULT_MANIFEST_JSON), packet);
    await writeJson(resolve(root, options.receipt || DEFAULT_RECEIPT), {
      schema: "ghostclaw.a2a2a.receipt.v1",
      receipt_id: packet.packet_id,
      status: packet.status,
      final_status: packet.final_status,
      created_at: packet.created_at,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      manifest_json: options.manifestJson || DEFAULT_MANIFEST_JSON,
      report: options.report || DEFAULT_REPORT,
      source_manifest: packet.source_manifest,
      candidate_pathspec_count: packet.candidate_pathspec_count,
      changed_file_count: packet.changed_file_count,
      deleted_file_count: packet.deleted_file_count,
      verification: packet.verification,
      failures: packet.failures,
      guardrails: packet.guardrails,
      next_safe_action: packet.next_safe_action
    });
    await writeJson(expandHome(options.homeReceipt || DEFAULT_HOME_RECEIPT), {
      schema: "ghostclaw.local_receipt.v1",
      receipt_id: "p076a_active_focus_commit_bundle_manifest_20260703",
      status: packet.status,
      final_status: packet.final_status,
      created_at: packet.created_at,
      repo: packet.repo,
      branch: packet.branch,
      evidence: options.evidence || DEFAULT_EVIDENCE,
      manifest_json: options.manifestJson || DEFAULT_MANIFEST_JSON,
      report: options.report || DEFAULT_REPORT,
      verification: packet.verification,
      guardrails: packet.guardrails,
      next_gate: packet.next_gate
    });
    await writeText(resolve(root, options.report || DEFAULT_REPORT), renderReport(packet));
  }
  return packet;
}

async function main() {
  const packet = await writeCommitBundleManifest(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(packet, null, 2));
  if (!packet.status.startsWith("PASS")) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
