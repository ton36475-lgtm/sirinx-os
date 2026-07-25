/**
 * WhiteSide API Proxy — Bridge state proxy for local development.
 *
 * Serves as a local-sidecar that bridges the Cloudflare Worker API
 * (which cannot read the local filesystem) with the A2A bridge runtime
 * state on disk.
 *
 * Usage:
 *   node dashboard/api-proxy.cjs [port]
 *
 * Routes:
 *   GET  /api/proxy/bridge-state  — Reads bridge_active.json
 *   GET  /api/proxy/queue         — Lists queue/*.json tasks
 *   GET  /api/proxy/outbox/:agent — Lists outbox entries for an agent
 *   POST /api/proxy/scan          — Scan all agent outboxes
 *   GET  /api/proxy/health        — Health check for the proxy itself
 *
 * Gracefully falls back to synthetic responses if runtime files
 * don't exist or are unreadable.
 *
 * This is a .cjs file to avoid ESM issues in projects with "type": "module".
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────────
const PORT = parseInt(process.argv[2], 10) || 2380;
const RUNTIME_BASE = path.resolve(
  __dirname, '..', '..', '..', '.ghostclaw_runtime'
);
const A2A2A_DIR = path.join(RUNTIME_BASE, 'a2a2a');
const QUEUE_DIR = path.join(RUNTIME_BASE, 'queue');

// ─── Helpers ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function jsonResponse(data, status = 200) {
  return { status, headers: CORS_HEADERS, body: JSON.stringify(data, null, 2) };
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: true, message }, status);
}

/**
 * Read a JSON file from disk, returning null on any error.
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read a directory and return file entries with basic metadata.
 */
function readDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return null;
    return fs.readdirSync(dirPath).map(name => {
      const fullPath = path.join(dirPath, name);
      try {
        const stat = fs.statSync(fullPath);
        return {
          name,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          isDirectory: stat.isDirectory(),
        };
      } catch {
        return { name, size: 0, mtime: null, isDirectory: false };
      }
    });
  } catch {
    return null;
  }
}

/**
 * Count .json files in an outbox directory for a given agent.
 */
function countOutbox(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath);
    return entries.filter(e => e.endsWith('.json') || e.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

// ─── Route Handlers ──────────────────────────────────────────────────────

/**
 * GET /api/proxy/bridge-state
 * Returns the current bridge active state from disk.
 */
function handleBridgeState() {
  const bridgeState = readJsonFile(path.join(A2A2A_DIR, 'bridge_active.json'));
  if (bridgeState) {
    return jsonResponse({
      source: 'filesystem',
      bridge: bridgeState,
      runtime: RUNTIME_BASE,
      timestamp: new Date().toISOString(),
    });
  }

  // Fallback: check if runtime dir exists at all
  const runtimeExists = fs.existsSync(RUNTIME_BASE);
  return jsonResponse({
    source: 'filesystem',
    bridge: null,
    runtime: RUNTIME_BASE,
    runtimeExists,
    timestamp: new Date().toISOString(),
    warning: 'bridge_active.json not found or unreadable',
  });
}

/**
 * GET /api/proxy/queue
 * Lists queue tasks from the filesystem.
 */
function handleQueue() {
  const queueDir = path.join(RUNTIME_BASE, 'queue');
  const entries = readDir(queueDir);

  if (!entries) {
    return jsonResponse({
      source: 'filesystem',
      tasks: [],
      count: 0,
      timestamp: new Date().toISOString(),
      warning: 'Queue directory not found',
    });
  }

  const tasks = entries
    .filter(e => e.name.endsWith('.json'))
    .map(e => {
      const data = readJsonFile(path.join(queueDir, e.name));
      return {
        id: e.name.replace('.json', ''),
        file: e.name,
        mtime: e.mtime,
        size: e.size,
        data: data || null,
      };
    });

  return jsonResponse({
    source: 'filesystem',
    tasks,
    count: tasks.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/proxy/outbox/:agent
 * Lists outbox entries for a specific agent.
 */
function handleOutbox(agent) {
  if (!agent || agent === '') {
    return errorResponse('Agent name is required', 400);
  }

  const agentOutboxDir = path.join(A2A2A_DIR, 'outbox', agent);
  const entries = readDir(agentOutboxDir);

  if (!entries) {
    return jsonResponse({
      source: 'filesystem',
      agent,
      entries: [],
      count: 0,
      exists: fs.existsSync(agentOutboxDir),
      timestamp: new Date().toISOString(),
      warning: entries === null ? 'Cannot read directory' : 'Directory not found',
    });
  }

  return jsonResponse({
    source: 'filesystem',
    agent,
    entries,
    count: entries.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/proxy/health
 * Returns health info for the proxy server.
 */
function handleHealth() {
  const runtimeExists = fs.existsSync(RUNTIME_BASE);
  const a2aExists = fs.existsSync(A2A2A_DIR);
  const queueExists = fs.existsSync(QUEUE_DIR);

  // Count outbox entries per well-known agent
  const knownAgents = [
    'hermes', 'codex', 'opencode', 'zcode', 'kiro',
    'copilot', 'claude', 'antigravity2', 'webmcp',
    'planner', 'zai_tui',
  ];
  const outboxCounts = {};
  for (const agent of knownAgents) {
    const dir = path.join(A2A2A_DIR, 'outbox', agent);
    outboxCounts[agent] = countOutbox(dir);
  }

  return jsonResponse({
    status: 'healthy',
    proxyVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    paths: {
      runtime: RUNTIME_BASE,
      runtimeExists,
      a2a2a: A2A2A_DIR,
      a2a2aExists: a2aExists,
      queue: QUEUE_DIR,
      queueExists: queueExists,
    },
    stats: {
      outboxTotal: Object.values(outboxCounts).reduce((a, b) => a + b, 0),
      knownAgents: knownAgents.length,
    },
  });
}

/**
 * POST /api/proxy/scan
 * Scans all agent outboxes in one shot.
 */
function handleScanAll() {
  const outboxDir = path.join(A2A2A_DIR, 'outbox');
  try {
    if (!fs.existsSync(outboxDir)) {
      return jsonResponse({ agents: [], count: 0, warning: 'Outbox directory not found' });
    }
    const agents = fs.readdirSync(outboxDir).filter(name => {
      const full = path.join(outboxDir, name);
      try { return fs.statSync(full).isDirectory(); } catch { return false; }
    }).map(name => ({
      id: name,
      outboxMessages: countOutbox(path.join(outboxDir, name)),
    }));

    return jsonResponse({
      agents,
      count: agents.length,
      totalOutbox: agents.reduce((s, a) => s + a.outboxMessages, 0),
    });
  } catch (err) {
    return jsonResponse({ agents: [], count: 0, error: err.message });
  }
}

// ─── Router ──────────────────────────────────────────────────────────────

const routes = {
  'GET /api/proxy/bridge-state': handleBridgeState,
  'GET /api/proxy/queue': handleQueue,
  'GET /api/proxy/health': handleHealth,
  'POST /api/proxy/scan': handleScanAll,
};

// Outbox handler is parameterized
function getOutboxRoute(pathname) {
  const match = pathname.match(/^\/api\/proxy\/outbox\/(.+)$/);
  if (match) return () => handleOutbox(match[1]);
  return null;
}

// ─── Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const routeKey = `${req.method} ${pathname}`;

  let handler = routes[routeKey];

  // Try parameterized outbox route
  if (!handler) {
    handler = getOutboxRoute(pathname);
  }

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (!handler) {
    const errResp = errorResponse(`Not found: ${req.method} ${pathname}`, 404);
    res.writeHead(errResp.status, errResp.headers);
    res.end(errResp.body);
    return;
  }

  try {
    const result = handler();
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  } catch (err) {
    const errResp = errorResponse(err.message);
    res.writeHead(errResp.status, errResp.headers);
    res.end(errResp.body);
  }
});

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  WhiteSide API Proxy                     ║`);
  console.log(`  ║  http://localhost:${PORT}/api/proxy/health${' '.repeat(Math.max(0, 28 - String(PORT).length))}║`);
  console.log(`  ║  Runtime: ${RUNTIME_BASE}  ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
  console.log(`  Routes:`);
  console.log(`    GET  /api/proxy/bridge-state  — Bridge active state`);
  console.log(`    GET  /api/proxy/queue         — Queue tasks`);
  console.log(`    GET  /api/proxy/outbox/:agent — Agent outbox entries`);
  console.log(`    POST /api/proxy/scan          — Scan all agent outboxes`);
  console.log(`    GET  /api/proxy/health        — Proxy health check\n`);
});
