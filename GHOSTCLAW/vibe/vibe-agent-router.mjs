/**
 * GHOSTCLAW Vibe Agent Router
 * Phase 5 — Route vibe tasks to appropriate workers based on task graph
 *
 * Autonomy Level: A4 (Bounded agent — routes tasks, does not execute directly)
 *
 * The router:
 * 1. Receives a VibeTaskGraph from the parser
 * 2. Validates each task against worker policies
 * 3. Selects the appropriate worker for each task
 * 4. Creates an execution plan with evidence pack requirements
 * 5. Requests mutual approval (requester ≠ approver)
 * 6. Executes safe tasks via worker modules
 * 7. Writes execution receipt
 * 8. Archives the task graph + receipt
 *
 * Blocked actions are never executed. They produce blocked receipts.
 *
 * Canonical terminology: brainstorm (canonical), beststorm (legacy alias), beststrom (invalid typo).
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTER_ID = 'vibe-agent-router';
const ROUTER_VERSION = '1.0.0';
const ARCHIVE_DIR = join(__dirname, 'archive');
const RECEIPTS_DIR = join(__dirname, 'receipts');
const HUMAN_APPROVAL_REQUIRED = false;
const RECEIPT_REQUIRED = true;

// ─── Worker Registry ───────────────────────────────────────────

const WORKER_REGISTRY = {
  'browser-use-worker': {
    id: 'browser-use-worker',
    module_path: join(__dirname, '..', 'workers', 'browser-use', 'browser-use-worker.mjs'),
    policy_path: join(__dirname, '..', 'workers', 'browser-use', 'browser-use.policy.yaml'),
    autonomy_level: 'A4',
    task_types: ['browser_smoke', 'dashboard_verify'],
    description: 'Browser automation for local dashboard smoke testing',
  },
  'codex-worker': {
    id: 'codex-worker',
    module_path: null, // Agent definition: GHOSTCLAW/agents/codex-captain.md
    policy_path: join(__dirname, '..', 'policies', 'autonomous-safe-execution-v3.yaml'),
    autonomy_level: 'B',
    task_types: ['file_operation', 'code_generation', 'git_operation', 'docs_update'],
    description: 'Code execution worker — writes to allowed paths',
  },
  'glm-worker': {
    id: 'glm-worker',
    module_path: null, // Agent definition: GHOSTCLAW/agents/glm-worker.md
    policy_path: null,
    autonomy_level: 'B',
    task_types: ['research', 'analysis'],
    description: 'GLM research worker',
  },
  'deepseek-worker': {
    id: 'deepseek-worker',
    module_path: null, // Agent definition: GHOSTCLAW/agents/deepseek-worker.md
    policy_path: null,
    autonomy_level: 'B',
    task_types: ['research', 'analysis'],
    description: 'DeepSeek research worker',
  },
  'kob-validator': {
    id: 'kob-validator',
    module_path: null, // Agent definition: GHOSTCLAW/agents/kob-validator.md
    policy_path: null,
    autonomy_level: 'A',
    task_types: ['test_run', 'policy_check'],
    description: 'Validation worker — runs tests and policy checks',
  },
  'manual': {
    id: 'manual',
    module_path: null,
    policy_path: null,
    autonomy_level: 'A0',
    task_types: ['setup', 'unknown'],
    description: 'Manual human operator action required',
  },
};

// ─── Mutual Approval ──────────────────────────────────────────

/**
 * Check mutual approval constraint.
 * The requester must not be the approver.
 * @param {string} requester
 * @param {string} approver
 * @returns {{ valid: boolean, reason: string }}
 */
function checkMutualApproval(requester, approver) {
  if (!requester || !approver) {
    return { valid: false, reason: 'Both requester and approver must be specified' };
  }
  if (requester === approver) {
    return { valid: false, reason: 'Self-approval is not allowed. Requester must not equal approver.' };
  }
  return { valid: true, reason: 'Mutual approval constraint satisfied' };
}

function createApprovalDecision({ planId, requester, approver, allBlocked }) {
  const approval = checkMutualApproval(requester, approver);
  const decisionId = `decision-${planId}`;

  return {
    decision_id: decisionId,
    requested: true,
    status: approval.valid ? 'approved' : 'rejected',
    reason: allBlocked && approval.valid ? 'mutual_approval_satisfied_for_blocked_receipt_archive' : approval.reason,
    requester_agent: requester,
    approver_agent: approver,
    self_approval_allowed: false,
    human_approval_required: HUMAN_APPROVAL_REQUIRED,
    receipt_required: RECEIPT_REQUIRED,
  };
}

// ─── Task Validation ──────────────────────────────────────────

/**
 * Validate a task against worker policy.
 * @param {object} task - Task node from VibeTaskGraph
 * @returns {{ valid: boolean, worker: object|null, reason: string }}
 */
function validateTask(task) {
  if (task.status === 'blocked') {
    return {
      valid: false,
      worker: null,
      reason: task.blocked_reason || 'Task is blocked',
    };
  }

  if (task.status === 'rejected') {
    return {
      valid: false,
      worker: null,
      reason: task.blocked_reason || 'Task is rejected',
    };
  }

  const worker = WORKER_REGISTRY[task.worker];
  if (!worker) {
    return {
      valid: false,
      worker: null,
      reason: `Unknown worker: ${task.worker}`,
    };
  }

  if (!worker.task_types.includes(task.task_type)) {
    return {
      valid: false,
      worker,
      reason: `Worker "${worker.id}" does not handle task type "${task.task_type}"`,
    };
  }

  return {
    valid: true,
    worker,
    reason: 'Task is valid',
  };
}

// ─── Execution Plan ───────────────────────────────────────────

/**
 * Create an execution plan for a VibeTaskGraph.
 * @param {object} taskGraph - VibeTaskGraph from parser
 * @param {object} opts - { requester, approver }
 * @returns {object} Execution plan
 */
export function createExecutionPlan(taskGraph, opts = {}) {
  const requester = opts.requester || taskGraph.requester || 'vibe-agent';
  const approver = opts.approver || 'hermes-commander';
  const planId = opts.planId || `plan-${Date.now().toString(36)}`;

  const plan = {
    plan_id: planId,
    task_graph_id: taskGraph.task_graph_id,
    timestamp: new Date().toISOString(),
    requester,
    approver,
    requester_agent: requester,
    approver_agent: approver,
    approval_status: 'pending',
    approval_reason: null,
    router_id: ROUTER_ID,
    router_version: ROUTER_VERSION,
    decision_id: null,
    human_approval_required: HUMAN_APPROVAL_REQUIRED,
    receipt_required: RECEIPT_REQUIRED,
    mutual_approval: null,
    tasks: [],
    evidence_pack: {
      id: `evidence-${planId}`,
      required: true,
      receipt_required: RECEIPT_REQUIRED,
      requester_agent: requester,
      approver_agent: approver,
      decision_id: null,
      artifacts: [],
    },
    receipts_dir: opts.receiptsDir || null,
    archive_dir: opts.archiveDir || null,
    archive_path: null,
    status: 'pending_approval',
  };

  for (const task of taskGraph.tasks) {
    const validation = validateTask(task);

    plan.tasks.push({
      task_id: task.task_id,
      task_type: task.task_type,
      description: task.description,
      worker: task.worker,
      command: task.command,
      validation: validation.valid,
      validation_reason: validation.reason,
      status: validation.valid ? 'pending_execution' : task.status,
      autonomy_level: validation.valid ? validation.worker.autonomy_level : 'X',
      evidence_required: task.evidence_required !== false,
      safe_replacement: task.safe_replacement || null,
      blocked_reason: task.blocked_reason || null,
      dependencies: task.dependencies || [],
    });

    if (validation.valid && task.evidence_required !== false) {
      plan.evidence_pack.artifacts.push({
        task_id: task.task_id,
        type: 'receipt',
        format: 'json',
      });
    }
  }

  // Determine plan status
  const allBlocked = plan.tasks.every((t) => !t.validation);
  const decision = createApprovalDecision({ planId, requester, approver, allBlocked });

  plan.decision_id = decision.decision_id;
  plan.approval_status = decision.status;
  plan.approval_reason = decision.reason;
  plan.mutual_approval = decision;
  plan.evidence_pack.decision_id = decision.decision_id;
  plan.evidence_pack.artifacts.unshift({
    task_id: taskGraph.task_graph_id,
    type: 'decision_artifact',
    format: 'json',
    decision_id: decision.decision_id,
  });
  plan.evidence_pack.artifacts.unshift({
    task_id: taskGraph.task_graph_id,
    type: 'execution_plan',
    format: 'json',
    decision_id: decision.decision_id,
  });

  if (decision.status !== 'approved') {
    plan.status = 'rejected';
  } else if (allBlocked) {
    plan.status = 'all_blocked';
  } else {
    plan.status = 'approved';
  }

  return plan;
}

function validateExecutablePlan(plan) {
  if (plan.approval_status !== 'approved') {
    return {
      valid: false,
      reason: plan.approval_reason || 'Plan has not received mutual approval',
    };
  }

  if (!plan.decision_id || !plan.evidence_pack?.required || plan.receipt_required !== true) {
    return {
      valid: false,
      reason: 'Plan is missing decision_id, required evidence_pack, or receipt_required=true',
    };
  }

  const approval = checkMutualApproval(plan.requester, plan.approver);
  if (!approval.valid) {
    return {
      valid: false,
      reason: approval.reason,
    };
  }

  return {
    valid: true,
    reason: 'Execution plan is mutually approved with required evidence pack',
  };
}

// ─── Task Execution ───────────────────────────────────────────

/**
 * Execute a single task via the appropriate worker.
 * Only safe, validated tasks are executed. Blocked tasks produce blocked receipts.
 *
 * @param {object} task - Task from execution plan
 * @param {object} plan - Full execution plan
 * @returns {Promise<object>} Execution result
 */
async function executeTask(task, plan) {
  if (!task.validation) {
    return {
      task_id: task.task_id,
      status: 'blocked',
      reason: task.validation_reason,
      receipt: {
        task_id: task.task_id,
        status: 'blocked',
        reason: task.blocked_reason || task.validation_reason,
        safe_replacement: task.safe_replacement || 'Manual review required',
        timestamp: new Date().toISOString(),
        plan_id: plan.plan_id,
        decision_id: plan.decision_id,
        requester_agent: plan.requester,
        approver_agent: plan.approver,
        receipt_required: RECEIPT_REQUIRED,
        evidence_pack_id: plan.evidence_pack?.id || null,
      },
    };
  }

  const worker = WORKER_REGISTRY[task.worker];

  // For workers with module paths, dynamically import and execute
  if (worker.module_path && existsSync(worker.module_path)) {
    try {
      const workerModule = await import(worker.module_path);

      // Browser use worker
      if (task.worker === 'browser-use-worker' && workerModule.main) {
        const result = await workerModule.main({
          url: 'http://127.0.0.1:8721',
          action: task.task_type === 'browser_smoke' ? 'smoke' : 'smoke',
          decision_id: plan.decision_id,
          evidence_pack: plan.evidence_pack,
          requester_agent: plan.requester,
          approver_agent: plan.approver,
          receipt_required: RECEIPT_REQUIRED,
        });
        return {
          task_id: task.task_id,
          status: result.status || 'completed',
          result,
          receipt: result,
        };
      }

      // Generic worker main function
      if (workerModule.main) {
        const result = await workerModule.main({
          command: task.command,
          decision_id: plan.decision_id,
          evidence_pack: plan.evidence_pack,
          requester_agent: plan.requester,
          approver_agent: plan.approver,
          receipt_required: RECEIPT_REQUIRED,
        });
        return {
          task_id: task.task_id,
          status: result.status || 'completed',
          result,
          receipt: result,
        };
      }
    } catch (err) {
      return {
        task_id: task.task_id,
        status: 'failed',
        error: err.message,
        receipt: {
          task_id: task.task_id,
          status: 'failed',
          error: err.message,
          timestamp: new Date().toISOString(),
          plan_id: plan.plan_id,
          decision_id: plan.decision_id,
          requester_agent: plan.requester,
          approver_agent: plan.approver,
          receipt_required: RECEIPT_REQUIRED,
          evidence_pack_id: plan.evidence_pack?.id || null,
        },
      };
    }
  }

  // Manual or no-module workers — produce a task description receipt
  return {
    task_id: task.task_id,
    status: 'manual_required',
    reason: `Worker "${task.worker}" has no executable module. Manual action required.`,
    worker_description: worker.description,
    receipt: {
      task_id: task.task_id,
      status: 'manual_required',
      worker: task.worker,
      command: task.command,
      description: task.description,
      timestamp: new Date().toISOString(),
      plan_id: plan.plan_id,
      decision_id: plan.decision_id,
      requester_agent: plan.requester,
      approver_agent: plan.approver,
      receipt_required: RECEIPT_REQUIRED,
      evidence_pack_id: plan.evidence_pack?.id || null,
    },
  };
}

// ─── Execute Plan ─────────────────────────────────────────────

/**
 * Execute an execution plan.
 * Runs each task sequentially, respecting dependencies.
 *
 * @param {object} plan - Execution plan from createExecutionPlan
 * @returns {Promise<object>} Execution result with receipts
 */
export async function executePlan(plan) {
  if (plan.status === 'rejected') {
    return {
      plan_id: plan.plan_id,
      status: 'rejected',
      reason: plan.approval_reason,
      results: [],
    };
  }

  const executable = validateExecutablePlan(plan);
  if (!executable.valid) {
    return {
      plan_id: plan.plan_id,
      status: 'rejected',
      reason: executable.reason,
      results: [],
    };
  }

  const receiptsDir = plan.receipts_dir || RECEIPTS_DIR;
  const archiveDir = plan.archive_dir || ARCHIVE_DIR;

  await mkdir(receiptsDir, { recursive: true });

  const results = [];
  const completedTasks = new Set();

  for (const task of plan.tasks) {
    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const allDepsComplete = task.dependencies.every((dep) => completedTasks.has(dep));
      if (!allDepsComplete) {
        results.push({
          task_id: task.task_id,
          status: 'skipped',
          reason: 'Dependencies not met',
        });
        continue;
      }
    }

    const result = await executeTask(task, plan);
    results.push(result);

    if (result.status === 'completed' || result.status === 'pass' || result.status === 'pass_with_warnings') {
      completedTasks.add(task.task_id);
    }
  }

  // Write overall execution receipt
  const receipt = {
    plan_id: plan.plan_id,
    task_graph_id: plan.task_graph_id,
    timestamp: new Date().toISOString(),
    router_id: ROUTER_ID,
    router_version: ROUTER_VERSION,
    requester: plan.requester,
    approver: plan.approver,
    requester_agent: plan.requester,
    approver_agent: plan.approver,
    decision_id: plan.decision_id,
    approval_status: plan.approval_status,
    approval_reason: plan.approval_reason,
    mutual_approval: plan.mutual_approval,
    receipt_required: RECEIPT_REQUIRED,
    evidence_pack: plan.evidence_pack,
    results,
    summary: {
      total: results.length,
      completed: results.filter((r) => r.status === 'completed' || r.status === 'pass' || r.status === 'pass_with_warnings').length,
      blocked: results.filter((r) => r.status === 'blocked').length,
      failed: results.filter((r) => r.status === 'failed').length,
      manual: results.filter((r) => r.status === 'manual_required').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
    },
  };

  const archivePath = join(archiveDir, `${plan.plan_id}`);
  receipt.archive_path = archivePath;
  plan.archive_path = archivePath;

  // Write receipt
  const receiptPath = join(receiptsDir, `plan-${plan.plan_id}.json`);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2), 'utf-8');

  // Archive
  await mkdir(archivePath, { recursive: true });
  await writeFile(join(archivePath, 'plan.json'), JSON.stringify(plan, null, 2), 'utf-8');
  await writeFile(join(archivePath, 'receipt.json'), JSON.stringify(receipt, null, 2), 'utf-8');

  return receipt;
}

// ─── Full Pipeline ────────────────────────────────────────────

/**
 * Full vibe pipeline: parse → plan → approve → execute → receipt → archive.
 *
 * @param {string} command - Natural language command
 * @param {object} opts - { requester, approver, brainstormId, contextUrl, dryRun }
 * @returns {Promise<object>} Full pipeline result
 */
export async function runVibePipeline(command, opts = {}) {
  // Dynamically import parser
  const { parseMultiStepCommand } = await import(join(__dirname, 'vibe-task-parser.mjs'));

  // Step 1: Parse
  const taskGraph = parseMultiStepCommand(command, {
    requester: opts.requester || 'vibe-agent',
    brainstormId: opts.brainstormId,
    contextUrl: opts.contextUrl,
  });

  // Step 2: Create execution plan
  const plan = createExecutionPlan(taskGraph, {
    requester: opts.requester || 'vibe-agent',
    approver: opts.approver || 'hermes-commander',
  });

  // Step 3: Check approval
  if (plan.status === 'rejected') {
    return {
      pipeline: 'vibe-agent',
      step: 'approval_check',
      status: 'rejected',
      reason: plan.approval_reason,
      task_graph: taskGraph,
      plan,
    };
  }

  // Step 4: Dry run check
  if (opts.dryRun) {
    return {
      pipeline: 'vibe-agent',
      step: 'dry_run',
      status: 'dry_run_complete',
      task_graph: taskGraph,
      plan,
      message: 'Dry run — no tasks executed.',
    };
  }

  // Step 5: Execute
  const receipt = await executePlan(plan);

  return {
    pipeline: 'vibe-agent',
    step: 'completed',
    status: 'completed',
    task_graph_id: taskGraph.task_graph_id,
    plan_id: plan.plan_id,
    task_graph: taskGraph,
    plan,
    receipt,
  };
}

// ─── Exports ───────────────────────────────────────────────────

export {
  ROUTER_ID,
  ROUTER_VERSION,
  WORKER_REGISTRY,
  checkMutualApproval,
  validateTask,
  createApprovalDecision,
  validateExecutablePlan,
};

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv.slice(2).join(' ');
  if (!command) {
    console.error('Usage: node vibe-agent-router.mjs "natural language command"');
    console.error('Add --dry-run for dry run mode');
    process.exit(1);
  }

  const dryRun = command.includes('--dry-run');
  const cleanCommand = command.replace('--dry-run', '').trim();

  runVibePipeline(cleanCommand, { dryRun })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error('Vibe pipeline error:', err.message);
      process.exit(1);
    });
}
