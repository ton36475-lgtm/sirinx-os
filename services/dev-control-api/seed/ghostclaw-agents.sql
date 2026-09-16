-- GHOSTCLAW_LOOP_ENGINEERING - Agent Registration Seed
-- Phase 1A: Initial agent records

INSERT INTO agents (id, name, role, capabilities, status) VALUES
('gc-planner-01', 'Planner Agent', 'planner', '{"plan","inspect","file"}', 'idle'),
('gc-frontend-01', 'Frontend Agent', 'frontend', '{"figma","mermaid","ui"}', 'idle'),
('gc-backend-01', 'Backend Agent', 'backend', '{"schema","api","sql"}', 'idle'),
('gc-review-01', 'Review Agent', 'reviewer', '{"verify","test","audit"}', 'idle');

-- GhostClaw task queue seed
INSERT INTO ghostclaw_task_queue (id, task_type, task_description, priority) VALUES
('task-figma-01', 'figma', 'Create dashboard components', 100),
('task-schema-01', 'schema', 'Create agent tables', 100),
('task-api-01', 'api', 'Create REST endpoints', 100),
('task-review-01', 'review', 'Verify integration', 100);