-- SIRINXDev v8.2 Cloudflare Agent Team schema draft.
-- Draft only. Do not apply to D1 without approval.

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  approval_id TEXT,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  requested_action TEXT NOT NULL,
  status TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  evidence_path TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_objects (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  private_by_default INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  chunk_hash TEXT NOT NULL,
  redaction_policy TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_ledger (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  service TEXT NOT NULL,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
