import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGhostClawDispatchPreview, loadGhostClawControlPlane } from "../services/dev-control-api/src/ghostclaw-control-plane.mjs";

const DEFAULT_QUEUE_ROOT = ".ghostclaw_runtime/a2a2a/project_queues";
const DEFAULT_OUTPUT = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P033-PROJECT-QUEUE-DISPATCH-PREVIEW-20260703.json";
const CLOSED_QUEUE_STATUSES = new Set(["local_validated", "done", "completed", "archived"]);

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function clean(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function priorityRank(priority) {
  return {
    highest: 0,
    high: 1,
    medium: 2,
    low: 3
  }[clean(priority).toLowerCase()] ?? 9;
}

function dispatchRank(dispatchStatus) {
  if (dispatchStatus === "ready_for_scoped_local_packet") return 0;
  if (dispatchStatus.startsWith("blocked")) return 1;
  if (dispatchStatus.startsWith("closed")) return 2;
  return 3;
}

function bump(map, key) {
  const normalized = clean(key) || "unknown";
  map[normalized] = (map[normalized] || 0) + 1;
}

function queueStatus(value) {
  return clean(value).toLowerCase() || "unknown";
}

function isClosedQueueStatus(value) {
  return CLOSED_QUEUE_STATUSES.has(queueStatus(value));
}

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    queueRoot: DEFAULT_QUEUE_ROOT,
    output: DEFAULT_OUTPUT,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--queue-root") args.queueRoot = argv[++index];
    else if (arg === "--output") args.output = argv[++index];
    else if (arg === "--write") args.write = true;
  }

  return args;
}

function parseYamlValue(value) {
  const trimmed = clean(value);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

export function parseProjectQueueTask(raw, relativePath = "") {
  const task = { relative_path: relativePath };
  let currentListKey = null;
  let currentBlockKey = null;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const top = line.match(/^([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (top) {
      const key = top[1];
      const value = clean(top[2] || "");
      currentListKey = null;
      currentBlockKey = null;

      if (value === ">" || value === "|") {
        task[key] = "";
        currentBlockKey = key;
      } else if (value === "") {
        task[key] = [];
        currentListKey = key;
      } else {
        task[key] = parseYamlValue(value);
      }
      continue;
    }

    const listItem = line.match(/^\s*-\s*(.+?)\s*$/);
    if (currentListKey && listItem) {
      task[currentListKey].push(parseYamlValue(listItem[1]));
      continue;
    }

    if (currentBlockKey && /^\s+/.test(line)) {
      task[currentBlockKey] = `${task[currentBlockKey]} ${line.trim()}`.trim();
    }
  }

  return {
    ...task,
    allowed_files: Array.isArray(task.allowed_files) ? task.allowed_files : [],
    forbidden_files: Array.isArray(task.forbidden_files) ? task.forbidden_files : [],
    verification: Array.isArray(task.verification) ? task.verification : [],
    deliverables: Array.isArray(task.deliverables) ? task.deliverables : [],
    constraints: Array.isArray(task.constraints) ? task.constraints : []
  };
}

async function findYamlFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const path = resolve(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...await findYamlFiles(path));
    } else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
      files.push(path);
    }
  }

  return files.sort();
}

function summarizeTasks(tasks) {
  const byProject = {};
  const byTaskType = {};
  const byPriority = {};
  const byStatus = {};
  const byQueueStatus = {};
  const byRoute = {};

  for (const task of tasks) {
    bump(byProject, task.project_id);
    bump(byTaskType, task.task_type);
    bump(byPriority, task.priority);
    bump(byStatus, task.dispatch_status);
    bump(byQueueStatus, task.queue_status);
    bump(byRoute, task.route_id || "missing");
  }
  const nextReadyTask = tasks.find((task) => task.dispatch_status === "ready_for_scoped_local_packet") || null;

  return {
    total: tasks.length,
    ready_for_scoped_local_packet: tasks.filter((task) => task.dispatch_status === "ready_for_scoped_local_packet").length,
    blocked: tasks.filter((task) => task.dispatch_status.startsWith("blocked")).length,
    closed: tasks.filter((task) => task.dispatch_status.startsWith("closed")).length,
    next_ready_task: nextReadyTask ? {
      mission_id: nextReadyTask.mission_id,
      project_id: nextReadyTask.project_id,
      priority: nextReadyTask.priority,
      route_id: nextReadyTask.route_id,
      relative_path: nextReadyTask.relative_path
    } : null,
    by_project: byProject,
    by_task_type: byTaskType,
    by_priority: byPriority,
    by_queue_status: byQueueStatus,
    by_dispatch_status: byStatus,
    by_route: byRoute
  };
}

export async function evaluateProjectQueue(options = {}) {
  const root = resolve(options.root || process.cwd());
  const queueRoot = resolve(root, options.queueRoot || DEFAULT_QUEUE_ROOT);
  const controlPlane = options.controlPlane || await loadGhostClawControlPlane(root, options);
  const files = options.taskFiles || await findYamlFiles(queueRoot);
  const tasks = [];

  for (const absolutePath of files) {
    const relativePath = relative(root, absolutePath);
    const raw = await readFile(absolutePath, "utf8");
    const task = parseProjectQueueTask(raw, relativePath);
    const preview = await createGhostClawDispatchPreview(
      {
        taskId: task.mission_id || relativePath,
        taskType: task.task_type,
        action: "local-safe project queue dispatch preview",
        allowedFiles: task.allowed_files,
        forbiddenFiles: task.forbidden_files
      },
      { ...options, root, controlPlane }
    );
    const routeId = preview.route?.routeId || null;
    const taskQueueStatus = task.status || "";
    const dispatchStatus = isClosedQueueStatus(taskQueueStatus)
      ? `closed_${queueStatus(taskQueueStatus)}`
      : preview.blockers.includes("route_not_found")
        ? "blocked_route_not_found"
        : preview.blockers.includes("policy_guardian_block")
          ? "blocked_policy_guardian"
          : "ready_for_scoped_local_packet";

    tasks.push({
      relative_path: relativePath,
      mission_id: task.mission_id || "",
      project_id: task.project_id || "",
      task_type: task.task_type || "",
      tier: task.tier || preview.action?.actionTier || "",
      priority: task.priority || "",
      queue_status: taskQueueStatus,
      route_id: routeId,
      primary_agent: preview.agents.primary?.id || "",
      reviewer_agent: preview.agents.reviewer?.id || "",
      validator_agent: preview.agents.validator?.id || "",
      dispatch_status: dispatchStatus,
      action_tier: preview.action.actionTier,
      blocked_reasons: preview.action.blockedReasons,
      blockers: preview.blockers,
      allowed_files_count: task.allowed_files.length,
      forbidden_files_count: task.forbidden_files.length,
      requires_scoped_file_lease_before_mutation: dispatchStatus === "ready_for_scoped_local_packet" && task.allowed_files.length > 0,
      can_execute_now: false,
      next_safe_action: dispatchStatus === "ready_for_scoped_local_packet"
        ? "Create a scoped packet with exact files, lease preview, validation commands, and receipt before mutation."
        : dispatchStatus.startsWith("closed")
          ? `No action required: queue item is ${queueStatus(taskQueueStatus)}.`
          : preview.nextSafeAction
    });
  }

  tasks.sort((a, b) =>
    dispatchRank(a.dispatch_status) - dispatchRank(b.dispatch_status) ||
    priorityRank(a.priority) - priorityRank(b.priority) ||
    clean(a.project_id).localeCompare(clean(b.project_id)) ||
    clean(a.relative_path).localeCompare(clean(b.relative_path))
  );

  return {
    packet_id: "A2A2A-P033-PROJECT-QUEUE-DISPATCH-PREVIEW-20260703",
    title: "GhostClaw Project Queue Dispatch Preview",
    timestamp: nowIso(options),
    repo: root,
    mode: "local_safe_queue_preview_no_worker_execution",
    control_plane_status: controlPlane.status,
    summary: summarizeTasks(tasks),
    tasks,
    guardrails: {
      worker_execution: false,
      source_mutation: false,
      provider_call: false,
      live_send: false,
      install: false,
      push: false,
      deploy: false,
      cloud_mutation: false,
      secret_read: false,
      key_value_print: false
    },
    next_safe_action: "Select summary.next_ready_task, name exact files, request a scoped file lease, then run validation before any commit gate."
  };
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await evaluateProjectQueue(args);

  if (args.write) {
    const output = resolve(args.root, args.output);
    await writeJson(output, result);
  }

  console.log(JSON.stringify(result, null, 2));
}

const mainPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (mainPath && fileURLToPath(import.meta.url) === mainPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
