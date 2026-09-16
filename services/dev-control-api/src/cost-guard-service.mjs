/**
 * Cost Guard Service
 * Phase 3C Implementation
 * 
 * Purpose: Monitor and enforce spending limits for AI operations
 * Classification: P100_PHASE_3_COST_GUARD
 * Mode: READ-ONLY PLAN -> IMPLEMENTATION
 */

import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

// Cost Guard Configuration (from .env.example)
const COST_GUARD_CONFIG = {
  ENABLED: process.env.COST_GUARD_ENABLED === 'true',
  MAX_REPAIR_ATTEMPTS: parseInt(process.env.MAX_REPAIR_ATTEMPTS || '2', 10),
  MAX_SPEND_PER_TASK_USD: parseFloat(process.env.MAX_SPEND_PER_TASK_USD || '5'),
  MAX_RUNTIME_MINUTES: parseInt(process.env.MAX_RUNTIME_MINUTES || '60', 10),
  STOP_ON_REPEATED_FAILURE: process.env.STOP_ON_REPEATED_FAILURE === 'true',
  BUDGET_GUARD_MODE: process.env.BUDGET_GUARD_MODE || 'free_first',
  MAX_TASK_BUDGET_USD: parseFloat(process.env.MAX_TASK_BUDGET_USD || '2.00'),
  ESCALATION_THRESHOLD_USD: parseFloat(process.env.ESCALATION_THRESHOLD_USD || '0.50'),
  HARD_STOP_USD: parseFloat(process.env.HARD_STOP_USD || '5.00')
};

/**
 * Cost Event Schema
 */
export class CostEvent {
  constructor({
    task_id,
    actor,
    provider,
    input_tokens = 0,
    output_tokens = 0,
    estimated_cost_usd = 0,
    correlation_id = randomUUID()
  } = {}) {
    this.correlation_id = correlation_id;
    this.task_id = task_id;
    this.actor = actor;
    this.provider = provider;
    this.input_tokens = input_tokens;
    this.output_tokens = output_tokens;
    this.estimated_cost_usd = estimated_cost_usd;
    this.runtime_seconds = 0;
    this.attempt = 1;
    this.status = 'pending';
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      correlation_id: this.correlation_id,
      task_id: this.task_id,
      actor: this.actor,
      provider: this.provider,
      input_tokens: this.input_tokens,
      output_tokens: this.output_tokens,
      estimated_cost_usd: this.estimated_cost_usd,
      runtime_seconds: this.runtime_seconds,
      attempt: this.attempt,
      status: this.status,
      timestamp: this.timestamp
    };
  }
}

/**
 * Cost Guard Service
 */
export class CostGuard {
  constructor(config = COST_GUARD_CONFIG) {
    this.config = config;
    this.activeTasks = new Map();
    this.totalSpentToday = 0;
    this.startTime = performance.now();
  }

  /**
   * Check if a task can proceed within budget
   */
  canProceed(taskId, estimatedCost = 0) {
    if (!this.config.ENABLED) {
      return { allowed: true, reason: 'Cost guard disabled' };
    }

    const task = this.activeTasks.get(taskId);
    
    // Check task budget
    const currentTaskCost = task?.total_cost_usd || 0;
    if (currentTaskCost + estimatedCost > this.config.MAX_SPEND_PER_TASK_USD) {
      return {
        allowed: false,
        reason: `Task budget exceeded: $${currentTaskCost + estimatedCost} > $${this.config.MAX_SPEND_PER_TASK_USD}`
      };
    }

    // Check daily budget
    if (this.totalSpentToday + estimatedCost > this.config.HARD_STOP_USD) {
      return {
        allowed: false,
        reason: `Daily budget exceeded: $${this.totalSpentToday + estimatedCost} > $${this.config.HARD_STOP_USD}`
      };
    }

    return { allowed: true, reason: 'Within budget' };
  }

  /**
   * Record a cost event
   */
  recordCost(event) {
    const {
      task_id,
      estimated_cost_usd,
      runtime_seconds,
      attempt
    } = event;

    // Update task tracking
    if (!this.activeTasks.has(task_id)) {
      this.activeTasks.set(task_id, {
        total_cost_usd: 0,
        start_time: Date.now(),
        attempts: 0
      });
    }

    const task = this.activeTasks.get(task_id);
    task.total_cost_usd += estimated_cost_usd;
    task.attempts = attempt;

    // Update daily total
    this.totalSpentToday += estimated_cost_usd;

    // Check for alerts
    if (estimated_cost_usd > this.config.ESCALATION_THRESHOLD_USD) {
      this.triggerAlert('cost_threshold_exceeded', {
        task_id,
        cost: estimated_cost_usd,
        threshold: this.config.ESCALATION_THRESHOLD_USD
      });
    }

    if (this.totalSpentToday > this.config.HARD_STOP_USD) {
      this.triggerAlert('daily_budget_exceeded', {
        total: this.totalSpentToday,
        limit: this.config.HARD_STOP_USD
      });
    }

    return event.toJSON();
  }

  /**
   * Trigger cost alert
   */
  triggerAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: new Date().toISOString(),
      correlation_id: randomUUID()
    };

    // Log alert (in production, send to monitoring system)
    console.warn(`[COST_ALERT] ${type}:`, JSON.stringify(data));

    return alert;
  }

  /**
   * Get cost status
   */
  getStatus(taskId = null) {
    const task = taskId ? this.activeTasks.get(taskId) : null;

    return {
      total_cost_usd: this.totalSpentToday,
      task_budget_usd: this.config.MAX_SPEND_PER_TASK_USD,
      remaining_budget_usd: this.config.HARD_STOP_USD - this.totalSpentToday,
      current_task_cost_usd: task?.total_cost_usd || 0,
      tasks_count: this.activeTasks.size,
      last_updated: new Date().toISOString(),
      config: {
        enabled: this.config.ENABLED,
        max_spend_per_task: this.config.MAX_SPEND_PER_TASK_USD,
        hard_stop: this.config.HARD_STOP_USD,
        daily_limit: this.config.HARD_STOP_USD
      }
    };
  }

  /**
   * Reset cost tracking for a task
   */
  resetTask(taskId) {
    this.activeTasks.delete(taskId);
    return { success: true, task_id: taskId };
  }

  /**
   * Get cost history (read-only simulation)
   */
  getHistory() {
    return Array.from(this.activeTasks.entries()).map(([task_id, data]) => ({
      task_id,
      total_cost_usd: data.total_cost_usd,
      attempts: data.attempts,
      duration_ms: Date.now() - data.start_time
    }));
  }
}

// Singleton instance
export const costGuard = new CostGuard();

// Middleware for Express/Fastify
export function costGuardMiddleware(options = {}) {
  return (req, res, next) => {
    const taskId = req.headers['x-task-id'] || randomUUID();
    const estimatedCost = parseFloat(req.headers['x-estimated-cost'] || '0');

    const check = costGuard.canProceed(taskId, estimatedCost);

    if (!check.allowed) {
      return res.status(402).json({
        error: 'Cost limit exceeded',
        reason: check.reason
      });
    }

    req.taskId = taskId;
    next();
  };
}

// Export default
export default CostGuard;