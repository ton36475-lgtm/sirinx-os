# NEXT_ACTIONS.md - GHOSTCLAW_LOOP_ENGINEERING V1.1

## งานที่ทำแล้ว ✅

### Phase 1A - Agent Registration SQL ✅
- File: `services/dev-control-api/seed/ghostclaw-agents.sql` - DONE

### Phase 1B - API Routes ✅
- File: `services/dev-control-api/routes/agents.ts` - DONE

### Phase 1C - UI Integration ✅
- File: `apps/live-agent-studio/src/hooks/useAgents.ts` - DONE

### Phase 2A - Prisma Schema ✅
- File: `prisma/schema.prisma` - DONE

### Phase 2B - Controllers ✅
- File: `services/api-gateway/controllers/ghostclaw-controllers.ts` - DONE

### Phase 2C - Components ✅
- File: `apps/live-agent-studio/src/components/GhostClawComponents.tsx` - DONE

### Phase 2D - Orchestrator ✅
- File: `services/dev-control-api/orchestrator/ghostclaw-orchestrator.ts` - DONE

### Phase 2E - Tests ✅
- File: `tests/ghostclaw.test.ts` - DONE

### Phase 2F - CI/CD ✅
- File: `.github/workflows/ghostclaw-pipeline.yml` - DONE
- File: `infra/docker/ghostclaw-staging.yml` - DONE

### Phase 2G - Monitoring ✅
- File: `services/dev-control-api/monitoring/ghostclaw-monitoring.ts` - DONE

### Phase 2H - Security ✅
- File: `security/ghostclaw-security.md` - DONE

### Phase 2I - Documentation ✅
- File: `docs/GHOSTCLAW_BLUEPRINT.md` - DONE

## งานค้างอยู่

## Operating Queue Contract

- This file is the strict ordered queue for local review.
- Approval-Gated actions remain closed until exact human approval: database connection, migration, staging deploy, push, external writes, live sends, provider calls, package install, public tunnel, secret reads, and customer data storage.
- Keep local-safe work limited to docs, tests, queue/status snapshots, and review packets unless a gate-specific approval names one target, environment, rollback path, and evidence path.

### Phase 3A - Enable Database Connection
- Action: Set DATABASE_URL in .env
- Command: `npx prisma migrate dev --name ghostclaw_agents`

### Phase 3B - Run Tests
- Command: `pnpm test`

### Phase 3C - Staging Deploy
- Action: Enable after approval
- Requires: All tests pass, security scan pass

## Safety Gate Status
- ✅ No secrets written
- ✅ No push/deploy
- ✅ All files local stubs
- ✅ Frontend/Backend decoupled, ready for integration
- ✅ Security hardening complete
- ✅ Monitoring in place

## GhostClaw Knowledge Integration - 2026-07-02 ✅

**Mission:** GHOSTCLAW-KNOWLEDGE-INTEGRATION-20260702-001
**Status:** DONE

**Created:**
- `.ghostclaw/registry/project-registry.v1.yaml`
- `.ghostclaw/registry/agent-registry.v1.yaml`
- `.ghostclaw/registry/knowledge-vault-index.v1.yaml`
- `.ghostclaw/registry/route-matrix.v1.yaml`
- `.ghostclaw/registry/domain-pack-index.v1.yaml`
- `.ghostclaw/schemas/` (4 JSON schemas)
- `docs/GHOSTCLAW_UNIFIED_PROJECT_OPERATING_SYSTEM.md`
- `docs/KNOWLEDGE_VAULT_RETRIEVAL_PROTOCOL.md`
- `docs/PROJECT_DOMAIN_PACKS.md`
- `docs/MASTER_PLAN_INTEGRATION_MAP.md`
- `docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md`
- `scripts/ghostclaw_registry_validate.py`
- 10 project queue folders under `.ghostclaw_runtime/a2a2a/project_queues/`
- A2A2A inbox queue item

**Next Recommended Actions:**
1. Run `python3 scripts/ghostclaw_registry_validate.py --root /Users/sirinx/sirinx-os` to validate all registries
2. Create agent-specific workspace queue items per project
3. Seed project queue items for active projects (ghostclaw-os, sirinx-site, agm)
4. Begin using retrieval protocol for all new tasks instead of full-memory-dump

## Mac mini M2 AI CLI Integration - 2026-07-02 ✅ (Doc Phase)

**Mission:** GHOSTCLAW-MAC-M2-AI-CLI-INTEGRATION-20260702-001
**Status:** DOC-PHASE DONE — Install phase pending human gate approval

**Created:**
- `docs/MAC_M2_AI_CLI_INSTALL_UPDATE_RECEIPT.md` (D-tier install gate packet)
- `docs/AI_CLI_TUI_OPERATOR_RUNBOOK.md`
- `docs/CODEX_CLAUDE_CODE_LOCAL_WORKFLOW.md`

**Blocked (require explicit human gate):**
- Codex CLI standalone install via `curl | bash`
- Claude Code CLI standalone install via `curl | bash`
- `npm install -g` / `brew install` fallback
- Home-directory mutation (`~/.codex`, `~/.claude`, `~/.zshrc`)
- Multi-repo scanner across `/Users/sirinx`

**Next:** Human operator reviews `GATE-INSTALL-001-20260702-001`, approves, and runs the install steps manually on Mac mini. Then return receipt to `.ghostclaw_runtime/a2a2a/receipts/`.

## GhostClaw Coding Model Router Pack V2.1 - 2026-07-02 ✅

**Mission:** GHOSTCLAW-MODEL-ROUTER-V2-1-INSTALL-001
**Status:** DONE

**Installed:**
- `AGENTS_MODEL_ROUTER_ADDENDUM.md` / `CLAUDE_MODEL_ROUTER_ADDENDUM.md`
- `config/model-router/` (4 files)
- `docs/model-routing/` (7 files)
- `schemas/ghostclaw/model_router_receipt.schema.json`
- `skills/coding-model-router/SKILL.md`
- `.claude/agents/*.md` (6 subagents)
- `.codex/config.toml.example`
- `scripts/validate_model_router_pack.py`, `scripts/model_router_dry_run.py`
- `commands/model-router/`
- `.env.example` appended

**Validated:**
- `python3 scripts/validate_model_router_pack.py` → OK
- `python3 scripts/model_router_dry_run.py --tier T1 --project ghostclaw --task "test model router"` → OK

**Next Recommended Actions:**
1. Review `AGENTS_MODEL_ROUTER_ADDENDUM.md` and `CLAUDE_MODEL_ROUTER_ADDENDUM.md`
2. Add real API keys only to local `.env`, never commit
3. Test T0/T1 dry-runs with local Qwen or laguna free coder
4. Wire `config/model-router/hermes_model_router.config.yaml` into Hermes dispatcher
5. Use `skills/coding-model-router/SKILL.md` for repeated model-router workflows

## Codex Task Queue Seeding - 2026-07-02 ✅

**Mission:** GHOSTCLAW-CODEX-TASK-QUEUE-SEED-20260702-001
**Status:** DONE

**Created:** 13 high-level Codex task queue YAML files in `.ghostclaw_runtime/a2a2a/project_queues/`

**Active project lanes seeded:**
- `ghostclaw_os/` — 4 tasks (core control plane, registry validator, knowledge retrieval worker, queue coordinator)
- `sirinx_site/` — 2 tasks (public guardian, ROI calculator)
- `merch_dashboard/` — 2 tasks (automation dashboard, QC validator)
- `research/` — 2 tasks (reverse engineering, competitor research)
- `agm/`, `ads_andromeda/`, `kusala/`, `phitsanulok_news/`, `creative_assets/`, `local_business/` — 1 task each

**Next Recommended Actions:**
1. Codex picks up `TASK-001-ghostclaw-os-core-control-plane.yaml` first (highest priority)
2. Codex picks up `TASK-001-sirinx-site-public-guardian.yaml` second
3. Parallel creative lanes can start when builder is available
4. Update task statuses from `pending` → `active` → `done` as work progresses
