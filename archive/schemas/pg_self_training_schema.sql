-- ============================================================================
-- SIRINX GHOSTCLAW — Self-Training & Knowledge System (PostgreSQL 16+)
-- Design: Advanced PostgreSQL security + training-state persistence
-- Target: Local PG (brew postgresql@16) on Mac Mini M2
-- Compatible: SQLite fallback provided by self_training_loop.py
-- Author: solis (Hermes) — 2026-07-21
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS (security-relevant)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid, hashing
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- query perf / abuse detection

-- ---------------------------------------------------------------------------
-- 1. ROLES & ROW LEVEL SECURITY (defense-in-depth, multi-tenant agent data)
-- ---------------------------------------------------------------------------
-- Application role (least privilege). Training loop connects as this role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sirinx_trainer') THEN
    CREATE ROLE sirinx_trainer LOGIN PASSWORD 'CHANGE_ME_VIA_SECRET';
  END IF;
END $$;

-- Tenant/agent isolation: every training artifact belongs to an agent profile.
CREATE TABLE IF NOT EXISTS agent_profiles (
  agent_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL UNIQUE,
  tier            TEXT NOT NULL CHECK (tier IN ('A0','A1','A2','A3','A4','A5','A6')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Enable RLS on the core knowledge table so one agent cannot read another's
-- private training data even if SQL privilege allows table access.
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. KNOWLEDGE BASE (curated high-level skills & domain knowledge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge (
  knowledge_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agent_profiles(agent_id),
  category       TEXT NOT NULL CHECK (category IN
                    ('postgres_security','postgres_architecture','agentic_coding',
                     'mcp_integration','solar_roi','crisis_recovery','swarm_orchestration',
                     'qa_gate','brainstorm','observability','cost_guard')),
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  source         TEXT,                 -- URL / file / human
  confidence     NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_cat ON knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON knowledge(agent_id);

-- RLS: agents see only their own knowledge rows.
CREATE POLICY knowledge_agent_isolation ON knowledge
  FOR ALL TO sirinx_trainer
  USING (agent_id = current_setting('app.agent_id', TRUE)::uuid)
  WITH CHECK (agent_id = current_setting('app.agent_id', TRUE)::uuid);

-- ---------------------------------------------------------------------------
-- 3. SKILLS (procedural competencies, reusable workflows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  skill_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agent_profiles(agent_id),
  name           TEXT NOT NULL,
  description    TEXT NOT NULL,
  trigger        TEXT,                 -- when to apply
  steps          JSONB NOT NULL,       -- ordered step list
  tier           TEXT NOT NULL CHECK (tier IN ('A0','A1','A2','A3','A4','A5','A6')),
  success_count  INTEGER NOT NULL DEFAULT 0,
  fail_count     INTEGER NOT NULL DEFAULT 0,
  avg_score      NUMERIC(5,2),
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

-- ---------------------------------------------------------------------------
-- 4. TRAINING RUNS (the self-training loop log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_runs (
  run_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agent_profiles(agent_id),
  cycle          INTEGER NOT NULL,
  objective      TEXT NOT NULL,
  method         TEXT NOT NULL CHECK (method IN
                    ('retrieval_augmented','skill_synthesis','failure_replay',
                     'consensus_distill','drift_correction')),
  input_refs     JSONB,                -- knowledge/skill ids consumed
  output_refs    JSONB,                -- new/updated artifacts
  before_score   NUMERIC(5,2),
  after_score    NUMERIC(5,2),
  delta          NUMERIC(5,2) GENERATED ALWAYS AS (after_score - before_score) STORED,
  status         TEXT NOT NULL CHECK (status IN
                    ('planned','running','passed','failed','escalated_human')),
  human_review   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_runs_agent_cycle ON training_runs(agent_id, cycle);

-- ---------------------------------------------------------------------------
-- 5. SELF-EVALUATION (gate before any artifact promotion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS self_eval (
  eval_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         UUID NOT NULL REFERENCES training_runs(run_id),
  metric         TEXT NOT NULL,        -- precision, safety, cost, latency...
  expected       TEXT,
  actual         TEXT,
  pass           BOOLEAN NOT NULL,
  severity       TEXT CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. AUDIT LOG (immutable-ish; append-only via RLS default-deny + trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_audit (
  audit_id       BIGSERIAL PRIMARY KEY,
  agent_id       UUID,
  action         TEXT NOT NULL,
  detail         JSONB,
  ip_origin      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Audit rows are append-only: no UPDATE/DELETE policy granted to app role.
REVOKE UPDATE, DELETE ON training_audit FROM sirinx_trainer;

-- ---------------------------------------------------------------------------
-- 7. SAMPLE SEED (high-level PostgreSQL security knowledge — verified sources)
-- ---------------------------------------------------------------------------
-- (Run seed via self_training_loop.py to keep it idempotent & human-reviewed)
