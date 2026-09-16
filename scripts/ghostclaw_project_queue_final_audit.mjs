import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateProjectQueue } from "./ghostclaw_project_queue_dispatch_preview.mjs";

const DEFAULT_OUTPUT = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P056-PROJECT-QUEUE-FINAL-AUDIT-20260703.json";
const DEFAULT_RECEIPT_ROOT = ".ghostclaw_runtime/a2a2a/receipts";
const DEFAULT_EVIDENCE_ROOT = ".ghostclaw_runtime/a2a2a/evidence";
const ACCEPTED_QUEUE_STATUSES = new Set(["local_validated", "done", "completed", "archived"]);
const ACCEPTED_RECEIPT_STATUSES = new Set(["pass", "passed", "local_validated", "done", "completed", "ok"]);

function clean(value) {
  return String(value || "").trim();
}

function statusKey(value) {
  return clean(value).toLowerCase();
}

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    output: DEFAULT_OUTPUT,
    receiptRoot: DEFAULT_RECEIPT_ROOT,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--output") args.output = argv[++index];
    else if (arg === "--receipt-root") args.receiptRoot = argv[++index];
    else if (arg === "--evidence-root") args.evidenceRoot = argv[++index];
    else if (arg === "--write") args.write = true;
  }

  return args;
}

async function findJsonFiles(dir) {
  const files = [];
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    const path = resolve(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...await findJsonFiles(path));
    } else if (entry.endsWith(".json")) {
      files.push(path);
    }
  }

  return files.sort();
}

async function loadJsonArtifacts(root, artifactRoot) {
  const absoluteRoot = resolve(root, artifactRoot);
  const files = await findJsonFiles(absoluteRoot);
  const artifacts = [];

  for (const path of files) {
    const rel = relative(root, path);
    try {
      const raw = await readFile(path, "utf8");
      artifacts.push({
        path: rel,
        json: JSON.parse(raw),
        raw
      });
    } catch (error) {
      artifacts.push({
        path: rel,
        json: null,
        raw: "",
        parse_error: error.message
      });
    }
  }

  return artifacts;
}

function artifactMentionsMission(artifact, missionId) {
  if (!artifact.json) return false;
  if (artifact.json.mission_id === missionId) return true;
  if (artifact.json.missionId === missionId) return true;
  return artifact.raw.includes(missionId);
}

function receiptHasAcceptedStatus(artifact) {
  if (!artifact.json) return false;
  const status = statusKey(artifact.json.status || artifact.json.result || artifact.json.verdict);
  return ACCEPTED_RECEIPT_STATUSES.has(status);
}

function summarizeTask(task, receipts, evidence) {
  const missionId = task.mission_id;
  const exactReceipts = receipts.filter((artifact) => artifact.json?.mission_id === missionId);
  const mentionedEvidence = evidence.filter((artifact) => artifactMentionsMission(artifact, missionId));
  const blockers = [];
  const queueClosed = ACCEPTED_QUEUE_STATUSES.has(statusKey(task.queue_status));
  const dispatchClosed = clean(task.dispatch_status).startsWith("closed");
  const acceptedReceipt = exactReceipts.some(receiptHasAcceptedStatus);

  if (!queueClosed) blockers.push("queue_status_not_closed");
  if (!dispatchClosed) blockers.push("dispatch_status_not_closed");
  if (exactReceipts.length === 0) blockers.push("missing_exact_mission_receipt");
  if (!acceptedReceipt) blockers.push("missing_accepted_receipt_status");
  if (mentionedEvidence.length === 0) blockers.push("missing_mission_evidence");

  return {
    mission_id: missionId,
    project_id: task.project_id,
    queue_status: task.queue_status,
    dispatch_status: task.dispatch_status,
    receipt_paths: exactReceipts.map((artifact) => artifact.path),
    evidence_paths: mentionedEvidence.map((artifact) => artifact.path),
    accepted_receipt_status: acceptedReceipt,
    status: blockers.length === 0 ? "PASS" : "FAIL",
    blockers
  };
}

export async function createProjectQueueFinalAudit(options = {}) {
  const root = resolve(options.root || process.cwd());
  const queuePreview = options.queuePreview || await evaluateProjectQueue({ ...options, root });
  const receipts = options.receipts || await loadJsonArtifacts(root, options.receiptRoot || DEFAULT_RECEIPT_ROOT);
  const evidence = options.evidence || await loadJsonArtifacts(root, options.evidenceRoot || DEFAULT_EVIDENCE_ROOT);
  const tasks = queuePreview.tasks.map((task) => summarizeTask(task, receipts, evidence));
  const failedTasks = tasks.filter((task) => task.status !== "PASS");
  const parseFailures = [...receipts, ...evidence].filter((artifact) => artifact.parse_error);

  return {
    packet_id: "A2A2A-P056-PROJECT-QUEUE-FINAL-AUDIT-20260703",
    title: "GhostClaw Project Queue Final Audit",
    timestamp: new Date().toISOString(),
    repo: root,
    mode: "local_safe_final_audit_no_worker_execution",
    status: failedTasks.length === 0 && parseFailures.length === 0 ? "PASS" : "FAIL",
    queue_summary: queuePreview.summary,
    summary: {
      total_tasks: tasks.length,
      passed_tasks: tasks.filter((task) => task.status === "PASS").length,
      failed_tasks: failedTasks.length,
      receipt_files_checked: receipts.length,
      evidence_files_checked: evidence.length,
      parse_failures: parseFailures.length,
      ready_for_scoped_local_packet: queuePreview.summary.ready_for_scoped_local_packet,
      blocked: queuePreview.summary.blocked,
      closed: queuePreview.summary.closed
    },
    tasks,
    parse_failures: parseFailures.map((artifact) => ({
      path: artifact.path,
      error: artifact.parse_error
    })),
    guardrails: {
      worker_execution: false,
      provider_call: false,
      live_send: false,
      install: false,
      push: false,
      deploy: false,
      cloud_mutation: false,
      secret_read: false,
      key_value_print: false
    },
    next_safe_action: failedTasks.length === 0
      ? "Review final audit, then open a separate commit gate if desired."
      : "Repair failed queue audit items before any commit gate."
  };
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await createProjectQueueFinalAudit(args);

  if (args.write) {
    await writeJson(resolve(args.root, args.output), result);
  }

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
