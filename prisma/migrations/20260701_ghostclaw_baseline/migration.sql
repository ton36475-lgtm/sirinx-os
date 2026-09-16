-- Migration: 20260701_ghostclaw_baseline
-- Phase 2A Step 2: Raw SQL Migration

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  capabilities LONGTEXT,
  status VARCHAR(255) NOT NULL DEFAULT 'idle',
  last_heartbeat TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create agent_runs table
CREATE TABLE IF NOT EXISTS agent_runs (
  id VARCHAR(191) PRIMARY KEY,
  agent_id VARCHAR(191) NOT NULL,
  task LONGTEXT,
  model_name VARCHAR(255),
  prompt_name VARCHAR(255),
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost_estimate DOUBLE NOT NULL DEFAULT 0,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  correlation_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create task_queue table
CREATE TABLE IF NOT EXISTS task_queue (
  id VARCHAR(191) PRIMARY KEY,
  task_type VARCHAR(255) NOT NULL,
  description LONGTEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  agent_id VARCHAR(191),
  input LONGTEXT,
  output LONGTEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS agents_role_idx ON agents(role);
CREATE INDEX IF NOT EXISTS agents_status_idx ON agents(status);
CREATE INDEX IF NOT EXISTS agent_runs_agent_id_idx ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS agent_runs_status_idx ON agent_runs(status);
CREATE INDEX IF NOT EXISTS task_queue_status_idx ON task_queue(status);
CREATE INDEX IF NOT EXISTS task_queue_task_type_idx ON task_queue(task_type);

-- Seed data
INSERT INTO agents (id, name, role, capabilities, status) VALUES
('gc-planner-01', 'Planner Agent', 'planner', '{"plan","inspect","file","search"}', 'idle'),
('gc-frontend-01', 'Frontend Agent', 'frontend', '{"figma","mermaid","ui","design"}', 'idle'),
('gc-backend-01', 'Backend Agent', 'backend', '{"schema","api","sql","database"}', 'idle'),
('gc-review-01', 'Review Agent', 'reviewer', '{"verify","test","audit","security"}', 'idle');

INSERT INTO task_queue (id, task_type, description, priority) VALUES
('gc-task-01', 'schema', 'Create agent tables', 100),
('gc-task-02', 'api', 'Create REST endpoints', 100),
('gc-task-03', 'figma', 'Create dashboard components', 100);