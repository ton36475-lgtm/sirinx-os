// Omni-Bridge — an OpenAI-compatible edge proxy with provider fallback.
//
// One endpoint, several providers, tried in order until one answers. Context is
// compressed on the way out when it is the kind of content compression helps.
//
// Deployed as a Cloudflare Worker. Secrets are bound with `wrangler secret put`,
// never committed — see README.md.

import { compressMessages } from './compress.js';
import { redactionHit } from './redact.js';
import { PROVIDERS, shouldFallThrough } from './providers.js';

/** Per-provider request timeout. Without one, a hung provider hangs the chain. */
export const PROVIDER_TIMEOUT_MS = 60_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

/** Short opaque id so a client can quote it and an operator can grep the logs. */
function traceId() {
  return crypto.randomUUID().slice(0, 8);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== 'POST') {
      return new Response('Omni-Bridge edge proxy. POST an OpenAI-shaped body.', {
        status: 200,
        headers: CORS,
      });
    }

    const trace = traceId();

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: { message: 'Body is not valid JSON', trace } }, 400);
    }

    // Drop before egress. The worker fans out to several third parties, so a
    // payload carrying a credential would leak it to all of them at once.
    const hit = redactionHit(body);
    if (hit) {
      console.error(`[omni-bridge ${trace}] DENIED: payload matched ${hit}`);
      return json(
        {
          error: {
            message: `Blocked by egress redaction gate: payload contains ${hit}`,
            type: 'redaction_denied',
            trace,
          },
        },
        400
      );
    }

    const outbound = { ...body, messages: compressMessages(body.messages) };

    let lastStatus = null;
    let lastProvider = null;

    for (const provider of PROVIDERS) {
      const key = env[provider.keyEnv];
      if (!key) continue;

      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), PROVIDER_TIMEOUT_MS);

      try {
        const upstream = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            ...provider.headers,
          },
          body: JSON.stringify({ ...outbound, model: provider.model }),
          signal: abort.signal,
        });

        if (upstream.ok) {
          const data = await upstream.json();
          // Build fresh headers rather than copying the upstream set: the body is
          // re-serialised here, so an inherited Content-Length or
          // Content-Encoding would describe a body that no longer exists.
          return json(data, 200, { 'X-Omni-Provider-Hit': provider.name, 'X-Omni-Trace': trace });
        }

        lastStatus = upstream.status;
        lastProvider = provider.name;

        // The upstream body is logged, never returned: provider errors quote
        // request ids, account identifiers, and sometimes fragments of the key,
        // and this worker answers any origin.
        console.warn(
          `[omni-bridge ${trace}] ${provider.name} -> ${upstream.status}: ` +
            (await upstream.text()).slice(0, 500)
        );

        if (!shouldFallThrough(upstream.status)) {
          return json(
            {
              error: {
                message: `${provider.name} rejected the credential (HTTP ${upstream.status}). Not falling through — fix the key rather than shifting traffic.`,
                type: 'provider_auth_failed',
                provider: provider.name,
                trace,
              },
            },
            502
          );
        }
      } catch (err) {
        const timedOut = err?.name === 'AbortError';
        lastStatus = timedOut ? 408 : null;
        lastProvider = provider.name;
        console.error(
          `[omni-bridge ${trace}] ${provider.name} ${timedOut ? 'timed out' : 'failed'}: ${err?.message}`
        );
      } finally {
        clearTimeout(timer);
      }
    }

    const configured = PROVIDERS.filter((p) => env[p.keyEnv]).length;
    return json(
      {
        error: {
          message:
            configured === 0
              ? 'No provider secrets are bound. Set at least one with `wrangler secret put`.'
              : `All ${configured} configured providers failed. Last: ${lastProvider} (${lastStatus ?? 'connection error'}). Details are in the worker log under this trace id.`,
          type: 'omni_bridge_exhausted',
          trace,
        },
      },
      503
    );
  },
};
