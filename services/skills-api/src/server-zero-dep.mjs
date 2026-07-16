/**
 * GhostClaw OS Skills API - Zero-Dependency Server
 * Pure Node.js - no express/ws/cors needed
 *
 * REST and WS share one listener. SKILLS_API_PORT is canonical;
 * SKILLS_WS_PORT remains a compatibility alias for older launch commands.
 */

import http from 'http';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const PORT_SOURCE = process.env.SKILLS_API_PORT
  ? 'SKILLS_API_PORT'
  : process.env.SKILLS_WS_PORT
    ? 'SKILLS_WS_PORT compatibility alias'
    : 'default';
const PORT = Number(process.env.SKILLS_API_PORT || process.env.SKILLS_WS_PORT || 3800);
const HOST = process.env.SKILLS_API_HOST || '127.0.0.1';
const DRY_RUN = process.env.SKILLS_DRY_RUN !== 'false';
const SKILLS_PATH = '/Users/sirinx/sirinx-os/skills';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new RangeError(`Invalid Skills API port from ${PORT_SOURCE}`);
}

// ===== Skills Loader =====
function loadSkills() {
  const skills = [];
  try {
    const entries = readdirSync(SKILLS_PATH, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      try {
        readFileSync(join(SKILLS_PATH, entry.name, 'SKILL.md'));
        skills.push({ name: entry.name, has_skill: true });
      } catch {
        // No SKILL.md, skip
      }
    }
  } catch {}
  return skills;
}

// ===== Simple WebSocket handler =====
const wsClients = new Map();
let wsClientId = 0;

async function handleWebSocket(req, socket, head) {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  // Compute accept hash
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha1')
    .update(key + '258EAA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const response = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${hash}`,
    '',
    ''
  ].join('\r\n');

  socket.write(response);

  const clientId = `agent-${++wsClientId}`;
  wsClients.set(clientId, socket);

  console.log(`[WS] Client connected: ${clientId} (${wsClients.size} total)`);

  socket.on('data', (buf) => {
    try {
      // Simple text frame decode
      const text = buf.toString('utf8').replace(/[^\x20-\x7E]/g, '').trim();
      if (text.includes('{')) {
        const jsonStart = text.indexOf('{');
        const msg = JSON.parse(text.substring(jsonStart));
        console.log(`[WS] ${clientId} → ${msg.type || 'unknown'}`);

        // Echo back
        const response = JSON.stringify({
          type: 'status:update',
          data: { status: 'connected', client_id: clientId, dry_run: DRY_RUN },
          timestamp: new Date().toISOString()
        });
        broadcast(response, clientId);
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  socket.on('close', () => {
    wsClients.delete(clientId);
    console.log(`[WS] Disconnected: ${clientId} (${wsClients.size} total)`);
  });

  socket.on('error', () => {
    wsClients.delete(clientId);
  });

  // Send welcome
  const welcome = JSON.stringify({
    type: 'status:update',
    data: { status: 'connected', client_id: clientId, dry_run: DRY_RUN },
    timestamp: new Date().toISOString()
  });
  socket.write(Buffer.from('\x81' + String.fromCharCode(welcome.length) + welcome));
}

function broadcast(message, exceptId) {
  for (const [id, socket] of wsClients) {
    if (id !== exceptId && socket.writable) {
      try {
        socket.write(Buffer.from('\x81' + String.fromCharCode(message.length) + message));
      } catch {}
    }
  }
}

// ===== REST API =====
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // WebSocket upgrade
  if (req.headers.upgrade === 'websocket') {
    return; // handled in upgrade event
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  let body = '';

  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const data = body ? JSON.parse(body) : {};
    let response = {};

    // Routes
    if (path === '/health') {
      response = { status: 'ok', service: 'ghostclaw-skills-api', dry_run: DRY_RUN, uptime: process.uptime() };
    }
    else if (path === '/api/skills/list') {
      const skills = loadSkills();
      response = { total_skills: skills.length, skills, dry_run: DRY_RUN, ws_clients: wsClients.size };
    }
    else if (path === '/api/agents') {
      response = {
        agents: [
          { name: 'ghostclaw', tier: 3, role: 'Security & Bypass' },
          { name: 'niran', tier: 1, role: 'Content & Narrative' },
          { name: 'hermes', tier: 4, role: 'Governance & Audit' },
          { name: 'sirinx', tier: 3, role: 'Infrastructure' },
          { name: 'deepseek', tier: 2, role: 'Analysis & Review' }
        ],
        workflows: ['code-review', 'deploy', 'bypass', 'content', 'search'],
        dry_run: DRY_RUN
      };
    }
    else if (path === '/api/skills/orchestrate' && req.method === 'POST') {
      const workflows = {
        'code-review': ['deepseek', 'ghostclaw', 'hermes'],
        'deploy': ['deepseek', 'ghostclaw', 'sirinx', 'hermes'],
        'bypass': ['ghostclaw', 'sirinx'],
        'content': ['niran', 'hermes'],
        'search': ['hermes']
      };
      const wf = workflows[data.workflow] || ['plan', 'design', 'build', 'verify'];
      response = {
        goal: data.goal,
        workflow: data.workflow || 'default',
        pipeline: wf.map((agent, i) => ({ step: i + 1, agent, status: 'pending' })),
        dry_run: true,
        ws_broadcast: wsClients.size > 0
      };
    }
    else if (path === '/api/skills/knowledge/scrape' && req.method === 'POST') {
      response = { url: data.url, dry_run: true, status: 'planned', next_action: 'Add API key to run actual scrape' };
    }
    else if (path === '/api/skills/content/create' && req.method === 'POST') {
      response = { type: data.type, prompt: data.prompt, dry_run: true, status: 'planned' };
    }
    else if (path === '/api/skills/social/post' && req.method === 'POST') {
      response = { platforms: data.platforms, dry_run: true, approval_required: true };
    }
    else if (path === '/api/skills/validate-gate' && req.method === 'POST') {
      response = { action: data.action, gate: data.gate, allowed: data.gate < 4, needs_approval: data.gate >= 4 };
    }
    else if (path === '/ready') {
      response = { ready: true, skills_loaded: loadSkills().length };
    }
    else {
      response = {
        error: 'Not found',
        path,
        endpoints: [
          'GET /health',
          'GET /ready',
          'GET /api/skills/list',
          'GET /api/agents',
          'POST /api/skills/orchestrate',
          'POST /api/skills/knowledge/scrape',
          'POST /api/skills/content/create',
          'POST /api/skills/social/post',
          'POST /api/skills/validate-gate'
        ]
      };
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  });
});

// WebSocket upgrade handler
server.on('upgrade', (req, socket, head) => {
  if (req.headers.upgrade === 'websocket') {
    handleWebSocket(req, socket, head);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[skills-api] ${HOST}:${PORT} is already in use. ` +
      'Check the existing /health endpoint or set SKILLS_API_PORT to a free port.'
    );
  } else {
    console.error(`[skills-api] Listener failed: ${error.message}`);
  }
  process.exitCode = 1;
});

// ===== Start =====
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  GhostClaw OS Skills API                  ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  REST:  http://${HOST}:${PORT}           ║`);
  console.log(`║  WS:    ws://${HOST}:${PORT}/ws           ║`);
  console.log(`║  Port source: ${PORT_SOURCE.padEnd(27)}║`);
  console.log(`║  Skills: ${loadSkills().length.toString().padEnd(33)}║`);
  console.log(`║  Dry-Run: ${(DRY_RUN ? 'true' : 'false').padEnd(32)}║`);
  console.log('║  Deps: Zero (pure Node.js)               ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

export { server };
