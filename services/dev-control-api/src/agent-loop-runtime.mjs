import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getCodexTaskRunnerStatus, runCodexTask } from "./codex-task-runner.mjs";
import { getRuntimeFoundationStatus } from "./runtime-foundation.mjs";

const DEFAULT_PROJECT_ROOT = "/Users/sirinx/sirinx-os";
const DEFAULT_LOG_PATH = ".hermes/runtime/agent-loop-runs.jsonl";

const STAGES = ["discovery", "planning", "execution", "verification", "iteration", "evidence"];

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function safeString(value, fallback = "") {
  return String(value || fallback).trim();
}

function classifyGoal(goal) {
  const text = safeString(goal).toLowerCase();
  if (/fusion|openrouter|model council/.test(text)) {
    return {
      intent: "fusion_runtime_readiness",
      tasks: ["test:runtime-foundation", "test:fusion", "audit:secrets"]
    };
  }
  if (/verify|workspace|syntax/.test(text)) {
    return {
      intent: "workspace_verification",
      tasks: ["status", "verify", "audit:secrets"]
    };
  }
  if (/diff|dirty|changes/.test(text)) {
    return {
      intent: "workspace_diff_review",
      tasks: ["status", "diff"]
    };
  }
  return {
    intent: "safe_status_loop",
    tasks: ["status", "diff"]
  };
}

async function appendJsonLine(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`, { flag: "a", encoding: "utf8" });
}

function summarizeResults(results) {
  const failed = results.filter((result) => !["completed-codex-task"].includes(result.status));
  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failedTasks: failed.map((result) => result.taskId)
  };
}

export function getAgentLoopRuntimeStatus(options = {}) {
  const taskRunner = getCodexTaskRunnerStatus(options);
  return {
    title: "SIRINX Agent Loop Runtime",
    status: "agent-loop-runtime-ready",
    mode: "closed-loop-local-runtime",
    stages: STAGES,
    loops: {
      singleAgent: ["discovery", "planning", "execution", "verification", "iteration"],
      fleetLoop: ["goal", "breakdown", "assign", "local_loop", "merge", "evaluate", "targeted_retry", "ship"]
    },
    openLoop: {
      allowed: false,
      reason: "normal-budget runtime uses bounded closed loop with explicit tasks and verification"
    },
    closedLoop: {
      allowed: true,
      rules: ["clear_goal", "bounded_steps", "eval_at_each_step", "audit_log", "targeted_retry_only"]
    },
    taskRunner: {
      status: taskRunner.status,
      allowedTasks: taskRunner.allowedTasks.map((task) => task.id)
    },
    guardrails: {
      arbitraryShell: false,
      deploy: false,
      push: false,
      publish: false,
      providerCall: false,
      customerMessageSend: false
    },
    updatedAt: nowIso(options)
  };
}

export async function runAgentLoop(input = {}, options = {}) {
  const goal = safeString(input.goal, "Check current SIRINX runtime status and produce safe next action.");
  const requestId = safeString(input.requestId, `agent-loop-${Date.now()}`);
  const projectRoot = options.projectRoot || DEFAULT_PROJECT_ROOT;
  const logPath = options.logPath || join(projectRoot, DEFAULT_LOG_PATH);
  const startedAt = nowIso(options);
  const plan = classifyGoal(goal);
  const foundation = await getRuntimeFoundationStatus(options);

  const stageLog = [
    {
      stage: "discovery",
      status: "completed",
      evidence: [`runtime=${foundation.status}`, `intent=${plan.intent}`]
    },
    {
      stage: "planning",
      status: "completed",
      evidence: [`tasks=${plan.tasks.join(",")}`]
    }
  ];

  const results = [];
  for (const task of plan.tasks) {
    const result = await runCodexTask(
      {
        requestId: `${requestId}-${task}`,
        task
      },
      {
        ...options,
        projectRoot,
        writeLog: options.writeTaskLog !== false
      }
    );
    results.push(result);
  }

  const summary = summarizeResults(results);
  stageLog.push({
    stage: "execution",
    status: summary.failed ? "completed-with-failures" : "completed",
    evidence: results.map((result) => `${result.taskId}:${result.status}`)
  });
  stageLog.push({
    stage: "verification",
    status: summary.failed ? "blocked" : "passed",
    evidence: [`passed=${summary.passed}`, `failed=${summary.failed}`]
  });
  stageLog.push({
    stage: "iteration",
    status: summary.failed ? "targeted-retry-required" : "not-required",
    evidence: summary.failedTasks
  });
  stageLog.push({
    stage: "evidence",
    status: "completed",
    evidence: [logPath]
  });

  const output = {
    title: "SIRINX Agent Loop Runtime",
    status: summary.failed ? "blocked-agent-loop-runtime" : "completed-agent-loop-runtime",
    requestId,
    goal,
    mode: "closed-loop-local-runtime",
    intent: plan.intent,
    stages: stageLog,
    taskResults: results,
    summary,
    externalWrites: false,
    providerCalled: false,
    telegramSent: false,
    deploy: false,
    push: false,
    publish: false,
    startedAt,
    updatedAt: nowIso(options)
  };

  if (options.writeLog !== false) await appendJsonLine(logPath, output);
  return output;
}

export function agentLoopLogPath(projectRoot = DEFAULT_PROJECT_ROOT) {
  return join(projectRoot, DEFAULT_LOG_PATH);
}
