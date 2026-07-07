-- Migration: ghostclaw_seed_data
-- Phase 3C: Seed Data (dry-run template)

-- Seed agents
INSERT INTO agents (id, name, role, capabilities, status) VALUES
('gc-planner-01', 'Planner Agent', 'planner', '{"tasksRead":["architect","plan"],"tools":["file","terminal"]}', 'idle'),
('gc-builder-01', 'Builder Agent', 'builder', '{"tasksRead":["code","test"],"tools":["file","terminal"]}', 'idle'),
('gc-reviewer-01', 'Reviewer Agent', 'reviewer', '{"tasksRead":["review","security"],"tools":["file","terminal"]}', 'idle');

-- Seed task queue
INSERT INTO task_queue (id, task_type, description, priority, status) VALUES
('task-001', 'prisma_migrate', 'Generate Prisma client', 50, 'completed'),
('task-002', 'api_routes', 'Create agent endpoints', 100, 'in_progress'),
('task-003', 'ui_components', 'Build GhostClaw UI', 75, 'pending');

-- Note: This is a dry-run template. Real DB migration requires:
-- 1. Valid DATABASE_URL in .env
-- 2. MySQL server running
-- 3. Explicit approval for production migration