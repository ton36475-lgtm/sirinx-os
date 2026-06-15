import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_PROJECT_ROOT = "/Users/sirinx/sirinx-os";
const DEFAULT_LOG_PATH = ".hermes/runtime/codex-task-runs.jsonl";
const MAX_OUTPUT_CHARS = 4000;
const SECRET_LIKE_PATTERN =
  /(sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|OPENROUTER_API_KEY\s*=\s*[^"'\s]{8,}|TELEGRAM_BOT_TOKEN\s*=\s*[^"'\s]{8,})/g;

const TASKS = {
  status: {
    id: "status",
    label: "Git workspace status",
    command: "git",
    args: ["status", "--short", "--branch"],
    risk: "low",
    writesFiles: false
  },
  diff: {
    id: "diff",
    label: "Git diff stat",
    command: "git",
    args: ["diff", "--stat"],
    risk: "low",
    writesFiles: false
  },
  "test:fusion": {
    id: "test:fusion",
    label: "OpenRouter Fusion Router tests",
    command: "pnpm",
    args: ["openrouter-fusion-router:test"],
    risk: "medium",
    writesFiles: false
  },
  "test:runtime-foundation": {
    id: "test:runtime-foundation",
    label: "Runtime foundation tests",
    command: "pnpm",
    args: ["runtime-foundation:test"],
    risk: "medium",
    writesFiles: false
  },
  "audit:secrets": {
    id: "audit:secrets",
    label: "Bounded local secret scan",
    command: "pnpm",
    args: ["audit:secrets"],
    risk: "medium",
    writesFiles: false
  },
  verify: {
    id: "verify",
    label: "Workspace syntax verification",
    command: "pnpm",
    args: ["verify"],
    risk: "medium",
    writesFiles: false
  }
};

function nowIso(options = {}) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function safeString(value, fallback = "") {
  return String(value || fallback).trim();
}

function redact(value) {
  return safeString(value).replace(SECRET_LIKE_PATTERN, "[REDACTED_SECRET_LIKE]").slice(0, MAX_OUTPUT_CHARS);
}

function getTask(taskId) {
  return TASKS[safeString(taskId)] || null;
}

export function getCodexTaskRunnerStatus(options = {}) {
  return {
    title: "SIRINX Codex Task Runner",
    status: "codex-task-runner-ready",
    mode: "local-exec-allowlist",
    canRunArbitraryShell: false,
    canEditFilesDirectlyFromTelegram: false,
    canCreateLocalTaskPackets: true,
    canRunAllowedLocalChecks: true,
    allowedTasks: Object.values(TASKS).map((task) => ({
      id: task.id,
      label: task.label,
      commandPreview: `${task.command} ${task.args.join(" ")}`,
      risk: task.risk,
      writesFiles: task.writesFiles
    })),
    guardrails: {
      shell: false,
      destructiveCommands: false,
      deploy: false,
      push: false,
      publish: false,
      providerCall: false,
      telegramSend: false,
      outputRedacted: true
    },
    updatedAt: nowIso(options)
  };
}

async function defaultExecutor(command, args, options) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options.projectRoot || DEFAULT_PROJECT_ROOT,
    timeout: options.timeoutMs || 120000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      FORCE_COLOR: "0"
    }
  });
  return { stdout, stderr, code: 0 };
}

async function appendJsonLine(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`, { flag: "a", encoding: "utf8" });
}

export async function runCodexTask(input = {}, options = {}) {
  const taskId = safeString(input.task || input.taskId || input.id, "status");
  const task = getTask(taskId);
  const startedAt = nowIso(options);
  const logPath = options.logPath || join(options.projectRoot || DEFAULT_PROJECT_ROOT, DEFAULT_LOG_PATH);

  if (!task) {
    const blocked = {
      title: "SIRINX Codex Task Runner",
      status: "blocked-codex-task",
      requestId: safeString(input.requestId, `codex-task-${Date.now()}`),
      taskId,
      blockedReason: "task_not_in_allowlist",
      allowedTasks: Object.keys(TASKS),
      commandExecuted: false,
      externalWrites: false,
      providerCalled: false,
      telegramSent: false,
      startedAt,
      updatedAt: nowIso(options)
    };
    if (options.writeLog !== false) await appendJsonLine(logPath, blocked);
    return blocked;
  }

  const executor = options.executor || defaultExecutor;
  try {
    const output = await executor(task.command, task.args, {
      projectRoot: options.projectRoot || DEFAULT_PROJECT_ROOT,
      timeoutMs: options.timeoutMs
    });
    const result = {
      title: "SIRINX Codex Task Runner",
      status: "completed-codex-task",
      requestId: safeString(input.requestId, `codex-task-${Date.now()}`),
      taskId: task.id,
      label: task.label,
      commandPreview: `${task.command} ${task.args.join(" ")}`,
      commandExecuted: true,
      exitCode: output.code || 0,
      stdoutPreview: redact(output.stdout),
      stderrPreview: redact(output.stderr),
      externalWrites: false,
      providerCalled: false,
      telegramSent: false,
      writesFiles: task.writesFiles,
      startedAt,
      updatedAt: nowIso(options)
    };
    if (options.writeLog !== false) await appendJsonLine(logPath, result);
    return result;
  } catch (error) {
    const result = {
      title: "SIRINX Codex Task Runner",
      status: "failed-codex-task",
      requestId: safeString(input.requestId, `codex-task-${Date.now()}`),
      taskId: task.id,
      label: task.label,
      commandPreview: `${task.command} ${task.args.join(" ")}`,
      commandExecuted: true,
      exitCode: error.code || 1,
      stdoutPreview: redact(error.stdout),
      stderrPreview: redact(error.stderr || error.message),
      externalWrites: false,
      providerCalled: false,
      telegramSent: false,
      writesFiles: task.writesFiles,
      startedAt,
      updatedAt: nowIso(options)
    };
    if (options.writeLog !== false) await appendJsonLine(logPath, result);
    return result;
  }
}

export function codexTaskLogPath(projectRoot = DEFAULT_PROJECT_ROOT) {
  return join(projectRoot, DEFAULT_LOG_PATH);
}
