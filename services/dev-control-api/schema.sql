-- GHOSTCLAW_LOOP_ENGINEERING_FULLSTACK_BLUEPRINT_V1.1
-- Database Schema: agents, agent_runs, approval_queue
-- Safety Mode: Receipt-Gated / No Push / No Deploy / No Install / No Secrets

-- Extensions (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: agents
-- Core agent definitions and configuration
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL UNIQUE,
    agent_type TEXT NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '{}',
    configuration JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for agents table
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_agent_type ON agents(agent_type);
CREATE INDEX idx_agents_last_seen ON agents(last_seen DESC);

-- Table: agent_runs
-- Execution tracking and run history
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    run_type TEXT NOT NULL,
    run_status TEXT NOT NULL DEFAULT 'pending',
    input_parameters JSONB DEFAULT '{}',
    output_result JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    receipt_token TEXT,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES agents(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for agent_runs table
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_run_status ON agent_runs(run_status);
CREATE INDEX idx_agent_runs_receipt_token ON agent_runs(receipt_token);
CREATE INDEX idx_agent_runs_started_at ON agent_runs(started_at DESC);

-- Table: approval_queue
-- Approval workflow for receipt-gated operations
CREATE TABLE approval_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    request_payload JSONB NOT NULL,
    approver_id UUID REFERENCES agents(id),
    approver_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for approval_queue table
CREATE INDEX idx_approval_queue_status ON approval_queue(status);
CREATE INDEX idx_approval_queue_priority ON approval_queue(priority DESC);
CREATE INDEX idx_approval_queue_created_at ON approval_queue(created_at DESC);
CREATE INDEX idx_approval_queue_expires_at ON approval_queue(expires_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON agent_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_queue_updated_at BEFORE UPDATE ON approval_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Active agents with recent runs
CREATE OR REPLACE VIEW active_agents_with_runs AS
SELECT 
    a.id,
    a.agent_name,
    a.agent_type,
    a.status,
    a.last_seen,
    COUNT(ar.id) as recent_run_count,
    MAX(ar.started_at) as last_run_at
FROM agents a
LEFT JOIN agent_runs ar ON a.id = ar.agent_id 
    AND ar.started_at > NOW() - INTERVAL '24 hours'
WHERE a.status = 'active'
GROUP BY a.id, a.agent_name, a.agent_type, a.status, a.last_seen;

-- Pending approvals with run details
CREATE OR REPLACE VIEW pending_approvals AS
SELECT 
    aq.id,
    aq.request_type,
    aq.priority,
    aq.created_at,
    aq.expires_at,
    ar.run_type,
    ar.input_parameters,
    a.agent_name
FROM approval_queue aq
JOIN agent_runs ar ON aq.run_id = ar.id
JOIN agents a ON ar.agent_id = a.id
WHERE aq.status = 'pending'
ORDER BY aq.priority DESC, aq.created_at ASC;

-- Safety Constraints
-- Only allow receipt-gated operations when receipt_token is provided
ALTER TABLE agent_runs 
ADD CONSTRAINT receipt_gated_check 
CHECK (
    (approval_required = FALSE OR receipt_token IS NOT NULL)
);

-- Valid status values for agents
ALTER TABLE agents 
ADD CONSTRAINT agents_status_check 
CHECK (status IN ('active', 'inactive', 'error', 'maintenance'));

-- Valid status values for agent_runs
ALTER TABLE agent_runs 
ADD CONSTRAINT agent_runs_status_check 
CHECK (run_status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

-- Valid status values for approval_queue
ALTER TABLE approval_queue 
ADD CONSTRAINT approval_queue_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));

-- Valid priority range
ALTER TABLE approval_queue 
ADD CONSTRAINT approval_queue_priority_check 
CHECK (priority >= 1 AND priority <= 10);