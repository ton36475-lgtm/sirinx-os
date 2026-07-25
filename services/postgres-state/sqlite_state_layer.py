#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sovereign Fleet - SQLite State Layer (Fallback for when PostgreSQL unavailable)
Creates local state database with evidence chain tracking
"""

import sqlite3
import json
import hashlib
from pathlib import Path
from datetime import datetime

DB_PATH = Path("/Users/sirinx/sirinx-os/state/sovereign_fleet_state.db")

def init_state_database():
    """Initialize SQLite state database with proper schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Fleet Ships Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fleet_ships (
            ship_id TEXT PRIMARY KEY,
            ship_name TEXT NOT NULL,
            captain_agent TEXT NOT NULL DEFAULT 'Hermes-Captain',
            status TEXT NOT NULL DEFAULT 'DOCKED',
            metadata TEXT
        )
    """)
    
    # Fleet Missions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fleet_missions (
            mission_id TEXT PRIMARY KEY,
            target_project TEXT NOT NULL,
            goal_statement TEXT NOT NULL,
            current_state TEXT NOT NULL DEFAULT 'SPEC_INTAKE',
            loop_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'PENDING',
            metadata TEXT
        )
    """)
    
    # Evidence Events Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evidence_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            mission_id TEXT,
            agent_name TEXT NOT NULL,
            state_context TEXT NOT NULL,
            action_taken TEXT NOT NULL,
            input_payload TEXT NOT NULL,
            output_response TEXT NOT NULL,
            chain_hash TEXT NOT NULL
        )
    """)
    
    # File Leases Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_leases (
            lease_id INTEGER PRIMARY KEY AUTOINCREMENT,
            mission_id TEXT,
            file_path TEXT NOT NULL,
            locked_by TEXT NOT NULL,
            expires_at TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    print(f"✅ SQLite State Layer initialized: {DB_PATH}")

def record_mission(mission_id: str, project: str, goal: str) -> str:
    """Record mission initiation with chain hash."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    chain_hash = hashlib.sha256(f"{mission_id}{project}{goal}{datetime.utcnow().isoformat()}".encode()).hexdigest()[:32]
    
    cursor.execute("""
        INSERT INTO fleet_missions (mission_id, target_project, goal_statement, metadata)
        VALUES (?, ?, ?, ?)
    """, (mission_id, project, goal, json.dumps({"chain_hash": chain_hash})))
    
    conn.commit()
    conn.close()
    
    print(f"📝 Mission recorded: {mission_id[:16]}...")
    return chain_hash

def record_evidence(mission_id: str, agent: str, state: str, action: str, 
                    input_data: dict, output_data: dict) -> str:
    """Record evidence event in chain."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    chain_hash = hashlib.sha256(json.dumps({
        "mission": mission_id,
        "agent": agent,
        "state": state,
        "action": action,
        "input": input_data,
        "output": output_data,
        "timestamp": datetime.utcnow().isoformat()
    }).encode()).hexdigest()[:64]
    
    cursor.execute("""
        INSERT INTO evidence_events 
        (mission_id, agent_name, state_context, action_taken, input_payload, output_response, chain_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (mission_id, agent, state, action, json.dumps(input_data), json.dumps(output_data), chain_hash))
    
    conn.commit()
    conn.close()
    
    return chain_hash

if __name__ == "__main__":
    init_state_database()
    
    # Test mission
    test_mission = f"fleet-init-{int(datetime.utcnow().timestamp())}"
    hash_val = record_mission(test_mission, "sirinx-os", "Sovereign Autoloop Fleet Initialization")
    
    print(f"\n🔗 Chain hash: {hash_val}")
    print("✅ Ready for real PostgreSQL connection")