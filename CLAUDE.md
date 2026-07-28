# Claude Code Context: SIRINX OS Hermes Dashboard

Follow `AGENTS.md` as the canonical operating protocol for this repository. `AGENTS.md`
is the full operational constitution (safety rules, autonomy levels, release gates,
system map, agent workforce, PR roadmap, etc.) — this file is the condensed,
Claude-specific quick reference. If anything here conflicts with `AGENTS.md`, `AGENTS.md`
wins.

## What This Repo Is

`sirinx-os` (package name `sirinx-os`, private pnpm/turbo monorepo) is the SIRINX OS
"Full-Stack Agentic Production Platform" scaffold — currently in **Production
Hardening** mode (per `AGENTS.md` / `PROJECT_STATE.md`), not yet approved for real
production traffic. Everything runs local-only and dry-run by default until a human
explicitly approves an external action.

## AGENTS.md Key Rules (summarized)

`AGENTS.md` (verified present, ~2300 lines) governs agent behavior. Highlights:

- **Workflow every task must follow:** `Inspect -> Plan -> Implement -> Verify -> Report -> Commit Ready`,
  framed as `Goal / Constraints / File Scope / Expected Result / Verification / Report Format`.
- **Hard safety rules (never do without explicit human approval):** deploy, `git push`,
  mutate cloud resources, edit real `.env` files (only `.env.example` may be touched),
  create/expose real secrets or credentials, send real customer messages, trigger paid
  APIs, expose local AI (Ollama/llama.cpp/LM Studio) publicly, run destructive MCP tools,
  render/export in After Effects, make guaranteed ROI/savings/no-ban/zero-downtime claims,
  or run arbitrary shell from free text / scan third-party systems.
- **Instruction hierarchy:** platform safety rules > current user task > `AGENTS.md` >
  scoped folder instructions > `PROJECT_STATE.md` > `RELEASE_GATE.md` > source files >
  docs/KMS/prompts > long-term memory. Stricter rule wins on conflict.
- **Pipeline vs Agent doctrine, autonomy levels (A0–A7), tool permission tiers (T0–T8),
  14 release gates, memory classes (M0–M4), cost guard defaults, and system readiness
  levels (SRL-0…SRL-9)** are all defined in full there — consult it directly for details
  rather than assuming specifics.
- Companion operating files it points to: `RULES_FOR_CODEX.md`, `PROJECT_STATE.md`,
  `NEXT_ACTIONS.md`, `RELEASE_GATE.md`, `VALIDATION_MATRIX.md`, `HANDOFF_PROTOCOL.md`,
  `KNOWN_ISSUES.md`, `README.md`, `.env.example`.

## Default Workflow

```text
Inspect -> Plan -> Implement -> Verify -> Report -> Commit Ready
```

Do not deploy, push, mutate cloud resources, send customer messages, expose local AI
services publicly, or change real secrets without explicit human approval.

## Repository Structure (verified)

This is a pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `services/*`, `packages/*`)
orchestrated with Turborepo (`turbo.json`: `dev`, `verify`, `build` tasks).

```text
sirinx-os/
├── AGENTS.md, CLAUDE.md, PROJECT_STATE.md, RULES_FOR_CODEX.md, NEXT_ACTIONS.md,
│   RELEASE_GATE.md, VALIDATION_MATRIX.md, HANDOFF_PROTOCOL.md, KNOWN_ISSUES.md,
│   README.md, MCP_MAP.md, SKILLS_REGISTRY.md, TOOLS_REGISTRY.md,
│   RUNBOOK_LIVE_START.md
├── .claude/            ← agents/, skills/, mcp.json (see below)
├── apps/
│   ├── dev-dashboard/          ← Hermes Developer Command Center UI (port 8710)
│   ├── agm-autoglow-dashboard/
│   ├── agm-autoglow-extension/
│   ├── centerbrain-shell/
│   ├── cloudflare-agent-team/
│   ├── sirinx-site/
│   └── solar-intelligence/
├── services/
│   ├── dev-control-api/        ← Control API backing the dashboard (port 8711)
│   └── hermes-api/             ← Hermes inbox / adaptive command gateway
├── packages/
│   ├── async-core, autoglow-core, clawforge-adapter, content-factory, policy-core
├── docs/                ← runbooks, department docs, knowledge base, agents/, approvals/, cloudflare/, integrations/, migrations/, research/, superpowers/
├── scripts/             ← automation scripts (dashboard, gates, audits, checks)
├── infra/               ← Cloudflare workers (main-router), infra config
├── tests/               ← tests/browser (Playwright specs)
├── 00_COMMAND_CENTER/, GHOSTCLAW/, _OBSIDIAN_GHOSTCLAW_BRAIN/, brain/, config/,
│   councils/, devtools/, examples/, ollama/, policies/, prompts/, tools/, vault/
└── (root) package.json, pnpm-workspace.yaml, turbo.json, playwright.config.mjs,
    vitest.config.mjs, tsconfig.base.json, .env.example
```

Note: this repo has grown well beyond just the Hermes dashboard scaffold — it now also
hosts an AGM Autoglow browser-extension + dashboard, a Cloudflare agent team app, a
CenterBrain shell app, a solar-intelligence app, and a `hermes-api` service, plus a large
number of root-level knowledge/ops files (`00_COMMAND_CENTER/`, `GHOSTCLAW/`,
`_OBSIDIAN_GHOSTCLAW_BRAIN/`, `brain/`, `councils/`, `vault/`, etc.) not reflected in the
original scaffold docs. Treat the Hermes dashboard as this file's primary focus, but be
aware of the wider tree when a task's file scope extends beyond it.

## Hermes Dashboard Targets

- Dashboard app: `apps/dev-dashboard` (`node server.mjs`, `package.json` scripts: `dev`, `verify`)
- Control API: `services/dev-control-api` (`node server.mjs`, `package.json` scripts: `dev`, `verify`)
- Dashboard URL: `http://127.0.0.1:8710`
- API health: `http://127.0.0.1:8711/health`
- Both are started/stopped via `scripts/run-dev-dashboard.sh`, which runs each in its own
  `tmux` session (`sirinx-dev-control-api`, `sirinx-dev-dashboard`) with logs in
  `ops/logs/` — confirmed current and matching `docs/hermes-coding-team-runbook.md`.

## Start And Verify

```bash
pnpm dashboard:run       # ./scripts/run-dev-dashboard.sh start
pnpm dashboard:status    # ./scripts/run-dev-dashboard.sh status
pnpm dashboard:e2e       # playwright test (tests/browser/dev-dashboard.spec.mjs)
pnpm dashboard:stop      # ./scripts/run-dev-dashboard.sh stop
pnpm verify              # repo-wide node --check / operating-files / test sweep
```

Other useful root scripts (see `package.json` for the full, long list — it now covers
dozens of subsystems: cost guard, SOC monitor, external gates, lead/CRM contracts,
Hermes agent audit, OpenRouter adapters, Autoglow, CenterBrain, Cloudflare router, etc.):
`pnpm stack:start` / `stack:status` (broader local stack), `pnpm hq:status`,
`pnpm night-watch`, `pnpm audit:secrets`, `pnpm verify:workspace`.

Detailed runbook: `docs/hermes-coding-team-runbook.md` (confirmed present and current —
also documents the Codex Mobile pairing flow, VS Code tasks, and the agent-team prompt
below).

## Recommended Agent Roles

Project-local subagents defined in `.claude/agents/` (all confirmed present):

- `hermes-project-planner`
- `hermes-frontend-builder`
- `hermes-backend-integrator`
- `hermes-browser-automator`
- `hermes-devops-runner`
- `hermes-code-reviewer`

Project-local skills in `.claude/skills/` (confirmed present): `hermes-project-planning`,
`website-browser-automation`, `start-run-debug`, `agent-team-orchestration`.

For bigger work, create an agent team with planner, frontend, backend, browser, devops,
and reviewer teammates. Require plan approval before implementation and split work by
file ownership. First inspect `AGENTS.md`, `CLAUDE.md`, `package.json`,
`apps/dev-dashboard`, `services/dev-control-api`, and `tests/browser`. Verify with
`pnpm verify` and `pnpm dashboard:e2e`.
