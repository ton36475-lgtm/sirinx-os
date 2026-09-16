# Project Domain Packs

## What is a Domain Pack?

A domain pack is a compact set of project-specific rules, constraints, design tokens, brand text, and build order that agents must follow when working on that project. Domain packs live in `.ghostclaw/domain-packs/` and are indexed by `.ghostclaw/registries/domain-pack-index.v1.yaml`.

## Index

- [GhostClaw OS](#ghostclaw-os)
- [SIRINX Solar Carport Website](#sirinx-solar-carport-website)
- [Hermes Commander](#hermes-commander)
- [Codex Build Captain](#codex-build-captain)
- [SIRINX AI HQ](#sirinx-ai-hq)
- [SIRINX Dev Dashboard](#sirinx-dev-dashboard)
- [Obsidian Brain Sync](#obsidian-brain-sync)
- [LatentMAS](#latentmas)
- [OpenCode MaxPlus Runbook](#opencode-maxplus-runbook)
- [A2A2A Protocol](#a2a2a-protocol)
- [Policy Guardian](#policy-guardian)
- [Reverse Engineering Workflow](#reverse-engineering-workflow)
- [Phitsanulok United News](#phitsanulok-united-news)
- [Local Business Promo Pack](#local-business-promo-pack)
- [MCP Connector Map](#mcp-connector-map)

---

### GhostClaw OS

- **Role**: Operating system layer for all agent operations
- **Priority**: P0 — must bootstrap first
- **Core Rules**:
  - Never load full knowledge base into context
  - Registry is source of truth; sidebars are UI only
  - Every mutation requires lease; every task requires receipt
  - No cross-file blind replacement
- **Constraints**:
  - Must maintain backward compatibility with existing agent workflows
  - All registries are YAML v1
  - Runtime directory is `.ghostclaw_runtime/`
- **Related File Paths**:
  - `.ghostclaw/registries/`
  - `.ghostclaw/domain-packs/`
  - `.ghostclaw_runtime/`

---

### SIRINX Solar Carport Website

- **Role**: Public-facing marketing and dashboard website for solar carport monitoring
- **Priority**: P1
- **Core Rules**:
  - Must use Tailwind theme from existing project config
  - All copy must match brand guide in domain pack
  - No hardcoded API keys or endpoints
- **Constraints**:
  - Next.js app in `/sites/sirinx-solar-carport/`
  - No server-side secrets in client bundle
  - Must be responsive (mobile-first)
- **Design Tokens**:

```css
--color-primary: #00e5a0;
--color-secondary: #0a1a2f;
--color-accent: #ff6b35;
--color-bg: #f0fdf4;
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
```

- **Known Brand Copy**:

> "Solar intelligence for the modern grid."
> "Monitor. Manage. Maximize."
> "Real-time solar carport monitoring and energy analytics."

- **Build Order**: Design mockup -> Component tree -> Page shells -> Data integration -> Polish
- **Related File Paths**:
  - `sites/sirinx-solar-carport/`
  - `docs/solar-energy-intelligence-phase-1.md`

---

### Hermes Commander

- **Role**: Command intake, task routing, queue management, memory sync, final report generation
- **Priority**: P0
- **Core Rules**:
  - Hermes owns the A2A2A inbox and outbox
  - Hermes routes tasks based on route matrix, not guesswork
  - Hermes never mutates source files directly
  - Hermes writes final reports to `.ghostclaw_runtime/reports/`
- **Constraints**:
  - Must validate task_type against route matrix before routing
  - Must check policy guardian for D-tier tasks before queueing
  - Must not skip receipt verification
- **Related File Paths**:
  - `.ghostclaw/agents/hermes/`
  - `.ghostclaw_runtime/a2a2a/`

---

### Codex Build Captain

- **Role**: Primary mutating builder for code and scripts
- **Priority**: P0
- **Core Rules**:
  - Codex is the only agent that mutates source files unless separately leased
  - Codex must always create a lease before editing
  - Codex must validate before writing receipt
  - Codex must never push, deploy, or access secrets
- **Constraints**:
  - Must work from a build packet, not from memory
  - Must run linters after changes
  - Must not edit files outside lease scope
- **Related File Paths**:
  - `.ghostclaw/agents/codex/`
  - `.ghostclaw/runbooks/codex-build-captain-workflow.md`

---

### SIRINX AI HQ

- **Role**: Central dashboard and control panel for all SIRINX AI services
- **Priority**: P1
- **Core Rules**:
  - Uses VoltAgent architecture
  - Real-time agent status display
  - Queue and receipt visualization
- **Constraints**:
  - Must not expose internal agent routing in UI
  - Must authenticate all dashboard routes
- **Related File Paths**:
  - `sites/ai-hq/`
  - `docs/ai-hq-dna.md`

---

### SIRINX Dev Dashboard

- **Role**: Internal development dashboard for monitoring system health
- **Priority**: P2
- **Core Rules**:
  - Shows runtime metrics, queue depths, and agent status
  - Read-only views into `.ghostclaw_runtime/`
- **Constraints**:
  - Local-only; no cloud deployment
  - Must not expose secrets or sensitive registry data
- **Related File Paths**:
  - `sites/dev-dashboard/`
  - `docs/dev-dashboard-runbook.md`

---

### Obsidian Brain Sync

- **Role**: Synchronize knowledge between Obsidian vault and GhostClaw knowledge vault
- **Priority**: P2
- **Core Rules**:
  - One-way sync: Obsidian -> GhostClaw knowledge vault
  - Only sync files matching allowed patterns
  - Never delete files in either direction
- **Constraints**:
  - Must preserve Obsidian frontmatter
  - Must not exceed 100 files per sync
- **Related File Paths**:
  - `docs/OBSIDIAN_BRAIN_SYNC_GUIDE.md`

---

### LatentMAS

- **Role**: Multi-agent swarm coordination system for parallel task execution
- **Priority**: P2
- **Core Rules**:
  - Agents in swarm must have isolated lanes
  - Swarm tasks must have a coordinator agent
  - All swarm outputs must go through validation
- **Constraints**:
  - Maximum 5 agents per swarm
  - No agent can approve its own work
- **Related File Paths**:
  - `docs/LatentMAS Blueprint v3.md`

---

### OpenCode MaxPlus Runbook

- **Role**: Review and QA layer; OpenCode inspects but does not mutate
- **Priority**: P1
- **Core Rules**:
  - OpenCode is review/QA only
  - Must not mutate source files under any circumstances
  - Validates receipts, leases, and build output
- **Constraints**:
  - Cannot approve its own review
  - Must report policy violations to Policy Guardian
- **Related File Paths**:
  - `docs/OPENCODE_MAXPLUS_HERMES_RUNBOOK.md`

---

### A2A2A Protocol

- **Role**: Task routing protocol for all agent-to-agent communication
- **Priority**: P0
- **Core Rules**:
  - Every task gets a queue item, lease, and receipt
  - requester_agent must never equal approver_agent
  - Queue is file-based, not in-memory
- **Constraints**:
  - Queue items are JSON
  - Leases expire after 2 hours by default
- **Related File Paths**:
  - `.ghostclaw_runtime/a2a2a/`
  - `docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md`

---

### Policy Guardian

- **Role**: Final authority on policy compliance and hard blocks
- **Priority**: P0
- **Core Rules**:
  - Policy Guardian has veto power over any action
  - Policy Guardian reviews all D-tier requests
  - Policy Guardian maintains hard block list
- **Constraints**:
  - Must respond to policy checks within 1 minute
  - Cannot delegate authority
- **Related File Paths**:
  - `.ghostclaw/policies/`

---

### Reverse Engineering Workflow

- **Role**: Research-to-build packet lane for converting verified sources into specs, architecture notes, Build Packets, validation plans, receipts, and handoffs.
- **Priority**: P1
- **Core Rules**:
  - Must follow `Source -> Verify -> Reverse_Engineer -> Spec -> Architecture -> Knowledge_Vault -> Build_Packet -> Validate -> Receipt -> Handoff`.
  - Output is a Build Packet, not live code.
  - Claims must be separated into confirmed, inferred, and unknown.
  - Every later build requires a fresh scoped file lease.
- **Constraints**:
  - No unauthorized third-party scanning.
  - No access-control bypass, credential collection, customer data, push, deploy, provider call, cloud mutation, or live send.
  - Use local validators and receipt evidence before handoff.
- **Related File Paths**:
  - `docs/reverse_engineering/`
  - `docs/specs/reverse-engineering-workflow/`
  - `openspec/changes/reverse-engineering-workflow/`

---

### Phitsanulok United News

- **Role**: Local news automation pipeline for public site, daily content drafting, Facebook draft generation, admin dashboard, and partner panel.
- **Priority**: P2
- **Core Rules**:
  - Draft only until owner approval gate is confirmed.
  - Facebook output is local preview text only; no live post or Graph API call.
  - Source intake must use public notes only in MVP.
  - Partner content must be labeled and reviewed before public use.
- **Constraints**:
  - No customer data ingestion.
  - No deploy, paid API call, external publish, or live outreach.
  - Admin and partner panels are local stubs until a later gated integration.
- **Related File Paths**:
  - `apps/phitsanulok-news/`
  - `services/news-api/`
  - `packages/types/phitsanulok-news/`

---

### Local Business Promo Pack

- **Role**: Public marketing prompt and text-lock system for selected local business visual assets.
- **Priority**: P3
- **Core Rules**:
  - Exact Thai/public text locks are mandatory.
  - Public marketing only; no hidden backend info.
  - One poster prompt and one social prompt per project.
  - Thai text QA must pass before paid generation or public posting.
- **Constraints**:
  - No fake chat UI.
  - No cyberpunk, cartoon, or anime style unless a later owner-approved packet explicitly requests it.
  - No paid generation, customer send, or public posting without a separate gate.
- **Related File Paths**:
  - `prompts/local-business/`
  - `packages/asset-registry/local-business/`
  - `docs/creative/LOCAL_BUSINESS_PROMO_ASSET_FACTORY.md`

---

### MCP Connector Map

- **Role**: Registry of MCP (Model Context Protocol) server connections
- **Priority**: P2
- **Core Rules**:
  - All MCP endpoints must be documented in connector map
  - No unregistered MCP servers can be called
  - Secrets for MCP auth are never stored in registry
- **Constraints**:
  - Only localhost and approved endpoints allowed
  - Must verify TLS for remote connections
- **Related File Paths**:
  - `docs/mcp-and-connector-map.md`
