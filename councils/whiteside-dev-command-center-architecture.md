# WhiteSide Dev Command Center — Architecture Plan

**Date:** 2026-07-26  
**Author:** Agent Council Brainstorm  
**Context:** P098 GhostClaw A2A Bridge / 9Router / OmniRoute Gateway  
**Status:** Planning / Draft

---

## 1. Architecture Diagram

```
                          ┌───────────────────────────────────┐
                          │        dev.sirinx.co              │
                          │    WhiteSide Command Center        │
                          │     (Cloudflare Worker —           │
                          │      static HTML+JS SPA)           │
                          └────────────────┬──────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
   ┌──────────▼──────────┐    ┌────────────▼────────────┐  ┌───────────▼───────────┐
   │  OmniRoute Gateway  │    │    9Router API         │  │  Cloudflare Workers   │
   │  :20128/v1           │    │    /api/models          │  │  (4 deployed)          │
   │  (model routing)     │    │    /api/status          │  │                       │
   │  (chat completions)  │    │    /api/a2a/status      │  │  sirinx-main-router   │
   │  (provider mgmt)     │    │    /api/providers       │  │  worker-2              │
   └──────────┬───────────┘    └────────────┬────────────┘  │  worker-3              │
              │                             │                │  worker-4              │
              │                             │                └───────────────────────┘
              │                             │
              │                    ┌────────▼────────┐
              │                    │  A2A Bridge      │
              │                    │  11 Agents        │
              │                    │  (outbox system)   │
              │                    └───────────────────┘
              │
    ┌─────────▼─────────┐    ┌──────────────────────┐    ┌──────────────────────┐
    │  Model Providers  │    │  Free Automation     │    │  Agent Health        │
    │                    │    │  (n8n recommended)   │    │  (webhook-based)     │
    │  cl/* (Cline)     │    │                      │    │                      │
    │  auto/* (OmniR)   │    │  Workflows:           │    │  Bridged via         │
    │  kr/* (Kiro VIP)  │    │  ─ model health poll  │    │  A2A live-sync       │
    │  cf/* (CF Workers)│    │  ─ agent alerting     │    │  + outbox events      │
    │  oc/* (OpenCode)  │    │  ─ deployment pipeline│    │                      │
    │  aliyun-maas      │    │  ─ cost tracking      │    └──────────────────────┘
    │  maxplus          │    │  ─ Slack/Telegram      │
    │  (391 total)      │    │    notifications      │
    └───────────────────┘    └──────────────────────┘
```

### Key Integration Points

| # | Integration | Direction | Protocol |
|---|-------------|-----------|----------|
| 1 | Dashboard → 9router API | Read | HTTPS GET /api/* |
| 2 | Dashboard → OmniRoute | Read (proxy via 9router) | HTTPS via CF Worker |
| 3 | Dashboard → CF Workers | Read | HTTPS /api/worker-status |
| 4 | n8n → Dashboard | Push webhook | POST webhook/event |
| 5 | n8n → Telegram/Slack | Push | Webhook/API |
| 6 | Dashboard → A2A Outbox | Read | REST /a2a/status |

---

## 2. Component List for the Dashboard

### 2.1 Navigation (WhiteSide Theme)
- **White sidebar** — collapsible, 240px wide
- Sections: Overview, Models, Agents, Workers, Automation, Settings
- Top bar: status bar with live indicator, auto-refresh toggle, last updated timestamp

### 2.2 Overview Dashboard (Landing Page)
- **Stats Bar**: Total models (391), active providers (8+), bridge agents (11), worker health (4/4), uptime
- **System Health Card**: OmniRoute online/offline, latency, model endpoint reachable
- **Recent Activity Feed**: Last 10 outbox events, agent syncs, model additions
- **Mini Model Chart**: Top 5 providers by model count (bar chart with CSS/Canvas)

### 2.3 Model Provider Health Matrix
- **Provider Tiles** (one per provider: auto/*, cl/*, kr/*, cf/*, oc/*, aliyun, maxplus, etc.)
- Each tile: name, status dot (green/yellow/red), model count, last checked
- Click to expand: list all models under that provider with context window, cost tier, VIP status
- **Filter bar**: search by model name, filter by provider, by cost (free/key/sub), by context size
- **Sort**: by name, by provider, by context window, by VIP status

### 2.4 A2A Bridge Agent Health Dashboard
- **Agent Cards** (11 agents):
  - Agent name + role (commander, builder, reviewer, architect, guard, etc.)
  - Status: ACTIVE / RUNNING / STOPPED / STANDBY
  - Outbox queue depth (number of pending items)
  - Last heartbeat timestamp
  - Sync group membership (build-team, architect-team, command, etc.)
  - Route target (9router / omniroute)
- **Agents Table View**: sortable by status, outbox depth, role, last sync
- **Sync Group Visualization**: group cards by sync group with inter-group arrows

### 2.5 OmniRoute Model Availability & Switching
- **Model Browser** (carried forward from existing 9router dashboard)
- **Route Rules Table**: default, coding → [codex, kiro], review → opencode, etc.
- **Provider Switch History**: last 10 automatic routing decisions
- **Cost/Usage Graph**: requests per model per time period (needs n8n data collection)

### 2.6 Cloudflare Worker Routing Status
- **Worker Cards** (4 workers):
  - sirinx-main-router: www.sirinx.co routing, lead API, D1 database
  - 3 additional workers (to be discovered/named)
  - Each card: name, route pattern, status (healthy/degraded/down), last deploy, request count
- **Route Map**: visual routing table showing URL patterns → target workers

### 2.7 Automation Panel (n8n Integration)
- Link to n8n instance (self-hosted at n8n.sirinx.co or via docker-compose.m2.yml)
- **Embedded Workflow Status**: last run, success/failure, next scheduled
- **Quick Actions**: "Trigger model health check", "Sync all agents", "Deploy worker"
- Show n8n webhook URLs for triggering workflows from the dashboard itself

### 2.8 Settings / Config
- OmniRoute base URL config
- A2A bridge config reload
- Auto-refresh interval (5/15/30/60s)
- Theme: WhiteSide only (clean white + accent colors)
- API key management display (read-only)

---

## 3. Data Sources (APIs to Call)

### Existing (Already Served by 9router Worker)

| Endpoint | Data | Method |
|----------|------|--------|
| `/api/models` | All 391 models grouped by provider | GET |
| `/api/status` | OmniRoute health, provider status, A2A bridge list, timestamps | GET |
| `/api/chat` | Chat completions proxy (existing) | POST |

### New Endpoints to Add (in 9router Worker or new dashboard Worker)

| Endpoint | Data | Method | Priority |
|----------|------|--------|----------|
| `/api/agents` | Detailed agent info (outbox depth, sync group, last heartbeat) | GET | P0 |
| `/api/workers` | CF Worker health, route patterns, deploy status | GET | P0 |
| `/api/routes` | A2A routing rules from bridge config | GET | P1 |
| `/api/events` | Recent outbox events / sync activity (poll-based) | GET | P1 |
| `/api/providers/deep` | Provider detail: model list, health, cost tier, context windows | GET | P1 |

### External / Indirect

| Source | Data | How |
|--------|------|-----|
| A2A outbox filesystem (`~/.ghostclaw_runtime/a2a2a/`) | Outbox queue depths per agent | Read via worker API or cron sync |
| Bridge config YAML (`apps/9router/bridge/`) | Route rules, sync groups, agent roles | Read and embed at build time or expose via `/api/config` |
| n8n webhooks | Push events (deploy complete, agent down, model added) | POST to dashboard |
| OmniRoute Health API | `/api/health`, `/api/providers`, `/api/a2a/status` | Already proxied via 9router |

### Data Refresh Strategy

| Data | Refresh | Mechanism |
|------|---------|-----------|
| Model list | Every 60s | Poll `/api/models` |
| Agents / outbox | Every 30s | Poll `/api/agents` |
| CF Workers | Every 60s | Poll `/api/workers` |
| Events | Every 15s (streaming) | SSE or short-poll `/api/events` |
| Provider health | Every 120s | Poll `/api/providers/deep` |
| n8n triggers | On demand | Manual button or webhook |

---

## 4. Free Workflow Automation Recommendation

### Recommendation: **n8n** (already partially deployed)

**Evidence:** n8n is already referenced in the existing infrastructure:
- GhostClaw manager architecture report shows `Git Webhooks / n8n` → Router
- `docker-compose.m2.yml` includes n8n as one of 10 services
- Documented as running at `n8n.sirinx.co`

### n8n vs Activepieces vs Node-RED

| Criteria | n8n | Activepieces | Node-RED |
|----------|-----|-------------|----------|
| **License** | Sustainable Use License (fair-code, free self-hosted) | MIT (fully open) | Apache 2.0 |
| **UI Quality** | ⭐⭐⭐⭐⭐ Clean, modern, 400+ nodes | ⭐⭐⭐⭐ Modern, 200+ nodes | ⭐⭐⭐ Functional, 200k+ flows |
| **Self-Host** | ✅ Docker, npm | ✅ Docker | ✅ npm, Docker |
| **Webhooks** | ✅ Built-in trigger nodes | ✅ Built-in | ✅ Built-in |
| **AI/LLM Support** | ✅ Native OpenAI, Claude, HuggingFace nodes | ❌ Limited (community) | ✅ Via community nodes |
| **Telegram/Notif** | ✅ Native Telegram, Slack, Email | ✅ Native | ✅ Community nodes |
| **Monitoring** | ✅ Execution history, retries, error workflows | ⚠️ Basic | ⚠️ Basic via flow debug |
| **Existing in stack** | ✅ Already in docker-compose.m2.yml | ❌ | ❌ |
| **Community** | 50k+ ⭐ GitHub, very active | 10k+ ⭐, growing fast | 45k+ ⭐, mature |
| **Complex Workflows** | ✅ Advanced branching, loops, error handling | ⚠️ Simpler but clean | ✅ Very flexible |
| **API/Webhook first** | ✅ Designed for API integration | ✅ API-first | ⚠️ More IoT/flow focused |

### Why n8n wins for this stack

1. **Already deployed** — docker-compose.m2.yml has it; no new infrastructure needed
2. **LLM-aware** — Native OpenAI/Anthropic nodes for model orchestration
3. **Webhook-native** — Perfect for 9router event ingestion (agent health, deploy events)
4. **Mature error handling** — Retries, error workflows, execution history
5. **Node ecosystem** — HTTP Request, Webhook, Schedule, Telegram, Email, filesystem

### Suggested n8n Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| Agent Health Poll | Cron (5 min) | Call `/api/agents`, push to dashboard webhook, alert if agent DOWN |
| Model Catalog Refresh | Cron (1 hour) | Call `/api/models`, diff against last known, log additions/removals |
| Deploy Pipeline | Webhook (from git push) | Run deploy script, notify Telegram, update dashboard event log |
| Cost Tracker | Cron (daily) | Aggregate requests by model, push to Google Sheets / Supabase |
| Agent Sync Trigger | Manual button on dashboard | POST to n8n webhook → trigger bridge orchestrator |
| Worker Health Check | Cron (10 min) | Ping each CF Worker health endpoint, alert on failure |

---

## 5. Deployment Strategy

### Primary Strategy: Cloudflare Worker (same as existing 9router)

**Rationale:** Reuse the existing `apps/9router/wrangler.toml` deployment pipeline. The dashboard is a single HTML file with inline CSS/JS (no build step). Under Cloudflare Workers, static assets are served by the `assets` directory.

```
apps/9router/
├── wrangler.toml            # routes dev.sirinx.co/9router
├── src/
│   └── index.js             # Worker router (expand with new /api/* endpoints)
├── dashboard/
│   └── index.html           # Replace with WhiteSide Command Center SPA
└── whiteside/               # NEW: dedicated directory for the WhiteSide dashboard
    ├── index.html           # Main SPA
    ├── css/
    │   └── whiteside.css    # WhiteSide theme styles
    └── js/
        ├── app.js           # Router, state management
        ├── models.js        # Model browser component
        ├── agents.js        # A2A agent health component
        ├── workers.js       # CF Worker status component
        ├── automation.js    # n8n integration component
        └── settings.js      # Settings/config component
```

### Option A: Replace-in-place (Recommended for v1)
- Replace `apps/9router/dashboard/index.html` with the new WhiteSide SPA
- Add new API endpoints to `src/index.js`
- Deploy with existing `npm run deploy`

### Option B: Separate Worker + Pages (For v2, if traffic warrants)
- Keep 9router as API-only worker
- Deploy WhiteSide dashboard as Cloudflare Pages site
- Pages fetches from 9router API endpoints

### Option A vs B Comparison

| Criterion | Option A (Replace) | Option B (Separate) |
|-----------|-------------------|---------------------|
| Complexity | Low — 1 deploy target | Medium — 2 deploy targets |
| Latency | Same origin (no CORS) | Cross-origin (needs CORS) |
| Scaling | Worker + Assets = free tier | 2 Workers = potentially more cost |
| Code isolation | Tightly coupled | Loosely coupled |
| Dev speed | Fast | Slower |

**Decision:** Start with **Option A** for v1. Migrate to Option B if the dashboard grows complex enough to warrant its own deployment lifecycle.

### Deployment Pipeline

```bash
# 1. Build (minimal — just copy files, no bundler needed)
cd apps/9router

# 2. Deploy Worker (includes assets)
npm run deploy

# 3. Verify
curl https://dev.sirinx.co/9router/api/health
open https://dev.sirinx.co/9router/
```

### New Wrangler Options (if going Option B — Pages)

```bash
npx wrangler pages deploy whiteside/ --project-name=whiteside-dashboard
```

---

## 6. Integration Points with Existing Systems

### 6.1 9Router Worker (src/index.js)
**Integration type:** Backend API expansion  
**What to add:**
- `GET /api/agents` — Parse bridge config YAML + read outbox filesystem → return agent status
- `GET /api/workers` — Ping other CF Workers, collect health + route patterns
- `GET /api/events` — Poll A2A outbox event log, return recent events
- `GET /api/config` — Expose parts of bridge config for dashboard display

### 6.2 A2A Bridge / Outbox System
**Integration type:** Read-state, filesystem  
**Path:** `~/.ghostclaw_runtime/a2a2a/`  
**What to read:**
- `bridge_active.json` — Which agents are currently active
- `outbox/<agent>/` — Count pending items per agent
- `outbox/<agent>/<event>.json` — Read recent event metadata

### 6.3 Bridge Config
**Integration type:** Static config embed + periodic refresh  
**Path:** `apps/9router/bridge/agent-provider-config.yaml`  
**What to expose:**
- Agent names, roles, providers, models
- Sync groups and intervals
- Route rules and targets
- Provider endpoint config (URIs, model prefixes)

### 6.4 OmniRoute API
**Integration type:** HTTP proxy via 9router  
**What to read:**
- `/v1/models` — Full model list → group by provider, flag VIP
- `/api/health` — Gateway health, version
- `/api/providers` — Connected provider status
- `/api/a2a/status` — Bridge agent heartbeat

### 6.5 Cloudflare Workers (4 deployed)
**Integration type:** HTTP health check from 9router worker  
**Workers to monitor:**
- **sirinx-main-router** — routes `www.sirinx.co`, lead API, D1 database
- +3 others (need discovery — check Cloudflare dashboard or wrangler.toml files)

**Health check method:** Each worker exposes a `/api/health` or `/health` endpoint; 9router polls them.

### 6.6 n8n (for automation)
**Integration type:** Webhook push + dashboard link  
**Setup:**
- n8n instance at `n8n.sirinx.co` (or port 5678 on the docker host)
- Dashboard embeds webhook-trigger buttons ("Sync Agents", "Run Health Check")
- n8n workflows push events to dashboard via webhook receiver endpoint (`/api/webhook/n8n`)
- Dashboard shows last run status of key workflows

### 6.7 Telegram / Notifications
**Integration type:** Indirect via n8n  
**Path:** n8n workflow → Telegram Bot API → notification to user  
**Events to notify:**
- Agent goes down (outbox stops processing)
- OmniRoute health degrades
- New model added to catalog
- Deployment completed

### 6.8 Supabase (future)
**Integration type:** Read/write  
**Planned:** Store agent logs, model usage data, deployment history  
**Connection:** Via Dashboard API → Supabase REST SDK

---

## 7. Component Implementation Plan (v1 Sprint)

### Phase 1: Scaffold & API Expansion (Days 1-2)
- [ ] Create `apps/9router/whiteside/` directory structure
- [ ] Add `/api/agents`, `/api/workers`, `/api/events` endpoints to `src/index.js`
- [ ] Wire `/api/config` to read bridge YAML
- [ ] Test API endpoints with curl

### Phase 2: Frontend — Shell & Navigation (Days 2-3)
- [ ] Build WhiteSide HTML shell (sidebar + top bar + content area)
- [ ] Implement client-side routing (hash-based, no router lib)
- [ ] CSS theme: white background, subtle grays, accent color (SIRINX teal/blue)
- [ ] Responsive: sidebar collapses on mobile

### Phase 3: Dashboard Panels (Days 3-5)
- [ ] Overview panel with stat cards + health indicator
- [ ] Model browser panel (ported from existing dashboard)
- [ ] Agent health panel (cards + table view)
- [ ] Worker status panel
- [ ] Automation panel (n8n integration + workflow triggers)

### Phase 4: Polish & Deploy (Days 5-6)
- [ ] Auto-refresh with configurable interval
- [ ] Loading states, error boundaries, toast notifications
- [ ] Dark state for unavailable data
- [ ] Deploy to production (`npm run deploy`)
- [ ] Verify on dev.sirinx.co/9router/

---

## 8. Technology Choices Summary

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | Vanilla HTML/CSS/JS (no framework) | Zero build step, single-file deploy for v1. Can migrate to Svelte/Vue if complexity grows. |
| **CSS** | Custom CSS with CSS custom properties | No Tailwind dependency; WhiteSide theme is clean minmalism. |
| **Icons** | SVG inline | Zero bundle, matches current 9router approach. |
| **Charts** | CSS-only + Canvas (no Chart.js) | Minimalistic stats bars. Canvas for sparklines if needed. |
| **Backend API** | Cloudflare Worker (same as 9router) | No new infra; reuse `wrangler.toml`. |
| **Automation** | n8n (already in stack) | Already in docker-compose.m2.yml, mature, LLM-aware. |
| **Deploy** | `npm run deploy` (wrangler) | Existing pipeline. |
| **Theme** | WhiteSide (white + charcoal + teal/blue) | Clean, professional, high contrast. |

---

## 9. Future Considerations (v2+)

1. **WebSocket / SSE** for real-time agent health updates instead of polling
2. **D1 database** integration for persistent event history
3. **Agent logs viewer** — tail recent outbox session logs in-browser
4. **Deploy from dashboard** — one-click deploy of config changes
5. **Cost analytics** — model usage breakdown by provider, agent, time period
6. **Dark mode toggle** (WhiteSide night variant)
7. **Supabase sync** — persist dashboard state for multi-session continuity
8. **PWA support** — service worker for offline caching
