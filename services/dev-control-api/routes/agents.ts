/**
 * GHOSTCLAW_LOOP_ENGINEERING API Routes
 * Phase 1B: Agent Runs Endpoints
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/agents - List all agents
router.get('/agents', async (req, res) => {
  // Dry-run stub - returns empty array
  res.json([]);
});

// POST /api/agents/:id/runs - Create agent run
router.post('/agents/:id/runs', async (req, res) => {
  const { id } = req.params;
  const { task_description, input_data } = req.body;

  // Dry-run stub - creates record structure
  const run = {
    id: uuidv4(),
    agent_id: id,
    task_description,
    status: 'running',
    created_at: new Date().toISOString()
  };

  res.status(201).json(run);
});

// GET /api/task-queue - Get pending tasks
router.get('/task-queue', async (req, res) => {
  // Dry-run stub
  res.json([]);
});

// POST /api/task-queue - Enqueue task
router.post('/task-queue', async (req, res) => {
  const { task_type, task_description, input_data } = req.body;

  // Dry-run stub
  const task = {
    id: uuidv4(),
    task_type,
    task_description,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  res.status(201).json(task);
});

export default router;