/**
 * GHOSTCLAW Vibe Task Parser
 * Phase 5 — Parse natural language command into structured task graph
 *
 * Autonomy Level: A3 (LLM-assisted, deterministic output)
 *
 * This parser converts a free-text natural language command into a
 * VibeTaskGraph conforming to vibe-task-graph.schema.json.
 *
 * It does NOT call any LLM API. It uses rule-based parsing with
 * keyword matching and intent classification. If an external LLM
 * is available in the future, it can be plugged in via the
 * `parseWithLLM` hook.
 *
 * Canonical terminology: brainstorm (canonical), beststorm (legacy alias), beststrom (invalid typo).
 */

// ─── Task Types ────────────────────────────────────────────────

const TASK_TYPES = {
  FILE_OPERATION: 'file_operation',
  CODE_GENERATION: 'code_generation',
  BROWSER_SMOKE: 'browser_smoke',
  DASHBOARD_VERIFY: 'dashboard_verify',
  TEST_RUN: 'test_run',
  GIT_OPERATION: 'git_operation',
  DOCS_UPDATE: 'docs_update',
  RESEARCH: 'research',
  POLICY_CHECK: 'policy_check',
  SETUP: 'setup',
  UNKNOWN: 'unknown',
};

// ─── Worker Types ──────────────────────────────────────────────

const WORKER_TYPES = {
  CODEX_WORKER: 'codex-worker',
  BROWSER_USE_WORKER: 'browser-use-worker',
  GLM_WORKER: 'glm-worker',
  DEEPSEEK_WORKER: 'deepseek-worker',
  KOB_VALIDATOR: 'kob-validator',
  MANUAL: 'manual',
};

// ─── Intent Patterns ──────────────────────────────────────────

const INTENT_PATTERNS = [
  {
    keywords: ['open', 'dashboard', 'smoke', 'browser', 'screenshot', 'check page'],
    taskType: TASK_TYPES.BROWSER_SMOKE,
    worker: WORKER_TYPES.BROWSER_USE_WORKER,
    description: 'Browser dashboard smoke test',
  },
  {
    keywords: ['verify', 'dashboard', 'local', 'running', 'health check', 'alive'],
    taskType: TASK_TYPES.DASHBOARD_VERIFY,
    worker: WORKER_TYPES.BROWSER_USE_WORKER,
    description: 'Verify local dashboard is running',
  },
  {
    keywords: ['create file', 'write file', 'new file', 'make file', 'add file'],
    taskType: TASK_TYPES.FILE_OPERATION,
    worker: WORKER_TYPES.CODEX_WORKER,
    description: 'File creation/modification',
  },
  {
    keywords: ['generate code', 'write code', 'create function', 'implement', 'build'],
    taskType: TASK_TYPES.CODE_GENERATION,
    worker: WORKER_TYPES.CODEX_WORKER,
    description: 'Code generation task',
  },
  {
    keywords: ['run test', 'test', 'vitest', 'jest', 'unit test', 'spec'],
    taskType: TASK_TYPES.TEST_RUN,
    worker: WORKER_TYPES.KOB_VALIDATOR,
    description: 'Run existing test suite',
  },
  {
    keywords: ['git', 'commit', 'branch', 'diff', 'status'],
    taskType: TASK_TYPES.GIT_OPERATION,
    worker: WORKER_TYPES.CODEX_WORKER,
    description: 'Git operation',
  },
  {
    keywords: ['update docs', 'write docs', 'documentation', 'readme', 'knowledge'],
    taskType: TASK_TYPES.DOCS_UPDATE,
    worker: WORKER_TYPES.CODEX_WORKER,
    description: 'Documentation update',
  },
  {
    keywords: ['research', 'scan', 'analysis', 'inspect', 'look up', 'find'],
    taskType: TASK_TYPES.RESEARCH,
    worker: WORKER_TYPES.GLM_WORKER,
    description: 'Research/analysis task',
  },
  {
    keywords: ['check policy', 'validate policy', 'safety check', 'compliance'],
    taskType: TASK_TYPES.POLICY_CHECK,
    worker: WORKER_TYPES.KOB_VALIDATOR,
    description: 'Policy validation',
  },
  {
    keywords: ['setup', 'install', 'configure', 'initialize'],
    taskType: TASK_TYPES.SETUP,
    worker: WORKER_TYPES.MANUAL,
    description: 'Setup/configuration task',
  },
];

// ─── Blocked Patterns ─────────────────────────────────────────

const BLOCKED_PATTERNS = [
  'deploy',
  'push',
  'production',
  'send message',
  'telegram',
  'payment',
  'login',
  'credential',
  'secret',
  'token',
  'password',
  'api key',
  'cloud mutation',
  'delete database',
  'drop table',
  'install dependency',
  'pip install',
  'npm install',
  'pnpm install',
];

// ─── Terminology Normalization ─────────────────────────────────

const TERMINOLOGY = {
  canonical: 'brainstorm',
  deprecated_aliases: ['beststorm'],
  invalid_typos: ['beststrom'],
};

/**
 * Normalize terminology in text.
 * Converts deprecated aliases to canonical form.
 * Rejects invalid typos.
 * @param {string} text
 * @returns {{ text: string, normalized: boolean, rejected: boolean, reason: string|null }}
 */
function normalizeTerminology(text) {
  let normalized = text;
  let didNormalize = false;

  // Reject invalid typos
  for (const typo of TERMINOLOGY.invalid_typos) {
    if (text.toLowerCase().includes(typo)) {
      return {
        text,
        normalized: false,
        rejected: true,
        reason: `Invalid typo "${typo}" detected. Use canonical term "${TERMINOLOGY.canonical}".`,
      };
    }
  }

  // Normalize deprecated aliases
  for (const alias of TERMINOLOGY.deprecated_aliases) {
    const regex = new RegExp(alias, 'gi');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, TERMINOLOGY.canonical);
      didNormalize = true;
    }
  }

  return {
    text: normalized,
    normalized: didNormalize,
    rejected: false,
    reason: null,
  };
}

// ─── Safe / Blocked Classification ─────────────────────────────

/**
 * Check if the command contains blocked patterns.
 * @param {string} command
 * @returns {{ blocked: boolean, matchedPatterns: string[] }}
 */
function checkBlocked(command) {
  const lower = command.toLowerCase();
  const matched = BLOCKED_PATTERNS.filter((p) => lower.includes(p));
  return {
    blocked: matched.length > 0,
    matchedPatterns: matched,
  };
}

// ─── Intent Classification ────────────────────────────────────

/**
 * Classify intent from natural language command.
 * @param {string} command
 * @returns {{ taskType: string, worker: string, description: string, confidence: number }}
 */
function classifyIntent(command) {
  const lower = command.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return {
      taskType: TASK_TYPES.UNKNOWN,
      worker: WORKER_TYPES.MANUAL,
      description: 'Unknown task — requires human review',
      confidence: 0,
    };
  }

  return {
    taskType: bestMatch.taskType,
    worker: bestMatch.worker,
    description: bestMatch.description,
    confidence: Math.min(bestScore / bestMatch.keywords.length, 1.0),
  };
}

// ─── Task Graph Builder ───────────────────────────────────────

/**
 * Parse a natural language command into a VibeTaskGraph.
 *
 * @param {string} command - Natural language command
 * @param {object} opts - { requester, contextUrl, brainstormId }
 * @returns {object} VibeTaskGraph conforming to vibe-task-graph.schema.json
 */
export function parseCommand(command, opts = {}) {
  const timestamp = new Date().toISOString();
  const taskId = `vibe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // Normalize terminology
  const termResult = normalizeTerminology(command);
  if (termResult.rejected) {
    return {
      task_graph_id: taskId,
      timestamp,
      status: 'rejected',
      reason: termResult.reason,
      original_command: command,
      tasks: [],
      blocked: true,
    };
  }

  const normalizedCommand = termResult.text;

  // Check blocked patterns
  const blockCheck = checkBlocked(normalizedCommand);

  // Classify intent
  const intent = classifyIntent(normalizedCommand);

  // Build task node
  const task = {
    task_id: `${taskId}-t1`,
    task_type: intent.taskType,
    description: intent.description,
    worker: intent.worker,
    command: normalizedCommand,
    original_command: command,
    confidence: intent.confidence,
    status: blockCheck.blocked ? 'blocked' : 'pending',
    dependencies: [],
    blocked_reason: blockCheck.blocked
      ? `Command contains blocked patterns: ${blockCheck.matchedPatterns.join(', ')}`
      : null,
    safe_replacement: blockCheck.blocked
      ? 'Review command manually. Use safe alternatives (read-only, dry-run, local only).'
      : null,
    autonomy_level: blockCheck.blocked ? 'X' : 'A3',
    evidence_required: true,
    approval_required: blockCheck.blocked || intent.confidence < 0.5,
  };

  const taskGraph = {
    task_graph_id: taskId,
    timestamp,
    requester: opts.requester || 'vibe-agent',
    status: blockCheck.blocked ? 'blocked' : 'pending_approval',
    original_command: command,
    normalized_command: normalizedCommand,
    terminology_normalized: termResult.normalized,
    brainstorm_id: opts.brainstormId || null,
    context_url: opts.contextUrl || null,
    tasks: [task],
    blocked: blockCheck.blocked,
    blocked_patterns: blockCheck.matchedPatterns,
    metadata: {
      parser_version: '1.0.0',
      canonical_term: TERMINOLOGY.canonical,
      deprecated_aliases: TERMINOLOGY.deprecated_aliases,
    },
  };

  return taskGraph;
}

/**
 * Parse a multi-step command (split by "then", "and then", ";").
 * @param {string} command
 * @param {object} opts
 * @returns {object} VibeTaskGraph with multiple tasks
 */
export function parseMultiStepCommand(command, opts = {}) {
  const steps = command
    .split(/\s+(?:then|and then|;|->)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (steps.length <= 1) {
    return parseCommand(command, opts);
  }

  const timestamp = new Date().toISOString();
  const taskId = `vibe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // Normalize terminology for full command
  const termResult = normalizeTerminology(command);
  if (termResult.rejected) {
    return {
      task_graph_id: taskId,
      timestamp,
      status: 'rejected',
      reason: termResult.reason,
      original_command: command,
      tasks: [],
      blocked: true,
    };
  }

  const tasks = [];
  const dependencies = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNorm = normalizeTerminology(step);

    if (stepNorm.rejected) {
      tasks.push({
        task_id: `${taskId}-t${i + 1}`,
        task_type: TASK_TYPES.UNKNOWN,
        description: 'Rejected due to invalid terminology',
        command: step,
        status: 'rejected',
        blocked_reason: stepNorm.reason,
        dependencies: i > 0 ? [`${taskId}-t${i}`] : [],
        autonomy_level: 'X',
      });
      continue;
    }

    const blockCheck = checkBlocked(stepNorm.text);
    const intent = classifyIntent(stepNorm.text);

    tasks.push({
      task_id: `${taskId}-t${i + 1}`,
      task_type: intent.taskType,
      description: intent.description,
      worker: intent.worker,
      command: stepNorm.text,
      confidence: intent.confidence,
      status: blockCheck.blocked ? 'blocked' : 'pending',
      dependencies: i > 0 ? [`${taskId}-t${i}`] : [],
      blocked_reason: blockCheck.blocked
        ? `Blocked patterns: ${blockCheck.matchedPatterns.join(', ')}`
        : null,
      safe_replacement: blockCheck.blocked
        ? 'Review manually. Use safe alternatives.'
        : null,
      autonomy_level: blockCheck.blocked ? 'X' : 'A3',
      evidence_required: true,
      approval_required: blockCheck.blocked || intent.confidence < 0.5,
    });
  }

  return {
    task_graph_id: taskId,
    timestamp,
    requester: opts.requester || 'vibe-agent',
    status: tasks.some((t) => t.status === 'blocked') ? 'blocked' : 'pending_approval',
    original_command: command,
    normalized_command: termResult.text,
    terminology_normalized: termResult.normalized,
    brainstorm_id: opts.brainstormId || null,
    context_url: opts.contextUrl || null,
    tasks,
    blocked: tasks.some((t) => t.status === 'blocked'),
    metadata: {
      parser_version: '1.0.0',
      step_count: steps.length,
      canonical_term: TERMINOLOGY.canonical,
    },
  };
}

// ─── Exports ───────────────────────────────────────────────────

export {
  TASK_TYPES,
  WORKER_TYPES,
  INTENT_PATTERNS,
  BLOCKED_PATTERNS,
  TERMINOLOGY,
  normalizeTerminology,
  checkBlocked,
  classifyIntent,
};

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv.slice(2).join(' ');
  if (!command) {
    console.error('Usage: node vibe-task-parser.mjs "natural language command"');
    process.exit(1);
  }
  const result = parseMultiStepCommand(command);
  console.log(JSON.stringify(result, null, 2));
}