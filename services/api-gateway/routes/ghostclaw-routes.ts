/**
 * GHOSTCLAW_LOOP_ENGINEERING - API Routes
 * Phase 2B Step 3: Full Route Implementation
 */

import { Router } from 'express';
import { agentController, taskQueueController, agentRunController } from '../controllers/ghostclaw-controllers';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ghostclaw-api',
    correlation_id: (req as any).correlationId
  });
});

// Agent Endpoints
router.get('/agents', agentController.list);
router.post('/agents', agentController.create);
router.patch('/agents/:id/status', agentController.updateStatus);

// Task Queue Endpoints
router.get('/task-queue', taskQueueController.list);
router.post('/task-queue', taskQueueController.create);
router.post('/task-queue/:id/assign', taskQueueController.assign);
router.post('/task-queue/:id/complete', taskQueueController.complete);

// Agent Run Endpoints
router.post('/agents/:agentId/runs', agentRunController.create);
router.post('/runs/:id/complete', agentRunController.complete);

// GhostClaw specific: Run a full agent cycle
router.post('/ghostclaw/run', async (req: any, res: any) => {
  const { agent_role, task_description } = req.body;

  // 1. Find available agent
  // 2. Assign task
  // 3. Return run ID for polling
  // Dry-run: simulate

  const runId = `run-${Date.now()}`;

  res.status(202).json({
    run_id: runId,
    status: 'started',
    agent_role,
    correlation_id: req.correlationId,
    message: 'Agent cycle started (dry-run mode)'
  });
});

export default router;