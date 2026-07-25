# 9Router — OmniRoute Cloudflare Gateway

A Cloudflare Worker API gateway for [OmniRoute](https://github.com/omniroute) with a premium dashboard frontend. Routes model requests, lists available models, checks A2A bridge health, and proxies chat completions — all served from a single Worker.

## Architecture

```
                 ┌─────────────────┐
                 │  dev.sirinx.co  │
                 │    /9router     │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │   Cloudflare    │
                 │    Worker       │
                 │  (src/index.js) │
                 └──┬──────────┬───┘
                    │          │
           ┌────────▼──┐  ┌───▼──────────┐
           │ Dashboard  │  │  API Gateway  │
           │  Static    │  │  /api/*       │
           │  HTML/CSS  │  └───┬──────────┘
           └────────────┘      │
                   ┌───────────▼───────────┐
                   │   OmniRoute (Local)    │
                   │  http://127.0.0.1:20128 │
                   └───────────────────────┘
```

## Project Structure

```
apps/9router/
├── package.json           # Project metadata + scripts
├── wrangler.toml          # Cloudflare Worker config
├── README.md              # This file
├── src/
│   └── index.js           # Worker handler (API + static serving)
└── dashboard/
    └── index.html         # Premium SPA dashboard (inline CSS/JS)
```

## API Endpoints

| Method | Path           | Description                              |
|--------|----------------|------------------------------------------|
| GET    | `/api/models`  | List all models from OmniRoute, grouped by provider with VIP pool indicators |
| GET    | `/api/status`  | Health check: OmniRoute connectivity, provider status, A2A bridge health |
| POST   | `/api/chat`    | Proxy chat completions through OmniRoute (supports streaming SSE) |
| OPTIONS| `/api/*`       | CORS preflight                             |
| GET    | `/*`           | Serve dashboard frontend (via Worker Assets) |

### GET /api/models

Returns models grouped by provider. Response shape:

```json
{
  "models": [{ "id": "openai/gpt-4o", "provider": "openai", "model": "gpt-4o", "isVip": true }],
  "providers": [{ "provider": "openai", "models": [...], "count": 42, "vipCount": 3 }],
  "stats": { "total": 250, "vip": 12, "providers": 8 },
  "upstreamStatus": "connected"
}
```

### GET /api/status

```json
{
  "status": "healthy",
  "services": { "omniRoute": { "reachable": true, "version": "3.8.47" } },
  "providers": { "count": 8, "list": [...] },
  "a2aBridges": { "count": 2, "bridges": [...] }
}
```

### POST /api/chat

Accepts OpenAI-compatible request body (`model`, `messages`, `stream`). Supports streaming (SSE passthrough).

## Dashboard Features

- **Model Browser** — All OmniRoute models grouped by provider, with VIP/standard badges and search
- **A2A Bridge Status** — Real-time health of connected A2A bridge agents
- **System Health** — OmniRoute connectivity, model endpoint status, provider counts
- **Chat Playground** — Interactive chat interface with model selection, system prompt, streaming response

## Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) >= 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- OmniRoute running locally (or accessible at `OMNIROUTE_BASE_URL`)

### Setup

```bash
# Install dependencies
npm install

# Start local dev server (Wrangler dev)
npm run dev

# Or with custom OmniRoute URL
OMNIROUTE_BASE_URL=http://192.168.1.100:20128 npx wrangler dev
```

### Environment Variables

| Variable             | Default                         | Description                        |
|----------------------|---------------------------------|------------------------------------|
| `OMNIROUTE_BASE_URL` | `http://127.0.0.1:20128`       | Upstream OmniRoute API base URL    |
| `OMNIROUTE_API_KEY`  | `""`                            | API key for OmniRoute auth         |
| `VIP_MODELS`         | Comma-separated model IDs       | Models marked as VIP in the UI     |

## Deployment

### Deploy Worker API + Dashboard

```bash
# Update wrangler.toml with your Cloudflare credentials and zone ID
# Set the route to point at dev.sirinx.co/9router/*

npm run deploy
```

### Deploy Dashboard Only (via Cloudflare Pages)

```bash
npx wrangler pages deploy dashboard/ --project-name=9router-dashboard
```

### Route Configuration

The Worker is configured to serve at `dev.sirinx.co/9router`. Update `wrangler.toml`:

```toml
routes = [
  { pattern = "dev.sirinx.co/9router", zone_id = "YOUR_ZONE_ID" }
]
```

### Custom Domain

1. Add your domain to Cloudflare
2. Update the route pattern in `wrangler.toml`
3. Set the DNS record to proxy through Cloudflare
4. Deploy with `npm run deploy`

## Maintenance

- The dashboard is a single-page application with inline CSS/JS — no build step required
- The Worker auto-detects if Cloudflare Assets is configured and serves the dashboard accordingly
- All API responses include CORS headers for cross-origin access
