PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS spec_queue (
  spec_id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  title TEXT NOT NULL,
  current_state TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'QUEUED','RUNNING','PAUSED_AT_GATE','BLOCKED','FAILED','COMPLETE'
  )),
  priority INTEGER NOT NULL DEFAULT 100,
  worktree_path TEXT,
  implement_agent_instance_id TEXT,
  review_agent_instance_id TEXT,
  blocked_reason TEXT,
  requested_paths_json TEXT NOT NULL DEFAULT '[]',
  evidence_head_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS a2a_tasks (
  task_id TEXT PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  agent_instance_id TEXT,
  state TEXT NOT NULL,
  action_requested TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'QUEUED','DISPATCHED','RUNNING','SUCCEEDED','FAILED','CANCELLED','STALLED'
  )),
  evidence_hash TEXT,
  created_at TEXT NOT NULL,
  dispatched_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_log (
  run_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES a2a_tasks(task_id),
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  agent TEXT NOT NULL,
  agent_instance_id TEXT NOT NULL,
  process_id INTEGER,
  started_at TEXT NOT NULL,
  last_heartbeat_at TEXT,
  heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 30,
  timeout_seconds INTEGER NOT NULL DEFAULT 180,
  ended_at TEXT,
  exit_code INTEGER,
  stdout_hash TEXT,
  stderr_hash TEXT,
  verdict TEXT CHECK (verdict IN ('PASS','WARN','BLOCK','FAIL')),
  status TEXT NOT NULL CHECK (status IN (
    'RUNNING','SUCCEEDED','FAILED','STALLED','CANCELLED'
  ))
);

CREATE TABLE IF NOT EXISTS evidence_events (
  evidence_id TEXT PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  state TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  artifact_path TEXT,
  artifact_hash TEXT,
  verdict TEXT NOT NULL CHECK (verdict IN ('PASS','WARN','BLOCK','FAIL')),
  prev_chain_hash TEXT,
  event_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_chain
ON evidence_events(spec_id, created_at, evidence_id);

CREATE TABLE IF NOT EXISTS gate_approvals (
  gate_id TEXT PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  gate_type TEXT NOT NULL,
  state TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  expires_at TEXT,
  decided_at TEXT,
  decision TEXT CHECK (decision IN ('APPROVED','REJECTED','EXPIRED')),
  decided_by TEXT,
  decision_note TEXT
);

CREATE TABLE IF NOT EXISTS proposed_file_leases (
  proposal_id TEXT PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  paths_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_leases (
  lease_id TEXT PRIMARY KEY,
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  gate_id TEXT REFERENCES gate_approvals(gate_id),
  approved_by TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  paths_json TEXT NOT NULL,
  action_scope TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','EXPIRED','REVOKED','RELEASED')),
  released_at TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_file_leases_active
ON file_leases(status, expires_at);

CREATE TRIGGER IF NOT EXISTS prevent_overlapping_active_leases
BEFORE INSERT ON file_leases
WHEN NEW.status = 'ACTIVE'
BEGIN
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM file_leases AS existing
        JOIN json_each(existing.paths_json) AS old_path
        JOIN json_each(NEW.paths_json) AS new_path
        WHERE existing.status = 'ACTIVE'
          AND existing.expires_at > datetime('now')
          AND (
            old_path.value = new_path.value
            OR old_path.value GLOB (new_path.value || '/*')
            OR new_path.value GLOB (old_path.value || '/*')
          )
      )
      THEN RAISE(ABORT, 'active lease path overlap')
    END;
END;

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  job_id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  spec_id TEXT REFERENCES spec_queue(spec_id),
  job_type TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL,
  checks_json TEXT NOT NULL,
  allowed_actions TEXT NOT NULL,
  last_run_at TEXT,
  last_verdict TEXT CHECK (last_verdict IN ('PASS','WARN','BLOCK','FAIL')),
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS monitoring_receipts (
  receipt_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES scheduled_jobs(job_id),
  ran_at TEXT NOT NULL,
  result_json TEXT NOT NULL,
  classification TEXT,
  verdict TEXT NOT NULL CHECK (verdict IN ('PASS','WARN','BLOCK','FAIL'))
);

CREATE TABLE IF NOT EXISTS project_budget (
  project_id TEXT PRIMARY KEY,
  daily_token_limit INTEGER NOT NULL,
  daily_cost_limit_usd REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_cost_log (
  cost_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project_budget(project_id),
  spec_id TEXT NOT NULL REFERENCES spec_queue(spec_id),
  task_id TEXT REFERENCES a2a_tasks(task_id),
  agent TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_cost_day
ON agent_cost_log(project_id, created_at);

CREATE TABLE IF NOT EXISTS notification_events (
  notification_id TEXT PRIMARY KEY,
  spec_id TEXT REFERENCES spec_queue(spec_id),
  severity TEXT NOT NULL CHECK (severity IN ('INFO','WARN','URGENT')),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  urgent INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE TABLE IF NOT EXISTS governance_backups (
  backup_id TEXT PRIMARY KEY,
  db_path TEXT NOT NULL,
  backup_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  verified_at TEXT
);

