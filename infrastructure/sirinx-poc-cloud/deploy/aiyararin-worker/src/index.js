// aiyararin-api — Cloudflare Worker
//   GET  /health  → liveness + model catalogue touch
//   POST /chat    → Workers AI chat (JSON: {message, history?})
//   GET  /        → tiny landing page describing the endpoints
//
// No secrets are required: Workers AI is bound as env.AI.

const MODELS = {
  chat: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  small: "@cf/meta/llama-3.2-3b-instruct",
};

const SYSTEM = `You are the Aiyararin assistant. Aiyararin runs a resort, a cafe
called Heaven168 and a palace venue in Thailand. Answer briefly and warmly.
If a question needs live booking data you do not have, say so and invite the
guest to contact the venue directly. Never invent prices or availability.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        },
      });
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "aiyararin-api",
        model: MODELS.chat,
        ai_bound: typeof env.AI !== "undefined",
        time: new Date().toISOString(),
      });
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "body must be JSON" }, 400);
      }
      const message = (body?.message || "").toString().slice(0, 4000);
      if (!message) return json({ ok: false, error: "message required" }, 400);

      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
      const messages = [
        { role: "system", content: SYSTEM },
        ...history
          .filter((m) => m && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
        { role: "user", content: message },
      ];

      try {
        const out = await env.AI.run(MODELS.chat, {
          messages,
          max_tokens: 512,
        });
        return json({
          ok: true,
          model: MODELS.chat,
          reply: out?.response ?? null,
        });
      } catch (err) {
        // fall back to the small model before failing the request
        try {
          const out = await env.AI.run(MODELS.small, {
            messages,
            max_tokens: 384,
          });
          return json({
            ok: true,
            model: MODELS.small,
            fallback: true,
            reply: out?.response ?? null,
          });
        } catch (err2) {
          return json(
            { ok: false, error: "inference failed", detail: String(err2).slice(0, 300) },
            502,
          );
        }
      }
    }

    if (url.pathname === "/") {
      const html = `<!doctype html><meta charset="utf-8">
<title>Aiyararin API</title>
<style>
 body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:3rem auto;padding:0 1rem;color:#10241f;background:#f7faf8}
 code{background:#e6efe9;padding:.15rem .4rem;border-radius:4px}
 h1{font-size:1.5rem;margin-bottom:.25rem}
 .k{color:#0b6b4f;font-weight:600}
</style>
<h1>Aiyararin API</h1>
<p>Small service for the Aiyararin venues. <span class="k">Cloudflare Workers AI</span>.</p>
<ul>
 <li><code>GET /health</code> — liveness and model id</li>
 <li><code>POST /chat</code> — <code>{"message":"..."}</code> → <code>{"reply":"..."}</code></li>
</ul>
<p>Venue facts live in the SIRINX hub, not here; this endpoint answers general
questions and declines to invent prices or availability.</p>`;
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return json({ ok: false, error: "not found", path: url.pathname }, 404);
  },
};
