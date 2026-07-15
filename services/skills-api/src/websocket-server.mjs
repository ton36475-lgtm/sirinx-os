/**
 * GhostClaw OS Skills API - WebSocket Server
 * Real-time sync for agent communication
 * Port: ws://localhost:8888
 */

import { WebSocketServer } from 'ws';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const WS_PORT = process.env.SKILLS_WS_PORT || 8888;
const wss = new WebSocketServer({ port: WS_PORT });

// Client registry
const clients = new Map();

// Message types
const MSG_TYPES = {
  SKILL_LIST: 'skill:list',
  SKILL_EXECUTE: 'skill:execute',
  SKILL_RESULT: 'skill:result',
  AGENT_MESSAGE: 'agent:message',
  KNOWLEDGE_SYNC: 'knowledge:sync',
  STATUS_UPDATE: 'status:update',
  APPROVAL_REQUEST: 'approval:request',
  APPROVAL_RESULT: 'approval:result'
};

// Broadcast to all connected clients
function broadcast(type, data) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
    correlation_id: `gc-${Date.now()}`
  });

  for (const [id, ws] of clients) {
    if (ws.readyState === 1) { // OPEN
      ws.send(message);
    }
  }
}

// Send to specific client
function sendTo(clientId, type, data) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
      correlation_id: `gc-${clientId}-${Date.now()}`
    }));
  }
}

// Skill execution simulator (dry-run)
async function executeSkill(skillName, action, params) {
  return {
    skill: skillName,
    action,
    params,
    status: 'dry_run',
    result: 'Simulated execution - no real action',
    timestamp: new Date().toISOString()
  };
}

// Handle new connections
wss.on('connection', (ws, req) => {
  const clientId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  clients.set(clientId, ws);

  console.log(`[${new Date().toISOString()}] Client connected: ${clientId} (${clients.size} total)`);

  // Send welcome
  sendTo(clientId, MSG_TYPES.STATUS_UPDATE, {
    status: 'connected',
    client_id: clientId,
    dry_run: true,
    skills_available: 23
  });

  // Handle messages
  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendTo(clientId, MSG_TYPES.STATUS_UPDATE, { error: 'Invalid JSON' });
      return;
    }

    console.log(`[${clientId}] → ${msg.type}:`, msg.data?.skill || msg.data?.action || 'N/A');

    switch (msg.type) {
      case MSG_TYPES.SKILL_LIST:
        sendTo(clientId, MSG_TYPES.SKILL_RESULT, {
          total_skills: 23,
          categories: ['core', 'automation', 'marketing', 'beginner'],
          dry_run: true
        });
        break;

      case MSG_TYPES.SKILL_EXECUTE:
        broadcast(MSG_TYPES.STATUS_UPDATE, {
          skill: msg.data.skill,
          status: 'executing',
          phase: msg.data.phase || 'unknown'
        });

        const result = await executeSkill(msg.data.skill, msg.data.action, msg.data.params);
        sendTo(clientId, MSG_TYPES.SKILL_RESULT, result);
        broadcast(MSG_TYPES.STATUS_UPDATE, {
          skill: msg.data.skill,
          status: 'completed',
          result: result.status
        });
        break;

      case MSG_TYPES.AGENT_MESSAGE:
        broadcast(MSG_TYPES.AGENT_MESSAGE, {
          from: clientId,
          message: msg.data.message,
          agent: msg.data.agent || 'unknown'
        });
        break;

      case MSG_TYPES.KNOWLEDGE_SYNC:
        broadcast(MSG_TYPES.KNOWLEDGE_SYNC, {
          source: msg.data.source,
          status: 'synced_dry_run',
          target: 'obsidian'
        });
        break;

      case MSG_TYPES.APPROVAL_REQUEST:
        broadcast(MSG_TYPES.APPROVAL_REQUEST, {
          gate: msg.data.gate,
          action: msg.data.action,
          target: msg.data.target,
          status: 'pending_approval'
        });
        break;

      default:
        sendTo(clientId, MSG_TYPES.STATUS_UPDATE, {
          error: `Unknown message type: ${msg.type}`
        });
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[${new Date().toISOString()}] Client disconnected: ${clientId} (${clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error(`[${clientId}] Error:`, err.message);
  });
});

// Heartbeat
setInterval(() => {
  broadcast(MSG_TYPES.STATUS_UPDATE, {
    type: 'heartbeat',
    uptime: process.uptime(),
    clients: clients.size,
    dry_run: true
  });
}, 30000); // every 30s

console.log(`🚀 GhostClaw OS Skills WebSocket Server running on ws://localhost:${WS_PORT}`);
console.log(`📋 Dry-run mode: true`);
console.log(`🔗 Connect from agents: ws://localhost:${WS_PORT}`);