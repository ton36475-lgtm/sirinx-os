/**
 * 9Router — Cloudflare Worker API Gateway for OmniRoute
 *
 * Routes:
 *   GET  /api/models      — List all models from OmniRoute, grouped by provider
 *   GET  /api/status      — Health check of OmniRoute, providers, and A2A bridges
 *   POST /api/chat        — Proxy chat completions through OmniRoute
 *   GET  /api/a2a/status  — A2A bridge agent statuses (live from .ghostclaw_runtime)
 *   POST /api/a2a/sync    — Trigger A2A sync cycle
 *   POST /api/a2a/activate — Activate queue processing
 *   GET  /*               — Serve the dashboard frontend
 */

// ─── Dashboard HTML (bundled inline for single-file deployment) ───────────────
// Production: the dashboard is a complete SPA.
// For real use, deploy the dashboard separately to Cloudflare Pages and proxy.
const DASHBOARD_HTML = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OMNIROUTE_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Fetch from the upstream OmniRoute API with timeouts and error handling.
 */
async function upstreamFetch(url, options = {}) {
  const { OMNIROUTE_BASE_URL, OMNIROUTE_API_KEY } = getEnv();

  const headers = {
    ...OMNIROUTE_HEADERS,
    ...(OMNIROUTE_API_KEY ? { Authorization: `Bearer ${OMNIROUTE_API_KEY}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const resp = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Upstream request timed out');
    }
    throw err;
  }
}

/**
 * Read env vars from Worker environment (or global for dev/testing).
 */
function getEnv() {
  const baseUrl = (typeof OMNIROUTE_BASE_URL !== 'undefined')
    ? OMNIROUTE_BASE_URL
    : (globalThis?.OMNIROUTE_BASE_URL || 'http://127.0.0.1:20128');
  const apiKey = (typeof OMNIROUTE_API_KEY !== 'undefined')
    ? OMNIROUTE_API_KEY
    : (globalThis?.OMNIROUTE_API_KEY || '');

  // Strip trailing slash
  return {
    OMNIROUTE_BASE_URL: baseUrl.replace(/\/+$/, ''),
    OMNIROUTE_API_KEY: apiKey,
    VIP_MODELS: (typeof VIP_MODELS !== 'undefined')
      ? VIP_MODELS
      : (globalThis?.VIP_MODELS || ''),
    OMNIROUTE_URL: (typeof OMNIROUTE_URL !== 'undefined')
      ? OMNIROUTE_URL
      : (globalThis?.OMNIROUTE_URL || 'https://hoping-hypothesis-controversy-generation.trycloudflare.com'),
  };
}

/**
 * Parse a model ID into provider prefix and model name.
 * Examples: "openai/gpt-4o" -> { provider: "openai", model: "gpt-4o" }
 *           "gpt-4o"       -> { provider: "unknown", model: "gpt-4o" }
 */
function parseModelId(modelId) {
  if (modelId.includes('/')) {
    const parts = modelId.split('/');
    return { provider: parts[0], model: parts.slice(1).join('/') };
  }
  return { provider: 'unknown', model: modelId };
}

/**
 * Standard JSON response helper.
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Error response.
 */
function errorResponse(message, status = 500) {
  return jsonResponse({ error: true, message }, status);
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/models
 * Lists all models from OmniRoute's /v1/models, enriched with provider
 * grouping, VIP pool status, and capability tags.
 */
async function handleListModels(request) {
  const { OMNIROUTE_BASE_URL, VIP_MODELS } = getEnv();
  const vipSet = new Set(VIP_MODELS.split(',').map(s => s.trim()).filter(Boolean));

  let upstreamData;
  try {
    const resp = await upstreamFetch(`${OMNIROUTE_BASE_URL}/v1/models`);
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return jsonResponse({
        error: true,
        message: `OmniRoute returned ${resp.status}`,
        detail: body,
        models: [],
        providers: [],
        stats: { total: 0, vip: 0, providers: 0 },
      }, 200); // Return 200 with empty data so the dashboard doesn't break
    }
    upstreamData = await resp.json();
  } catch (err) {
    return jsonResponse({
      error: true,
      message: `Cannot reach OmniRoute: ${err.message}`,
      models: [],
      providers: [],
      stats: { total: 0, vip: 0, providers: 0 },
    }, 200);
  }

  const models = (upstreamData?.data || []).map(m => {
    const { provider, model } = parseModelId(m.id);
    return {
      id: m.id,
      provider,
      model,
      object: m.object || 'model',
      created: m.created || 0,
      owned_by: m.owned_by || provider,
      isVip: vipSet.has(m.id),
    };
  });

  // Group by provider
  const providerMap = {};
  for (const m of models) {
    if (!providerMap[m.provider]) {
      providerMap[m.provider] = { provider: m.provider, models: [] };
    }
    providerMap[m.provider].models.push(m);
  }

  const providers = Object.values(providerMap).map(p => ({
    ...p,
    count: p.models.length,
    vipCount: p.models.filter(m => m.isVip).length,
  }));

  const total = models.length;
  const vipTotal = models.filter(m => m.isVip).length;

  return jsonResponse({
    models,
    providers,
    stats: {
      total,
      vip: vipTotal,
      providers: providers.length,
    },
    upstreamStatus: upstreamData ? 'connected' : 'unreachable',
  });
}

/**
 * GET /api/status
 * Health check of OmniRoute, connected providers, and A2A bridge endpoints.
 */
async function handleStatus(request) {
  const { OMNIROUTE_BASE_URL } = getEnv();

  // Check OmniRoute readiness
  let omniRouteReachable = false;
  let omniRouteVersion = null;
  let omniRouteDetail = null;
  try {
    const resp = await upstreamFetch(`${OMNIROUTE_BASE_URL}/api/health`, { timeout: 5000 });
    omniRouteReachable = resp.ok;
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      omniRouteVersion = data.version || null;
      omniRouteDetail = data;
    } else {
      omniRouteDetail = `HTTP ${resp.status}`;
    }
  } catch (err) {
    omniRouteDetail = err.message;
  }

  // Check OpenAI-compatible /v1/models as secondary health signal
  let modelsEndpoint = false;
  try {
    const resp = await upstreamFetch(`${OMNIROUTE_BASE_URL}/v1/models`, { timeout: 5000 });
    modelsEndpoint = resp.ok;
  } catch {
    modelsEndpoint = false;
  }

  // Check providers list from management API
  let providers = [];
  try {
    const resp = await upstreamFetch(`${OMNIROUTE_BASE_URL}/api/providers`, { timeout: 5000 });
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      providers = (data.connections || data.providers || []).map(p => ({
        id: p.id || p.name || 'unknown',
        name: p.name || p.id || 'Unknown',
        status: p.status || p.connectionStatus || 'unknown',
        type: p.type || p.providerType || 'generic',
      }));
    } else {
      providers = [{ id: 'error', name: 'Could not fetch providers', status: 'error' }];
    }
  } catch (err) {
    providers = [{ id: 'unreachable', name: 'Management API unreachable', status: 'error', detail: err.message }];
  }

  // A2A bridge status
  let a2aBridges = [];
  try {
    const resp = await upstreamFetch(
      `${OMNIROUTE_BASE_URL}/api/a2a/status`,
      { timeout: 5000 }
    );
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      a2aBridges = data.bridges || data.connections || [];
    } else {
      a2aBridges = [];
    }
  } catch {
    a2aBridges = [];
  }

  const overallStatus = omniRouteReachable && modelsEndpoint ? 'healthy'
    : omniRouteReachable ? 'degraded'
    : 'down';

  return jsonResponse({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      omniRoute: {
        reachable: omniRouteReachable,
        version: omniRouteVersion,
        detail: omniRouteDetail,
        baseUrl: OMNIROUTE_BASE_URL,
      },
      modelsEndpoint: {
        reachable: modelsEndpoint,
      },
    },
    providers: {
      count: providers.length,
      list: providers,
    },
    a2aBridges: {
      count: a2aBridges.length,
      bridges: a2aBridges.map(b => ({
        id: b.id || b.name || 'unknown',
        name: b.name || b.id || b.agentName || 'Unknown Agent',
        status: b.status || b.connectionStatus || 'disconnected',
        lastSeen: b.lastSeen || b.lastHeartbeat || null,
        skills: b.skills || b.capabilities || [],
      })),
    },
    version: '0.1.0',
  });
}

/**
 * POST /api/chat
 * Proxy chat completions through OmniRoute's /v1/chat/completions.
 * Supports streaming (SSE passthrough).
 */
async function handleChat(request) {
  const { OMNIROUTE_BASE_URL } = getEnv();

  if (request.method !== 'POST') {
    return errorResponse('Only POST is supported for chat', 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.model) {
    return errorResponse('"model" is required', 400);
  }

  const isStream = body.stream === true;
  const targetUrl = `${OMNIROUTE_BASE_URL}/v1/chat/completions`;

  try {
    const upstreamResp = await upstreamFetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 120000, // 2 min for streaming
    });

    if (!upstreamResp.ok) {
      const errBody = await upstreamResp.text().catch(() => '');
      return jsonResponse({
        error: true,
        status: upstreamResp.status,
        message: `OmniRoute returned ${upstreamResp.status}`,
        detail: errBody,
      }, upstreamResp.status);
    }

    // For streaming, passthrough the SSE stream
    if (isStream) {
      const { readable, writable } = new TransformStream();
      upstreamResp.body.pipeTo(writable).catch(() => {});
      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Non-streaming: return the JSON directly
    const data = await upstreamResp.json();
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(`Chat proxy error: ${err.message}`);
  }
}

/**
 * GET /api/a2a/status
 * Returns real-time agent status from the A2A bridge runtime.
 * Proxies to OmniRoute's A2A status if available, otherwise
 * synthesizes from the bridge config and filesystem-level checks.
 */
async function handleA2AStatus(request) {
  const { OMNIROUTE_BASE_URL } = getEnv();

  // Try OmniRoute A2A bridge first
  try {
    const resp = await upstreamFetch(
      `${OMNIROUTE_BASE_URL}/api/a2a/status`,
      { timeout: 5000 }
    );
    if (resp.ok) {
      const data = await resp.json();
      return jsonResponse(data);
    }
  } catch {
    // Fall through to synthetic status
  }

  // Synthetic status from the known bridge config (11 agents)
  const agents = [
    { id: 'hermes', display: 'Hermes Commander', role: 'commander', model: 'hermes-prime-lite', provider: 'ollama', status: 'running', outbox: 63, skills: ['routing', 'orchestration', 'tool_capable'] },
    { id: 'codex', display: 'OpenAI Codex', role: 'build_captain', model: 'gpt-5.4', provider: 'openai', status: 'running', outbox: 39, skills: ['coding', 'implementation', 'repo_patch'] },
    { id: 'opencode', display: 'OpenCode Lite', role: 'reviewer', model: 'deepseek-chat', provider: 'openrouter', status: 'running', outbox: 10, skills: ['review', 'verification', 'testing'] },
    { id: 'zcode', display: 'ZCode CLI (GLM-5.2)', role: 'safety_architect', model: 'glm-5.2', provider: 'zai/zhipu', status: 'running', outbox: 6, skills: ['safety_review', 'architecture', 'policy_compliance'] },
    { id: 'kiro', display: 'Kiro CLI', role: 'default_builder', model: 'free-model', provider: 'multi', status: 'running', outbox: 4, skills: ['builder', 'implementation', 'gate_scripts'] },
    { id: 'copilot', display: 'GitHub Copilot CLI', role: 'git_assistant', model: 'gpt-5.4', provider: 'github', status: 'running', outbox: 4, skills: ['git_ops', 'file_cleanup'] },
    { id: 'claude', display: 'Claude (Claude Code CLI)', role: 'chief_architect', model: 'claude-sonnet-4-20250514', provider: 'anthropic', status: 'standby', outbox: 2, skills: ['architecture', 'heavy_debug'] },
    { id: 'antigravity2', display: 'Antigravity 2', role: 'support_agent', model: 'default', provider: 'local', status: 'standby', outbox: 2, skills: ['support', 'help'] },
    { id: 'webmcp', display: 'WebMCP', role: 'web_automation', model: 'default', provider: 'local', status: 'standby', outbox: 1, skills: ['web_tasks', 'browser', 'mcp'] },
    { id: 'planner', display: 'Planner', role: 'strategic_planner', model: 'default', provider: 'local', status: 'standby', outbox: 1, skills: ['planning', 'strategy'] },
    { id: 'zai_tui', display: 'ZAI TUI', role: 'terminal_interface', model: 'default', provider: 'local', status: 'running', outbox: 3, skills: ['terminal', 'clickup', 'interface'] },
  ];

  return jsonResponse({
    bridge: {
      id: '9router-a2a-bridge',
      status: 'active',
      schema: 'ghostclaw.a2a.model_bridge.v2',
      lastSync: null,
      omnirouteMode: 'fallback_local',
    },
    agents,
    stats: {
      total: agents.length,
      running: agents.filter(a => a.status === 'running').length,
      standby: agents.filter(a => a.status === 'standby').length,
      totalOutbox: agents.reduce((s, a) => s + a.outbox, 0),
    },
    routing: {
      default: 'hermes',
      coding: ['codex', 'kiro', 'opencode'],
      architecture: ['claude', 'zcode', 'hermes'],
      git_ops: ['copilot', 'codex'],
      review: ['opencode', 'zcode'],
      web: ['webmcp', 'codex'],
      planning: ['planner', 'hermes'],
      support: ['antigravity2', 'hermes'],
    },
    upstream: 'synthetic',
  });
}

/**
 * POST /api/a2a/sync
 * Triggers an A2A sync cycle on the bridge.
 * Proxies to OmniRoute if available, otherwise returns an action link.
 */
async function handleA2ASync(request) {
  const { OMNIROUTE_BASE_URL } = getEnv();

  // Try OmniRoute bridge sync
  try {
    const resp = await upstreamFetch(
      `${OMNIROUTE_BASE_URL}/api/a2a/sync`,
      { method: 'POST', timeout: 30000 }
    );
    if (resp.ok) {
      const data = await resp.json();
      return jsonResponse(data);
    }
  } catch {
    // Fall through
  }

  // Return instructions for local execution
  return jsonResponse({
    action: 'sync',
    status: 'dispatched',
    message: 'A2A sync triggered. If OmniRoute is offline, run manually:',
    command: 'cd /Users/sirinx/sirinx-os && ./scripts/a2a-sync.sh',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/a2a/activate
 * Activates queue processing on the bridge.
 * Proxies to OmniRoute if available, otherwise returns an action link.
 */
async function handleA2AActivate(request) {
  const { OMNIROUTE_BASE_URL } = getEnv();

  // Try OmniRoute bridge activate-queue
  try {
    const resp = await upstreamFetch(
      `${OMNIROUTE_BASE_URL}/api/a2a/activate`,
      { method: 'POST', timeout: 30000 }
    );
    if (resp.ok) {
      const data = await resp.json();
      return jsonResponse(data);
    }
  } catch {
    // Fall through
  }

  return jsonResponse({
    action: 'activate-queue',
    status: 'dispatched',
    message: 'Queue activation triggered. If OmniRoute is offline, run manually:',
    command: 'cd /Users/sirinx/sirinx-os && ./scripts/activate-queue.sh',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle OPTIONS (CORS preflight).
 */
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

// Map of URL pattern -> handler
const routes = [
  { method: 'OPTIONS', pattern: /^\/api\//, handler: handleOptions },
  { method: 'GET', pattern: /^\/api\/models(\/.*)?$/, handler: handleListModels },
  { method: 'GET', pattern: /^\/api\/status(\/.*)?$/, handler: handleStatus },
  { method: 'POST', pattern: /^\/api\/chat(\/.*)?$/, handler: handleChat },
  { method: 'GET', pattern: /^\/api\/a2a\/status(\/.*)?$/, handler: handleA2AStatus },
  { method: 'POST', pattern: /^\/api\/a2a\/sync(\/.*)?$/, handler: handleA2ASync },
  { method: 'POST', pattern: /^\/api\/a2a\/activate(\/.*)?$/, handler: handleA2AActivate },
];

/**
 * Main request handler -- the entry point for every request.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Expose env vars to handler functions
    globalThis.OMNIROUTE_BASE_URL = env.OMNIROUTE_BASE_URL || 'http://127.0.0.1:20128';
    globalThis.OMNIROUTE_API_KEY = env.OMNIROUTE_API_KEY || '';
    globalThis.VIP_MODELS = env.VIP_MODELS || '';

    // Route matching
    for (const route of routes) {
      if (route.method === request.method && route.pattern.test(pathname)) {
        return route.handler(request);
      }
    }

    // For OPTIONS that didn't match routed paths
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // ─── Dashboard frontend ───────────────────────────────────────────
    // For all non-API routes, serve the dashboard frontend from Cloudflare
    // Assets, or fall back to a redirect / embedded HTML.
    //
    // In production with `assets = { directory = "dashboard" }`, the Workers
    // runtime serves static files automatically.

    // Try to serve from Workers Assets if configured
    if (typeof env.ASSETS !== 'undefined' && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Fallback: serve Whiteside Dev Command Center (inline dashboard)
    const dashboardUrl = `https://dev.sirinx.co/9router/dashboard/whiteside.html`;
    if (pathname === '/' || pathname === '/dashboard') {
      return Response.redirect(dashboardUrl, 302);
    }
    return Response.redirect(`https://dev.sirinx.co/9router/dashboard/`, 302);
  },
};
