# 🛰️ PROJECT ENVIRONMENT CONTROL MATRIX
> DEPLOYMENT BASE: PHITSANULOK CORE (Mac mini M2)
> SYSTEM POLICY: ZERO-TUNNEL INGRESS / CLOUDFLARE NATIVE TRANSITION
> MODEL PRIORITY: FREE-FIRST → ESCALATION

## 🧰 ENVIRONMENT BOUNDARY & TOOLS REGISTER

| Zone | Tools | Access Pattern |
|------|-------|----------------|
| 🟩 GREEN (Autoloop) | Firecrawl, Lighthouse, SerpBear, Plausible, Ollama, Local Models, Internal MCP | Fully-Automated Task |
| 🟨 YELLOW (Human-in-the-Loop) | OpenCode/Codex/Claude Code, Repo Changes, Config Updates | Plan Approval Required |
| 🟥 RED (Restricted Gate) | Production Deploy, Cloud Mutation, Secret Exposure, Customer Messaging | Strict Human Gate |

## 🔗 REPO INTEGRATION TRACKING TARGETS

1. **Media Production Engine (Ghost Claw OS)**
   - ควบคุม draft_content.json ผ่าน CapCut-CLI
   - Deterministic Timeline Control

2. **State Storage Layer (Go/Rocky Linux)**
   - fleet_missions, evidence_events, file_leases tables
   - Cryptographic Evidence Chain Logs

3. **Edge Interface (Cloudflare Workers)**
   - Real-time status via WebSockets
   - ws.sirinx.co/stream endpoint

## 🛑 INFALLIBLE TERMINATION MECHANISM
- Max 5 loop rounds per mission
- On infinite loop → Engine Protection Halt
- Log exception + emit FAILURE status immediately

## 🎯 TARGET PROJECTS FOR AUTOLOOP
- `/Users/sirinx/sirinx-os/services/postgres-state/` (PostgreSQL State Layer)
- `/Users/sirinx/sirinx-os/services/orchestrator-go/` (Go Backend)
- `/Users/sirinx/sirinx-os/services/edge-gateway/` (Cloudflare Worker)
- `/Users/sirinx/sirinx-os/apps/live-agent-studio/` (Live Studio MVP)

## 🔐 SECURITY CONSTRAINTS
- No `.env` credential reading
- No production deploy without explicit approval
- MCP dry-run default
- PII masking in all logs/reports