# SIRINX 47 Ronin Agent Team Setup

Date: 2026-05-17
Mode: 12 active Hermes profiles plus 47-role roster
Public website rule: `www.sirinx.co` remains protected

## Implemented Runtime Profiles

The active team is implemented as 12 Hermes profiles cloned from the default profile with fresh session/memory state.

| Profile | Lane | Responsibility | Default cwd | Gateway |
| --- | --- | --- | --- | --- |
| `shogun` | Approval | Orchestrator, approval router, final integrator | `/Users/sirinx/sirinx-os` | Stopped |
| `planner` | Planning | Backlog, system design, sequencing | `/Users/sirinx/sirinx-os` | Stopped |
| `frontend` | Website | Public website and Command Center UI | `/Users/sirinx/sirinx-os` | Stopped |
| `backend` | Backend | APIs, lead backend, integrations | `/Users/sirinx/sirinx-os` | Stopped |
| `devops` | Release | Cloudflare, GitHub, deployment preflight | `/Users/sirinx/sirinx-os` | Stopped |
| `qa` | Quality | Tests, browser QA, PageSpeed, SEO/AEO verification | `/Users/sirinx/sirinx-os` | Stopped |
| `growth` | Marketing | SEO/AEO, 77 provinces, campaign logic | `/Users/sirinx/sirinx-os` | Stopped |
| `sales` | Leads | Lead triage, CRM handoff, proposal workflow | `/Users/sirinx/sirinx-os` | Stopped |
| `data` | Data | Supabase, analytics, spreadsheets, reporting | `/Users/sirinx/sirinx-os` | Stopped |
| `solis` | Energy | Solis telemetry and load-balancing safety planning | `/Users/sirinx/sirinx-os` | Stopped |
| `design` | Creative | Figma, Canva, presentations, documents | `/Users/sirinx/sirinx-os` | Stopped |
| `scribe` | Memory | Obsidian, Notion, Drive, runbook hygiene | `/Users/sirinx/sirinx-os` | Stopped |

Commands:

```bash
hermes profile list
hermes profile show shogun
shogun chat
```

## 47-Role Roster

The full 47-role roster is tracked in the local Command Center API as a registry. Only the first 12 roles are active Hermes profiles. The remaining roles are virtual lanes that can be promoted later when workload justifies a real profile.

| Range | Role type | Runtime |
| --- | --- | --- |
| 1-12 | Core delivery and control roles | Active Hermes profiles |
| 13-24 | Security, messaging, SEO, lead, finance, legal, Cloudflare | Virtual roster |
| 25-36 | GitHub, Supabase, ClickUp, Notion, Drive, creative, analytics, automation | Virtual roster |
| 37-47 | Browser QA, Codex mobile, Obsidian, customer, support, procurement, field/energy roles | Virtual roster |

Source of truth:

- `/Users/sirinx/sirinx-os/services/dev-control-api/src/agent-team.mjs`
- `GET http://127.0.0.1:8711/api/vibe-command-center`

## Connector Policy

Connectors are write-ready but still approval-gated:

- GitHub: read first; commit, push, label, and PR writes need target approval.
- Supabase: inspect first; migrations and data writes need approved migration plan.
- Notion/Google Drive/ClickUp: write only to an approved target page, folder, or list.
- Figma/Canva/Presentations/Documents/Spreadsheets: create assets only from an approved brief and target.
- Browser/Chrome/Computer Use: inspection and local verification only unless a risky UI action is approved.
- Telegram/LINE: blocked until a valid recipient target is confirmed and smoke send succeeds.

## Old Gates Mapped

| Gate | Owner | Status | Next action |
| --- | --- | --- | --- |
| Codex Mobile QR/MFA | `mobilecodex` | Manual gate | User scans QR and completes MFA/SSO |
| Telegram/LINE target | `messenger` | Blocked target fix | Confirm deliverable chat/channel |
| Solis consent/API setup | `solis` | Approval gate | Collect consent, credentials, station mapping |
| GitHub public website PR | `github` | Review gate | Review and merge only after acceptance |
| SEO/AEO/PageSpeed | `qa` | Ready | Run protected branch audit and fixes |
| Lead backend monitoring | `backend` | Active monitor | Monitor without duplicate production leads |
| Obsidian brain recording | `scribe` | Active local | Store concise decisions and evidence only |

## Safety Boundaries

- Do not start per-profile gateways until token/channel strategy is reviewed.
- Do not send Telegram/LINE messages until delivery target is fixed.
- Do not expose Hermes, MCP, local AI, or Command Center publicly without Cloudflare Access planning.
- Do not print or store `.env`, token, cookie, passkey, or customer private values.
- Do not store raw chat logs as memory.
- Do not alter the public homepage unless a later task explicitly targets public website changes.
