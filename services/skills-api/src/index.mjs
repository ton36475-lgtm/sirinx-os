/**
 * GhostClaw OS Skills API - Unified Server
 * Combines REST API + WebSocket + Agent orchestration
 * 
 * REST:  http://localhost:3800
 * WS:    ws://localhost:8888
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { orchestrateWorkflow, validateGate, AGENT_ROLES, WORKFLOWS } from './lib/skills-stream.mjs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.SKILLS_API_PORT || 3800;
const DRY_RUN = process.env.SKILLS_DRY_RUN !== 'false';

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ===== WebSocket: Real-time Agent Communication =====

const wsClients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  wsClients.set(clientId, ws);
  console.log(`[WS] Connected: ${clientId} (${wsClients.size} total)`);

  ws.send(JSON.stringify({
    type: 'status:update',
    data: { status: 'connected', client_id: clientId, dry_run: DRY_RUN },
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log(`[WS] ${clientId} → ${msg.type}`);

      if (msg.type === 'skill:execute') {
        broadcast({
          type: 'status:update',
          data: { skill: msg.data?.skill, status: 'executing' }
        });
      }
    } catch {}
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log(`[WS] Disconnected: ${clientId} (${wsClients.size} total)`);
  });
});

function broadcast(message) {
  const payload = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString(),
    correlation_id: `gc-${Date.now()}`
  });
  for (const [, ws] of wsClients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// ===== REST API =====

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ghostclaw-skills-api', dry_run: DRY_RUN });
});

// List skills
app.get('/api/skills/list', (req, res) => {
  const categories = ['core', 'automation', 'marketing', 'beginner'];
  res.json({
    total_skills: 23,
    categories,
    dry_run: DRY_RUN,
    ws_connected: wsClients.size
  });
});

// Orchestrate workflow
app.post('/api/skills/orchestrate', (req, res) => {
  const { goal, workflow } = req.body;

  if (workflow) {
    const result = orchestrateWorkflow(workflow, { goal });
    return res.json({ ...result, ws_broadcast: wsClients.size > 0 });
  }

  res.json({
    goal,
    dry_run: DRY_RUN,
    phases: ['planning', 'implementation', 'verification', 'delivery']
  });
});

// Get agent team
app.get('/api/agents', (req, res) => {
  res.json({
    agents: Object.values(AGENT_ROLES),
    workflows: Object.values(WORKFLOWS),
    dry_run: DRY_RUN
  });
});

// Validate gate
app.post('/api/skills/validate-gate', (req, res) => {
  const { action, gate } = req.body;
  res.json(validateGate(action, gate));
});

// Knowledge scrape
app.post('/api/skills/knowledge/scrape', (req, res) => {
  const { url } = req.body;
  broadcast({ type: 'knowledge:sync', data: { url, status: 'scraping_dry_run' } });
  res.json({ url, dry_run: true, status: 'planned' });
});

// Content create
app.post('/api/skills/content/create', (req, res) => {
  const { type, prompt } = req.body;
  broadcast({ type: 'status:update', data: { content: type, status: 'creating_dry_run' } });
  res.json({ type, prompt, dry_run: true, status: 'planned' });
});

// Social post
app.post('/api/skills/social/post', (req, res) => {
  const { platforms } = req.body;
  broadcast({ type: 'approval:request', data: { platforms, status: 'pending' } });
  res.json({ platforms, dry_run: true, approval_required: true });
});

// ===== Start Server =====

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  GhostClaw OS Skills API                  ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  REST:  http://localhost:${PORT}           ║`);
  console.log(`║  WS:    ws://localhost:${PORT}/ws           ║`);
  console.log(`║  Skills: 23                               ║`);
  console.log(`║  Dry-Run: ${DRY_RUN}                         ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

export { app, server, wss };