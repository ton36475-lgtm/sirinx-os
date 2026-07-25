import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyGhostClawAction,
  createGhostClawDispatchPreview,
  loadGhostClawControlPlane,
  requestGhostClawFileLease,
  validateGhostClawReceipt
} from "../services/dev-control-api/src/ghostclaw-control-plane.mjs";
import { parseProjectQueueTask } from "./ghostclaw_project_queue_dispatch_preview.mjs";

const DEFAULT_TASK = ".ghostclaw_runtime/a2a2a/project_queues/ghostclaw_os/TASK-001-ghostclaw-os-core-control-plane.yaml";
const DEFAULT_OUTPUT = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P034-GHOSTCLAW-OS-CORE-CONTROL-PLANE-RECONCILE-20260703.json";
const P032_RECEIPT = ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P032-GHOSTCLAW-CONTROL-PLANE-IMPL-20260703.json";

const TARGET_FILES = [
  "services/dev-control-api/src/ghostclaw-control-plane.mjs",
  "services/dev-control-api/src/ghostclaw-control-plane.d.ts",
  "services/dev-control-api/src/ghostclaw-control-plane.test.mjs",
  "services/dev-control-api/server.mjs",
  "docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md",
  P032_RECEIPT
];

const LEASED_PACKET_FILES = [
  "services/dev-control-api/src/ghostclaw-control-plane.d.ts",
  "scripts/ghostclaw_core_control_plane_reconcile.mjs",
  "scripts/ghostclaw_core_control_plane_reconcile.test.mjs",
  "docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md",
  "docs/ghostclaw/A2A2A_GHOSTCLAW_OS_CORE_CONTROL_PLANE_RECONCILE_20260703.md",
  DEFAULT_TASK,
  DEFAULT_OUTPUT,
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P034-GHOSTCLAW-OS-CORE-CONTROL-PLANE-RECONCILE-20260703.json"
];

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    task: DEFAULT_TASK,
    output: DEFAULT_OUTPUT,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--task") args.task = argv[++index];
    else if (arg === "--output") args.output = argv[++index];
    else if (arg === "--write") args.write = true;
  }

  return args;
}

async function readOptional(root, relativePath) {
  try {
    return await readFile(resolve(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

function requirement(id, passed, evidence, detail = "") {
  return {
    id,
    status: passed ? "pass" : "fail",
    evidence,
    detail
  };
}

function summarizeRequirements(requirements) {
  return {
    total: requirements.length,
    pass: requirements.filter((item) => item.status === "pass").length,
    fail: requirements.filter((item) => item.status !== "pass").length
  };
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function reconcileCoreControlPlane(options = {}) {
  const root = resolve(options.root || process.cwd());
  const taskPath = options.task || DEFAULT_TASK;
  const taskRaw = await readFile(resolve(root, taskPath), "utf8");
  const task = parseProjectQueueTask(taskRaw, taskPath);

  const [
    moduleText,
    declarationText,
    testText,
    serverText,
    docsText,
    packageText,
    p032ReceiptText
  ] = await Promise.all([
    readOptional(root, "services/dev-control-api/src/ghostclaw-control-plane.mjs"),
    readOptional(root, "services/dev-control-api/src/ghostclaw-control-plane.d.ts"),
    readOptional(root, "services/dev-control-api/src/ghostclaw-control-plane.test.mjs"),
    readOptional(root, "services/dev-control-api/server.mjs"),
    readOptional(root, "docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md"),
    readOptional(root, "package.json"),
    readOptional(root, P032_RECEIPT)
  ]);

  const controlPlane = await loadGhostClawControlPlane(root, options);
  const localLeasePreview = await createGhostClawDispatchPreview(
    {
      taskId: "A2A2A-P034-GHOSTCLAW-OS-CORE-CONTROL-PLANE-RECONCILE-20260703",
      taskType: task.task_type,
      action: "local-safe GhostClaw OS core control-plane reconciliation packet",
      filesToMutate: LEASED_PACKET_FILES,
      allowedFiles: task.allowed_files,
      forbiddenFiles: task.forbidden_files
    },
    { ...options, root, controlPlane }
  );
  const collisionLease = requestGhostClawFileLease({
    files: ["services/dev-control-api/src/ghostclaw-control-plane.mjs"],
    allowedFiles: ["services/dev-control-api/**"],
    existingLeases: [{ status: "active", files: ["services/dev-control-api/src/ghostclaw-control-plane.mjs"] }]
  });
  const validReceipt = validateGhostClawReceipt({
    receipt_id: "r1",
    mission_id: task.mission_id,
    task_id: "reconcile-fixture",
    agent: "codex",
    action_tier: task.tier,
    files_touched: ["services/dev-control-api/src/ghostclaw-control-plane.mjs"],
    validation_commands: ["pnpm ghostclaw-control-plane:test"],
    validation_result: "pass",
    created_at: nowIso(options)
  });
  const blockedAction = classifyGhostClawAction({ action: "deploy production and read .env api key" });

  let p032Receipt = {};
  try {
    p032Receipt = JSON.parse(p032ReceiptText);
  } catch {
    p032Receipt = {};
  }

  const requirements = [
    requirement(
      "typed_control_plane_module",
      includesAll(moduleText, [
        "export async function loadGhostClawControlPlane",
        "export async function createGhostClawDispatchPreview",
        "export function requestGhostClawFileLease",
        "export function validateGhostClawReceipt",
        "export function classifyGhostClawAction"
      ]) && includesAll(declarationText, [
        "export interface GhostClawControlPlane",
        "export interface GhostClawDispatchPreview",
        "export function createGhostClawDispatchPreview"
      ]),
      [
        "services/dev-control-api/src/ghostclaw-control-plane.mjs",
        "services/dev-control-api/src/ghostclaw-control-plane.d.ts"
      ],
      "ES module exports and TypeScript declaration surface exist."
    ),
    requirement(
      "agent_role_dispatch",
      controlPlane.status === "ghostclaw-control-plane-registry-ready" &&
        controlPlane.routes.some((route) => route.routeId === "route-repo-arch") &&
        localLeasePreview.agents.primary?.id === "codex" &&
        localLeasePreview.agents.reviewer?.id === "opencode",
      [".ghostclaw/registry/agent-registry.v1.yaml", ".ghostclaw/registry/route-matrix.v1.yaml"],
      "route-repo-arch resolves to Codex builder and OpenCode reviewer."
    ),
    requirement(
      "lease_manager_collision_detection",
      collisionLease.granted === false &&
        collisionLease.conflictingFiles.includes("services/dev-control-api/src/ghostclaw-control-plane.mjs") &&
        testText.includes("active collisions"),
      ["services/dev-control-api/src/ghostclaw-control-plane.mjs", "services/dev-control-api/src/ghostclaw-control-plane.test.mjs"],
      "Lease manager denies active collisions."
    ),
    requirement(
      "receipt_auditor_required_fields",
      validReceipt.valid === true &&
        moduleText.includes("GHOSTCLAW_CONTROL_PLANE_RECEIPT_FIELDS") &&
        testText.includes("validates required receipt fields"),
      ["services/dev-control-api/src/ghostclaw-control-plane.mjs", "services/dev-control-api/src/ghostclaw-control-plane.test.mjs"],
      "Receipt validator enforces required fields."
    ),
    requirement(
      "policy_guardian_blocks_d_x_actions",
      blockedAction.blocked === true &&
        blockedAction.actionTier === "X" &&
        blockedAction.blockedReasons.includes("secret_or_key_access") &&
        moduleText.includes("BLOCKED_RULES"),
      ["services/dev-control-api/src/ghostclaw-control-plane.mjs"],
      "Policy classifier blocks D/X actions before workers run."
    ),
    requirement(
      "api_surface_registered",
      serverText.includes('"/api/ghostclaw/control-plane"') &&
        serverText.includes('"/api/ghostclaw/control-plane/dispatch/dry-run"'),
      ["services/dev-control-api/server.mjs"],
      "GET status and POST dry-run dispatch routes are registered."
    ),
    requirement(
      "unit_tests_and_harness",
      packageText.includes('"ghostclaw-control-plane:test"') &&
        p032Receipt.status === "PASS" &&
        testText.includes("creates a read-only dispatch preview"),
      ["package.json", "services/dev-control-api/src/ghostclaw-control-plane.test.mjs", P032_RECEIPT],
      "Focused project test harness exists and P032 receipt passed."
    ),
    requirement(
      "route_matrix_docs_updated",
      docsText.includes("route-repo-arch") &&
        docsText.includes("GET /api/ghostclaw/control-plane") &&
        docsText.includes("POST /api/ghostclaw/control-plane/dispatch/dry-run"),
      ["docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md"],
      "Runbook documents current route-matrix path and dry-run API."
    ),
    requirement(
      "queue_status_reconciled",
      task.status === "local_validated" &&
        taskRaw.includes("validated_by_packet: A2A2A-P034-GHOSTCLAW-OS-CORE-CONTROL-PLANE-RECONCILE-20260703"),
      [taskPath],
      "Queue item is no longer pending and points at the reconciliation packet."
    ),
    requirement(
      "lease_preview_for_p034_granted",
      localLeasePreview.status === "ready-ghostclaw-dispatch-preview" &&
        localLeasePreview.lease?.granted === true &&
        localLeasePreview.blockers.length === 0,
      [taskPath, "scripts/ghostclaw_core_control_plane_reconcile.mjs"],
      "P034 file scope matches the task allowlist and forbidden paths."
    )
  ];
  const summary = summarizeRequirements(requirements);

  return {
    packet_id: "A2A2A-P034-GHOSTCLAW-OS-CORE-CONTROL-PLANE-RECONCILE-20260703",
    mission_id: task.mission_id,
    project_id: task.project_id,
    task_type: task.task_type,
    timestamp: nowIso(options),
    repo: root,
    mode: "local_safe_reconciliation_no_worker_execution",
    task_status: task.status,
    control_plane_status: controlPlane.status,
    dispatch_preview_status: localLeasePreview.status,
    summary,
    requirements,
    lease_preview: localLeasePreview.lease,
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
    target_files: TARGET_FILES,
    next_safe_action: summary.fail === 0
      ? "Move to the next highest-priority GhostClaw OS queued task with a fresh scoped packet."
      : "Resolve failed reconciliation requirements before advancing the queue."
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await reconcileCoreControlPlane(args);

  if (args.write) {
    await writeJson(resolve(args.root, args.output), result);
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.summary.fail > 0) process.exitCode = 1;
}

const mainPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (mainPath && fileURLToPath(import.meta.url) === mainPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
