
-- Fleet Ships Configuration
CREATE TABLE IF NOT EXISTS fleet_ships (
    ship_id VARCHAR(64) PRIMARY KEY,
    ship_name VARCHAR(128) NOT NULL,
    captain_agent VARCHAR(64) NOT NULL DEFAULT 'Hermes-Captain',
    status VARCHAR(32) NOT NULL DEFAULT 'DOCKED',
    current_mission_id VARCHAR(64),
    metadata JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Missions Tracker
CREATE TABLE IF NOT EXISTS fleet_missions (
    mission_id VARCHAR(64) PRIMARY KEY,
    ship_id VARCHAR(64),
    target_project VARCHAR(128) NOT NULL,
    goal_statement TEXT NOT NULL,
    current_state VARCHAR(64) NOT NULL DEFAULT 'SPEC_INTAKE',
    loop_count INT NOT NULL DEFAULT 0,
    max_loops INT NOT NULL DEFAULT 5,
    cost_usd DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    input_context JSON,
    output_result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ship_id) REFERENCES fleet_ships(ship_id)
);

-- Evidence Chain Logs
CREATE TABLE IF NOT EXISTS evidence_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mission_id VARCHAR(64),
    agent_name VARCHAR(64) NOT NULL,
    state_context VARCHAR(64) NOT NULL,
    action_taken TEXT NOT NULL,
    input_payload JSON NOT NULL,
    output_response JSON NOT NULL,
    chain_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mission_id) REFERENCES fleet_missions(mission_id)
);

CREATE INDEX idx_evidence_mission ON evidence_events(mission_id);
CREATE INDEX idx_evidence_chain ON evidence_events(chain_hash);

-- File Lease Lock System  
CREATE TABLE IF NOT EXISTS file_leases (
    lease_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mission_id VARCHAR(64),
    file_path TEXT NOT NULL,
    locked_by VARCHAR(64) NOT NULL,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_released BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (mission_id) REFERENCES fleet_missions(mission_id)
);

CREATE UNIQUE INDEX idx_active_file_lease ON file_leases(file_path) WHERE is_released = FALSE;

-- Initialize default ship
INSERT IGNORE INTO fleet_ships (ship_id, ship_name, status, metadata)
VALUES ('SOVEREIGN_MOTHERSHIP', 'Sovereign Fleet Command', 'MISSION_READY', '{"version":"2026.CLUSTER.MTP"}');
