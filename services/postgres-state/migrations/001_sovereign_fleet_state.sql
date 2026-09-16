-- Sovereign Fleet PostgreSQL State Layer Migration
-- File: /Users/sirinx/sirinx-os/services/postgres-state/migrations/001_sovereign_fleet_state.sql
-- Purpose: Evidence chain logging, fleet control, file lease locking

-- 1. Fleet Configuration Matrix
CREATE TABLE IF NOT EXISTS fleet_ships (
    ship_id VARCHAR(64) PRIMARY KEY,
    ship_name VARCHAR(128) NOT NULL,
    captain_agent VARCHAR(64) NOT NULL DEFAULT 'Hermes-Captain',
    status VARCHAR(32) NOT NULL DEFAULT 'DOCKED',
    current_mission_id VARCHAR(64),
    metadata JSONB,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ship Crew Assignments
CREATE TABLE IF NOT EXISTS ship_crew (
    crew_id VARCHAR(64) PRIMARY KEY,
    ship_id VARCHAR(64) REFERENCES fleet_ships(ship_id) ON DELETE CASCADE,
    agent_name VARCHAR(64) NOT NULL,
    co_worker_role VARCHAR(32) NOT NULL,
    model_assignment VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'STANDBY',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Mission Tracker (Goal-Based Autoloop)
CREATE TABLE IF NOT EXISTS fleet_missions (
    mission_id VARCHAR(64) PRIMARY KEY,
    ship_id VARCHAR(64) REFERENCES fleet_ships(ship_id),
    target_project VARCHAR(128) NOT NULL,
    goal_statement TEXT NOT NULL,
    current_state VARCHAR(64) NOT NULL DEFAULT 'SPEC_INTAKE',
    current_loop_count INT NOT NULL DEFAULT 0,
    max_loops INT NOT NULL DEFAULT 5,
    budget_limit_usd NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    cost_accumulated_usd NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    input_context JSONB,
    output_result JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Evidence Chain Logs (Cryptographic)
CREATE TABLE IF NOT EXISTS evidence_events (
    event_id BIGSERIAL PRIMARY KEY,
    mission_id VARCHAR(64) REFERENCES fleet_missions(mission_id) ON DELETE CASCADE,
    agent_name VARCHAR(64) NOT NULL,
    state_context VARCHAR(64) NOT NULL,
    action_taken TEXT NOT NULL,
    input_payload JSONB NOT NULL,
    output_response JSONB NOT NULL,
    exception_logs TEXT,
    previous_hash VARCHAR(64) NOT NULL,
    chain_hash VARCHAR(64) NOT NULL, -- SHA256(previous + current)
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast evidence queries
CREATE INDEX IF NOT EXISTS idx_evidence_mission ON evidence_events(mission_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chain ON evidence_events(chain_hash);

-- 5. File Lease Lock System (Prevent Write Conflicts)
CREATE TABLE IF NOT EXISTS file_leases (
    lease_id BIGSERIAL PRIMARY KEY,
    mission_id VARCHAR(64) REFERENCES fleet_missions(mission_id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    locked_by VARCHAR(64) NOT NULL,
    locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_released BOOLEAN NOT NULL DEFAULT FALSE,
    release_at TIMESTAMP
);

-- Unique constraint for active leases
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_file_leases 
    ON file_leases(file_path) 
    WHERE (is_released = FALSE);

-- 6. Autoloop Error States (Self-Repair Tracking)
CREATE TABLE IF NOT EXISTS autoloop_exceptions (
    exception_id BIGSERIAL PRIMARY KEY,
    mission_id VARCHAR(64) REFERENCES fleet_missions(mission_id) ON DELETE CASCADE,
    loop_count INT NOT NULL,
    exception_type VARCHAR(64) NOT NULL,
    error_message TEXT NOT NULL,
    suggested_fix TEXT,
    was_recovered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Model Routing Telemetry
CREATE TABLE IF NOT EXISTS model_router_telemetry (
    telemetry_id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    cost_usd NUMERIC(6,4),
    latency_ms INT,
    tokens_in INT,
    tokens_out INT,
    status VARCHAR(32),
    mission_id VARCHAR(64) REFERENCES fleet_missions(mission_id),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_missions_status ON fleet_missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_project ON fleet_missions(target_project);
CREATE INDEX IF NOT EXISTS idx_telemetry_provider ON model_router_telemetry(provider);

-- Insert default fleet ship configuration
INSERT INTO fleet_ships (ship_id, ship_name, captain_agent, status, metadata)
VALUES ('SOVEREIGN_MOTHERSHIP', 'Sovereign Fleet Command', 'Hermes-Captain', 'MISSION_READY', '{"version": "2026.CLUSTER.MTP"}')
ON CONFLICT (ship_id) DO NOTHING;