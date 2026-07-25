#!/usr/bin/env python3
"""
A2A Sync System - Core Implementation
Agent-to-Agent synchronization via OmniRoute with Kimi/cmux integration
"""

import os
import json
import asyncio
import websockets
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

# Event types for A2A communication
class A2AEventType(Enum):
    SESSION_CREATED = "SESSION_CREATED"
    SESSION_ATTACHED = "SESSION_ATTACHED"
    SESSION_HANDED_OFF = "SESSION_HANDED_OFF"
    SESSION_ERROR = "SESSION_ERROR"
    SESSION_CLOSED = "SESSION_CLOSED"

@dataclass
class A2AEvent:
    id: str
    type: A2AEventType
    agent_id: str
    session_id: str
    timestamp: str
    payload: Dict[str, Any]
    target_agents: List[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type.value,
            "agent_id": self.agent_id,
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "payload": self.payload,
            "target_agents": self.target_agents or []
        }

# OmniRoute client wrapper
class OmniRouteClient:
    """WebSocket + REST client for OmniRoute A2A messaging"""
    
    def __init__(self, base_url: str = "http://localhost:20128"):
        self.base_url = base_url
        self.ws_url = base_url.replace("http", "ws")
        self.ws = None
        
    async def connect(self):
        """Establish WebSocket connection"""
        try:
            self.ws = await websockets.connect(f"{self.ws_url}/a2a")
            print("✓ OmniRoute WebSocket connected")
        except Exception as e:
            print(f"✗ OmniRoute connection failed: {e}")
            raise
    
    async def publish_event(self, event: A2AEvent):
        """Publish A2A event via OmniRoute"""
        if not self.ws:
            raise RuntimeError("Not connected to OmniRoute")
        
        message = json.dumps(event.to_dict())
        await self.ws.send(message)
        print(f"✓ Event published: {event.type.value}")
    
    async def subscribe_events(self, agent_id: str):
        """Subscribe to events for this agent"""
        if not self.ws:
            raise RuntimeError("Not connected to OmniRoute")
        
        subscribe_msg = {
            "action": "subscribe",
            "agent_id": agent_id
        }
        await self.ws.send(json.dumps(subscribe_msg))
        print(f"✓ Subscribed to events as: {agent_id}")
    
    async def listen(self):
        """Listen for incoming events"""
        if not self.ws:
            raise RuntimeError("Not connected to OmniRoute")
        
        async for message in self.ws:
            event_data = json.loads(message)
            yield A2AEvent(
                id=event_data["id"],
                type=A2AEventType(event_data["type"]),
                agent_id=event_data["agent_id"],
                session_id=event_data["session_id"],
                timestamp=event_data["timestamp"],
                payload=event_data["payload"],
                target_agents=event_data.get("target_agents", [])
            )

# State layer for PostgreSQL
class StateLayer:
    """PostgreSQL-backed event log for A2A sync"""
    
    def __init__(self, db_path: str = None):
        # For now using SQLite, will migrate to PostgreSQL
        self.db_path = db_path or str(Path.home() / "sirinx-os/a2a-sync-omniroute/a2a_state.db")
        self.init_db()
    
    def init_db(self):
        """Initialize database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                creator_agent_id TEXT NOT NULL,
                current_agent_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                payload TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                payload TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)
        
        conn.commit()
        conn.close()
        print(f"✓ State layer initialized: {self.db_path}")
    
    def create_session(self, session_id: str, agent_id: str, payload: Dict = None):
        """Create new session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO sessions (id, creator_agent_id, current_agent_id, status, created_at, updated_at, payload)
            VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)
        """, (session_id, agent_id, agent_id, now, now, json.dumps(payload or {})))
        
        conn.commit()
        conn.close()
        print(f"✓ Session created: {session_id}")
    
    def handoff_session(self, session_id: str, from_agent: str, to_agent: str):
        """Handoff session to another agent"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            UPDATE sessions 
            SET current_agent_id = ?, updated_at = ?
            WHERE id = ? AND current_agent_id = ?
        """, (to_agent, now, session_id, from_agent))
        
        conn.commit()
        conn.close()
        print(f"✓ Session handed off: {session_id} ({from_agent} → {to_agent})")

# Cmux integration layer
class CmuxManager:
    """Manage cmux sessions for A2A handoffs"""
    
    def __init__(self, cmux_path: str = "/Applications/cmux.app/Contents/Resources/bin/cmux"):
        self.cmux_path = cmux_path
        self.sessions = {}
    
    def create_session(self, session_id: str, agent_id: str) -> bool:
        """Create isolated cmux session"""
        try:
            # For now, stub implementation
            self.sessions[session_id] = {
                "agent_id": agent_id,
                "status": "ACTIVE",
                "created_at": datetime.utcnow().isoformat()
            }
            print(f"✓ Cmux session created: {session_id}")
            return True
        except Exception as e:
            print(f"✗ Cmux session creation failed: {e}")
            return False
    
    def switch_context(self, session_id: str, to_agent_id: str) -> bool:
        """Switch session context to new agent"""
        if session_id not in self.sessions:
            print(f"✗ Session not found: {session_id}")
            return False
        
        try:
            self.sessions[session_id]["agent_id"] = to_agent_id
            self.sessions[session_id]["updated_at"] = datetime.utcnow().isoformat()
            print(f"✓ Context switched: {session_id} → {to_agent_id}")
            return True
        except Exception as e:
            print(f"✗ Context switch failed: {e}")
            return False

# Main A2A Sync Orchestrator
class A2ASyncOrchestrator:
    """Main coordinator for A2A sync system"""
    
    def __init__(self):
        self.omniroute = OmniRouteClient()
        self.state = StateLayer()
        self.cmux = CmuxManager()
        self.agent_id = None
    
    async def start(self, agent_id: str):
        """Start A2A sync system"""
        self.agent_id = agent_id
        
        try:
            await self.omniroute.connect()
            await self.omniroute.subscribe_events(agent_id)
            print(f"✓ A2A Sync Orchestrator started for: {agent_id}")
        except Exception as e:
            print(f"✗ Failed to start orchestrator: {e}")
            raise
    
    async def create_session(self, session_id: str, payload: Dict = None):
        """Create new session and broadcast event"""
        # Create in state layer
        self.state.create_session(session_id, self.agent_id, payload)
        
        # Create cmux session
        self.cmux.create_session(session_id, self.agent_id)
        
        # Broadcast event
        event = A2AEvent(
            id=f"evt-{datetime.utcnow().timestamp()}",
            type=A2AEventType.SESSION_CREATED,
            agent_id=self.agent_id,
            session_id=session_id,
            timestamp=datetime.utcnow().isoformat(),
            payload=payload or {}
        )
        await self.omniroute.publish_event(event)
    
    async def handoff_session(self, session_id: str, to_agent_id: str):
        """Handoff session to another agent"""
        # Update state layer
        self.state.handoff_session(session_id, self.agent_id, to_agent_id)
        
        # Switch cmux context
        self.cmux.switch_context(session_id, to_agent_id)
        
        # Broadcast event
        event = A2AEvent(
            id=f"evt-{datetime.utcnow().timestamp()}",
            type=A2AEventType.SESSION_HANDED_OFF,
            agent_id=self.agent_id,
            session_id=session_id,
            timestamp=datetime.utcnow().isoformat(),
            payload={"to_agent": to_agent_id},
            target_agents=[to_agent_id]
        )
        await self.omniroute.publish_event(event)

if __name__ == "__main__":
    print("A2A Sync System - Core Module Loaded")
    print("Usage: Import and use A2ASyncOrchestrator")
