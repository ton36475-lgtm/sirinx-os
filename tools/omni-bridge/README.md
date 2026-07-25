# Omni-Bridge

OpenAI-compatible edge proxy with provider fallback, deployed as a Cloudflare Worker.
One endpoint; several providers tried in order until one answers.

```
POST https://omni-bridge.<subdomain>.workers.dev/
  → DeepSeek → Groq → OpenRouter → Alibaba → Gemini
```

A provider whose secret is not bound is skipped, so any subset works.

## Deploy

```bash
npm install
npx wrangler login          # interactive, opens a browser
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put ALIBABA_API_KEY
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

Secrets are never written to `wrangler.toml` — that file is committed.

## Test

```bash
npm test      # 13 tests
```

## What changed from the original draft

Six fixes. Each has a test.

### 1. Compression no longer destroys ordinary prompts

The original applied this to every message:

```js
compressed = compressed.replace(/^(?![+-]).*$/gm, (m) => m.substring(0, 35) + '...');
```

That rule is correct for unchanged context lines in a git diff. Applied to a
normal request it truncated it before any model saw it:

```
in  : "Please refactor the payment handler so it retries on 429 and adds a test…"
out : "Please refactor the payment handler ..."
```

Pasted source fared worse — the shebang and every comment were stripped and each
line cut to 35 characters. The model answered a question nobody asked, and
nothing in the logs said why.

Compression is now gated on `isCompressible()`, which recognises diffs and logs.
Everything else passes through untouched.

`WARN` and `ERROR` lines survive log compression now; only `INFO`/`DEBUG`/`TRACE`
are dropped. A log is usually pasted *because* something failed.

### 2. Upstream error bodies are no longer returned to the caller

The original returned `details: lastErrorResponse` — the raw body from whichever
provider failed last — with `Access-Control-Allow-Origin: *`.

Provider errors quote request ids, account identifiers, and sometimes fragments
of the key. Now the body is logged worker-side and the response carries a short
`trace` id instead.

### 3. Egress redaction gate

The worker fans out to five third parties, so a payload carrying a credential
leaks it to all five at once. `redact.js` mirrors
`ghostclaw-providers::maxplus::redaction_gate`, including the prefixes this
project has actually handled: `ccsk-`, `glm-share-`, `sk-ws-`.

A hit drops the request rather than scrubbing and continuing — a payload
containing a credential was assembled wrong upstream, and quietly sending a
cleaned version hides that from whoever has to fix it.

### 4. Fresh response headers

The original did `new Headers(response.headers)` and then re-serialised the body
with `JSON.stringify`. An inherited `Content-Length` or `Content-Encoding`
describes a body that no longer exists.

### 5. Per-request timeout

`AbortController` at 60s. Without it a hung provider hangs the whole chain and
the fallback never runs.

### 6. An auth failure stops the chain

The original fell through on any non-`ok` status, including `401`. That means a
revoked key silently moves traffic to the next provider: requests keep working,
and the operator finds out from the bill.

`shouldFallThrough()` now falls through on `429` and `5xx` — the conditions
fallback exists for — and returns `502` naming the provider on `401`/`403`.

## Not fixed: the model ids

The five ids in `providers.js` came from the original draft and have **not** been
probed against each provider's live model list:

```
deepseek-chat · llama-3.3-70b-versatile
meta-llama/llama-3-8b-instruct:free · qwen-long · gemini-1.5-flash
```

On this project a declared id has failed against a live list four times: maxplus
listed three ids that were not routable, cointh's config misspelled two of four,
a requested `qwen3.8` did not exist at all, and a dashboard claimed schema
support that returned 400 on every path.

Verify before trusting them.

## Related

This is one of three things on this machine that route model requests. See
`docs/specs/system-inventory/BRIDGE_INVENTORY.md` for how it differs from
OmniRoute (`:20128`) and the in-process `TieredRouter`.
