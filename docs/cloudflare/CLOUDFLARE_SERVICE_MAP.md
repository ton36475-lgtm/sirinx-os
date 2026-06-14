# Cloudflare Service Map for SIRINXDev v8.2

Status: LOCAL-ONLY SERVICE MAP

| Service | Role | SIRINX Use | Pre-approval state |
| --- | --- | --- | --- |
| Access / Zero Trust | Private security boundary | Protect dev, agents, MCP, n8n, logs | Plan only |
| Workers | API gateway | Thin approved-job gateway and routing | Local skeleton only |
| Agents SDK | Stateful edge agents | EdgeOrchestrator, Compliance, Evidence, Research | Local skeleton only |
| Durable Objects | Per-agent state | Agent identity, run state, WebSocket/session state | Schema draft only |
| Workflows | Durable multi-step work | Audit, scan, preview, tests, package, wait approval | Design only |
| Queues | Async retry layer | agent_jobs, evidence_jobs, indexing_jobs, DLQ | Design only |
| D1 | SQL state | agent_runs, approvals, audit_events, cost_ledger | Schema draft only |
| R2 | Artifact storage | Evidence packets, screenshots, build logs | Private-by-default design |
| Vectorize / AI Search | Retrieval memory | Policy and project-doc semantic retrieval | Design only |
| AI Gateway | Model/cost control | Logging, caching, fallback, rate/cost guard | Design only |
| Remote MCP | Tool portal | Read project state, approvals, evidence, memory | Auth-required design only |
| Workers Logs | Evidence logs | Invocation, errors, custom logs, correlation IDs | Design only |

## Domain Map

| Host | Purpose | Required boundary |
| --- | --- | --- |
| `sirinx.co` | Public trust site | Public, production approval required |
| `www.sirinx.co` | Canonical public site | Public, production approval required |
| `dev.sirinx.co` | Private Mission Control | Cloudflare Access |
| `api.sirinx.co` | API gateway | Auth plus approval-aware mutation checks |
| `agents.sirinx.co` | Edge agent runtime | Cloudflare Access |
| `mcp.sirinx.co` | Remote MCP portal | Access plus OAuth/scoped permissions |
| `assets.sirinx.co` | R2 artifacts/media/evidence | Private by default |
| `n8n.sirinx.co` | Automation lab | Cloudflare Access |
| `logs.sirinx.co` | Observability dashboard | Cloudflare Access |

