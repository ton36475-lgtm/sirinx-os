/**
 * SIRINX OS — Cloudflare Worker Edge Relay
 * 
 * Acts as 24/7 always-on endpoint for:
 * - Webhook receiving (GitHub, LINE, custom)
 * - Cron triggers (health check, agent dispatch)
 * - Node discovery + registration
 * - Auto-approval proxy to Mac mini
 * 
 * Deploy: wrangler deploy
 * URL: https://sirinx.co/api/agent/*
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── CORS ──
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ── Health check ──
    if (path === "/api/agent/health") {
      return json({ status: "online", ts: Date.now(), region: request.cf?.country });
    }

    // ── Node registration ──
    if (path === "/api/agent/register" && method === "POST") {
      const body = await request.json();
      const token = request.headers.get("Authorization")?.replace("Bearer ", "");
      
      if (!token || token !== env.SIRINX_CLUSTER_TOKEN) {
        return json({ error: "unauthorized" }, 401);
      }

      const nodeId = crypto.randomUUID();
      await env.SIRINX_KV.put(`node:${nodeId}`, JSON.stringify({
        ...body,
        id: nodeId,
        joined: Date.now(),
        lastSeen: Date.now(),
      }), { expirationTtl: 3600 });

      return json({ ok: true, nodeId, message: "Node registered. Welcome to the fleet." });
    }

    // ── Cron webhook relay ──
    if (path === "/api/agent/cron" && method === "POST") {
      const body = await request.json();
      const { action, target } = body;

      // Relay to Mac mini controller
      try {
        const resp = await fetch(`${env.MAC_MINI_URL || "http://localhost:20128"}/api/v1/agent/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.SIRINX_CLUSTER_TOKEN}` },
          body: JSON.stringify({ action, target, source: "cloudflare-worker", ts: Date.now() }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await resp.json();
        return json({ ok: true, relayed: true, response: data });
      } catch (e) {
        // Mac mini offline — queue for later
        await env.SIRINX_KV.put(`queue:${Date.now()}`, JSON.stringify(body), { expirationTtl: 86400 });
        return json({ ok: false, queued: true, error: "controller offline, queued" });
      }
    }

    // ── GitHub webhook handler ──
    if (path === "/api/agent/webhook/github" && method === "POST") {
      const event = request.headers.get("X-GitHub-Event");
      const body = await request.json();

      if (event === "push") {
        // Auto-trigger Hermes to check lane compliance
        return json({ ok: true, action: "push-detected", repo: body.repository?.full_name });
      }
      if (event === "pull_request") {
        // Auto-assign reviewer agent
        return json({ ok: true, action: "pr-detected", pr: body.number });
      }
      return json({ ok: true, event });
    }

    // ── LINE webhook handler ──
    if (path === "/api/agent/webhook/line" && method === "POST") {
      const body = await request.json();
      // Queue for Mac mini processing
      await env.SIRINX_KV.put(`line:${Date.now()}`, JSON.stringify(body), { expirationTtl: 3600 });
      return json({ ok: true });
    }

    // ── Status dashboard ──
    if (path === "/api/agent/status") {
      const nodes = await listNodes(env);
      return json({ nodes, uptime: "24/7", controller: "mac-mini-m2" });
    }

    return json({ error: "not found", path }, 404);
  },

  // ── Scheduled cron triggers ──
  async scheduled(event, env, ctx) {
    switch (event.cron) {
      case "*/5 * * * *":
        // Health check every 5 minutes
        await healthCheck(env);
        break;
      case "*/15 * * * *":
        // Worktree sync
        await relayAction(env, "worktree-sync");
        break;
      case "0 * * * *":
        // Brain sync every hour
        await relayAction(env, "brain-sync");
        break;
      case "0 9 * * *":
        // Daily summary at 9am
        await relayAction(env, "daily-summary");
        break;
    }
  },
};

// ── Helpers ──
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

async function listNodes(env) {
  const list = await env.SIRINX_KV.list({ prefix: "node:" });
  const nodes = [];
  for (const key of list.keys) {
    const val = await env.SIRINX_KV.get(key.name);
    if (val) nodes.push(JSON.parse(val));
  }
  return nodes;
}

async function healthCheck(env) {
  try {
    await fetch(env.MAC_MINI_URL || "http://localhost:20128", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Controller offline — alert via KV
    await env.SIRINX_KV.put("alert:controller", JSON.stringify({ ts: Date.now(), status: "offline" }));
  }
}

async function relayAction(env, action) {
  try {
    await fetch(`${env.MAC_MINI_URL || "http://localhost:20128"}/api/v1/agent/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, source: "cron" }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Queue for later
  }
}
