-- GHOSTCLAW_LOOP_ENGINEERING System Schema
-- Extensions to AGENTS.md baseline tables

-- Agent registry table
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL, -- planner, frontend, backend, browser, devops, reviewer
  capabilities JSON,
  status VARCHAR(32) DEFAULT 'idle',
  last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Agent run tracking
CREATE TABLE IF NOT EXISTS ghostclaw_agent_runs (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64),
  task_description TEXT,
  model_name VARCHAR(128),
  prompt_version VARCHAR(32),
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  cost_estimate DECIMAL(10,4),
  status VARCHAR(32), -- running, completed, failed, cancelled
  result_path TEXT, -- where output file stored
  correlation_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Agent task queue
CREATE TABLE IF NOT EXISTS ghostclaw_task_queue (
  id VARCHAR(64) PRIMARY KEY,
  task_type VARCHAR(64), -- figma, schema, diagram, api, review
  priority INT DEFAULT 100,
  status VARCHAR(32) DEFAULT 'pending', -- pending, assigned, completed, failed
  assigned_agent_id VARCHAR(64),
  input_data JSON,
  output_ref VARCHAR(256),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
);

-- Agent collaboration log
CREATE TABLE IF NOT EXISTS ghostclaw_collaboration_log (
  id VARCHAR(64) PRIMARY KEY,
  from_agent_id VARCHAR(64),
  to_agent_id VARCHAR(64),
  message_type VARCHAR(64),
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);