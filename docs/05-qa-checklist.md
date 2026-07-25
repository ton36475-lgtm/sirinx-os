# 05 — Hermes System QA Checklist

**Audit date:** 2026-07-24
**Audit type:** Full Autonomous QA-Engineering Swarm (spec-first, read-only)
**Reference frameworks:** OpenManus (FoundationAgents), OpenWorker (Andrew Ng)
**Audit roles:** Environment Scanner · QA Guardrail · QA Engineering · Reporter
**Mode:** READ-ONLY — no service restarts, no pushes, no MCP reloads, no provider calls

---

## 0. Executive verdict

| Domain | Status | Score |
|---|---|---|
| A2A mesh liveness (8 ports) | ✅ PASS | 7/8 A2A-conformant, 8788 MCP-bridge by design |
| launchd services | ✅ PASS (2 prior-exit warnings) | 8/8 services live with PIDs |
| Secret hygiene | ✅ PASS — CLEAN | 0 matches across 2,767 tracked files |
| Git hygiene | ✅ PASS | 3/4 repos clean; sirinx-os churns 1 runtime file |
| Python syntax/import | ✅ PASS | 3/3 critical files parse + import OK |
| Agent loop | ✅ PASS | 23/23 ticks complete, 0 errors |
| Test coverage | ⚠️ WARN — **fragmented** | project-hermes: 43 tests; sirinx-os: 0 main + 50 stranded; sovereign-swarm: 28 disciplined; agent-native-os: 20+7 orphaned |
| CI automation | ❌ FAIL — **none of the 4 repos has CI** | 0/4 `.github/workflows/ci.yml` |
| A2A queue durability | ⚠️ WARN — **spec vs impl gap** | File-backed queue spec'd but only in-memory implemented |
| MCP tool wiring | ⚠️ WARN | `telegram_sync` not registered in `mcp_servers:` block |

**Net:** System is **live and healthy** in dry-run/stub mode. The hard problems (mesh, safety boundaries, launchd persistence) are solved. The soft problems are **quality engineering gaps**: no CI, fragmented tests, spec/impl drift, one plaintext API key.

---

## 1. A2A Mesh Smoke Test

| Port | Service | /health | agent-card.json | /rpc SendMessage | Verdict |
|---|---|---|---|---|---|
| 9000 | a2a-server (router) | 200 — `tasks:0` | 200 — 6 downstream cards advertised | 200 — `dry_run:true` + audit_hash | ✅ LIVE |
| 9001 | Codex (Deep Reasoning) | 200 — `tasks_received:5` | 200 — fields present, `STUB_LIVE_DRY_RUN` | 200 — `mode:"stub-dry-run"` | ✅ LIVE |
| 9002 | Antigravity (Speed Exec) | 200 — `tasks_received:1` | 200 — fields present | 200 — `mode:"stub-dry-run"` | ✅ LIVE |
| 9003 | WebMCP (Browser Auto) | 200 — `tasks_received:1` | 200 — fields present | 200 — `mode:"stub-dry-run"` | ✅ LIVE |
| 9004 | Planner (Strategy) | 200 — `tasks_received:5` | 200 — fields present | 200 — `mode:"stub-dry-run"` | ✅ LIVE |
| 9005 | SovereignSwarm | 200 — `{"ok":true,"live":false}` | 200 — fields present, v0.2.0 | 200 — governance gate + dry-run | ✅ LIVE |
| 9006 | LineSecretary | 200 — `send_blocked:true` | 200 — fields present, `CONTRACT_OK_GATEWAY_LIVE` | 200 — `contract:"L1-validated"` | ✅ LIVE |
| 8788 | manus-mcp-bridge | 200 | **404** (MCP, not A2A — by design) | **404** | ⚠️ WARN (expected) |

**Mesh router advertises 8/8 ports live.** All A2A-conformant endpoints accept SendMessage and confirm `dry_run:true`.

---

## 2. Service Process Map

| PID | Service | Owner | KeepAlive | Notes |
|---|---|---|---|---|
| 86674 | hermes_cli solis gateway | launchd `ai.hermes.gateway-solis` | true | prior exit 75, now stable |
| 71366 | a2a_server :9000 | launchd `ai.sirinx.a2a-server` | `SuccessfulExit:false` | prior exit -15 (SIGTERM, likely restart) |
| 33929 | agent_stubs :9001-9004 | launchd `ai.sirinx.a2a-stubs` | true | clean |
| 25131 | sovereign a2a-gateway.mjs :9005 | launchd `ai.sirinx.sovereign-swarm` | true | clean |
| 25134 | line-secretary-a2a.mjs :9006 | launchd `ai.sirinx.line-secretary` | true | clean |
| 2626 | manus-mcp-bridge :8788 | launchd `ai.sirinx.manus-mcp-bridge` | true | clean |
| 71035 | agent_loop.sh (60s tick) | tmux `sirinx-a2a-team` | — | running, 23/23 ticks complete |

**Dormant:** `ai.hermes.gateway` plist exists but is NOT loaded (solis is the active profile). **Verify intent.**

---

## 3. Secret & Diff Hygiene

| Repo | Tracked files scanned | Secret matches | Uncommitted files |
|---|---|---|---|
| project-hermes | 634 | **0** | 0 |
| sirinx-os | 1,503 | **0** | 1 (`memory/live/runtime/pulses.jsonl` — runtime churn) |
| sirinx-sovereign-swarm | 136 | **0** | 0 |
| sirinx-agent-native-os | 494 | **0** | 0 |

**Total: 2,767 files scanned, 0 secrets.** Patterns: `sk-…`, `xox[bapr]-…`, `gh[pousr]_…`, `AIza…35`, `-----BEGIN PRIVATE KEY-----`.

⚠️ **One plaintext API key** in `~/.hermes/config.yaml` (`ccsk-acbf5e49…`) — file is `chmod 600` but key is on disk rather than via `key_env`. **Low severity** (local-only config, not tracked in any repo).

---

## 4. Test Coverage Matrix

| Repo | Own-code test files | Runner | CI | Config files |
|---|---|---|---|---|
| project-hermes | 43 Python (42 in `tests/` + 1 root) | pytest/unittest (bare) | **none** | **none** (no pytest.ini/conftest) |
| sirinx-os | ~1 scratch TS + **50+ stranded in worktrees** | vitest (scratch only) | **none** | **none** in main |
| sirinx-sovereign-swarm | 28 `.test.mjs` + fixtures/helpers | `node --test` (12 sprint gates) | **none** | package.json only |
| sirinx-agent-native-os | 20 TS (vitest) + 2 `.test.mjs` + 1 Python + **7 orphaned .pyc** | vitest + node --test + pytest | **none** | public-web/package.json only |

### Critical untested services (project-hermes)

| Service | Location | Coverage |
|---|---|---|
| A2A server :9000 | `a2a_server/server.py` | **NONE direct** (referenced indirectly by smoke tests) |
| `agent_loop.sh` | `a2a_server/agent_loop.sh` | **NONE** (`test_agent_loop_system.py` tests a Python module, not this bash script) |
| `hermes_pipeline.py` | `hermes_pipeline.py` | **NONE** |
| `a2a_team_coordinator.py` | `a2a_team_coordinator.py` | **NONE direct** (only transitive via ObsidianChromaSync) |
| `telegram_sync.py` | `mcp_server/tools/telegram_sync.py` | **PARTIAL** — only parser tested (`parse_telegram_command`); IO/sync untested |

### Stranded tests (sirinx-os)

GhostClaw A2A test suite (~50+ tests across `test_ghostclaw_a2a_ack_dispatch_execute.py`, `test_ghostclaw_a2a_agent_orchestrator.py`, `test_ghostclaw_a2a_queue_coordinator.py`) exists **only in worktree branches** (`.worktrees/claude/`, `.worktrees/ghostclaw-durable-outbox-admission-20260724/`). Main checkout has 4 empty stub dirs (`tests/{e2e,integration,regression,security}/`).

### Orphaned test bytecodes (sirinx-agent-native-os)

7 Python test sources deleted but `.pyc` remain in `__pycache__`:
- `tests/a2a/test_local_codex_kob_manus_sync.py`
- `tests/a2a/test_project_os_status.py`
- `tests/autopilot/test_autopilot_policy_core.py`
- `tests/ghostclaw_runner/test_agent_runner.py`
- `tests/ghostclaw_runner/test_runner_status_fixture.py`
- `tests/model_eval/test_glm52_ui_review_benchmark.py`
- `scripts/models/glm52_api_smoke_test.py`

---

## 5. Agent Loop Health

Log: `/Users/sirinx/project-hermes/data/agent_loop.log`

- **Errors / tracebacks:** none (grep over 500 last lines empty)
- **Tick interval:** target 60s, observed 64–87s (avg ~67s) — bounded drift
- **Dropped ticks:** 0 of 23
- **Repos failing commit/push:** none
- **Churn warning:** `sirinx-os/memory/live/runtime/pulses.jsonl` is dirty → committed → dirty on every tick (self-sustaining commit churn). **Recommend:** gitignore the runtime pulses file or move it outside the repo.

---

## 6. A2A Queue Spec vs Implementation

**Spec** (`docs/superpowers/specs/2026-07-17-hermes-routing-status-boundary.md`): file-backed queue `_A2A_QUEUE/{inbox,assigned,approvals,archive}`.

**Implementation** (`a2a_server/server.py`): tasks held **in-memory** only. The queue directories **do not exist on disk**. `/health` reports `tasks:0` / `tasks_received:N` counters, not file-backed state.

**Verdict:** spec/impl gap — durability contract not yet honoured. Low severity in dry-run mode; will become a real bug when live execution is enabled.

---

## 7. Environment Anomalies

| # | Severity | Finding |
|---|---|---|
| 1 | HIGH | `/Users/sirinx/sirinx-co` does not exist — path referenced but directory missing |
| 2 | HIGH | `ai.sirinx.a2a-server` prior exit -15 (SIGTERM) — recovered, investigate `StandardErrorPath` |
| 3 | HIGH | `ai.hermes.gateway` plist exists but NOT loaded (only `gateway-solis` running) |
| 4 | MED | Python split: project-hermes `.venv` = 3.14.5, hermes_cli gateway = 3.12.13 — two majors coexist |
| 5 | MED | `~/.hermes/.venv` does not exist; gateway runs from `~/.hermes/hermes-agent/venv` (docs assumption stale) |
| 6 | MED | `telegram_sync.py` NOT registered as MCP server in `~/.hermes/config.yaml` — only `hyperresearch-safe-mcp` listed |
| 7 | MED | `python3 -m hermes_cli` not importable from project-hermes (only via shim or hermes-agent venv) |
| 8 | LOW | Plaintext `ccsk-…` key in `~/.hermes/config.yaml` (chmod 600 but not via `key_env`) |
| 9 | LOW | `sirinx-agent-native-os` remote points to `sirinx-co.git` (dir/remote name mismatch) |
| 10 | LOW | `sirinx-agent-native-os` on feature branch `feat/sirinx-web-line-trust-v1` (3 others on main) |

---

## 8. OpenWorker / OpenManus pattern borrow list

Borrowed from Andrew Ng's **OpenWorker** (local-first, approval-gated):

| Pattern | OpenWorker | Hermes today | Action |
|---|---|---|---|
| Approval-gated writes/sends/shell | writes/sends/shell gated by per-launch token + inbox queue | `live_send=false`, `SOVEREIGN_LIVE=false`, `SIRINX_LINE_SEND_BLOCKED=true` — already gated | ✅ aligned |
| Per-launch in-memory token (never on disk) | desktop uses in-memory launch token | launchd plists have no per-launch auth token | **borrow**: add ephemeral launch token to A2A `/rpc` |
| Unattended inbox queue | consequential actions queue to inbox | **in-memory only**, no file-backed durability | **borrow**: implement `_A2A_QUEUE` spec |
| Finished deliverable, not instructions | loop returns work product | loop returns Telegram reply text | partial |
| Recurring scheduled tasks | native scheduler | tmux 60s tick | equivalent |
| `pytest` + hermetic e2e | enforced | **no CI anywhere** | **borrow**: GitHub Actions matrix |

Borrowed from **OpenManus** (FoundationAgents):

| Pattern | OpenManus | Hermes today | Action |
|---|---|---|---|
| `ToolCollection` registry | clean registry pattern | tool list hardcoded in `telegram_sync.py` HUB_COMMANDS | consider extracting registry |
| `BrowserUseTool` lifecycle | browser-use lib lifecycle | webmcp-node :9003 stub only | port lifecycle when webmcp goes live |
| Unstable multi-agent flag | explicitly flags `run_flow.py` as unstable | A2A mesh is stable, no flag needed | n/a |

---

## 9. QA Action Plan (priority order)

### P0 — blocking for any "live" promotion

1. **Implement file-backed `_A2A_QUEUE`** (inbox/assigned/approvals/archive) per the routing spec. Without durability, live execution loses state across restarts. **Repo:** project-hermes.
2. **Investigate `ai.sirinx.a2a-server` SIGTERM** — check `StandardErrorPath` in plist + `~/Library/Logs/`. If crash-on-start, root-cause before any live push.
3. **Decide `ai.hermes.gateway` plist intent** — load it or delete it. Dormant plists create drift.

### P1 — quality engineering debt

4. **Add `.github/workflows/ci.yml` to all 4 repos.** Matrix: lint + pytest (project-hermes), `node --test` (sovereign-swarm), vitest (agent-native-os), TS check (sirinx-os). Currently **0/4 repos have CI**.
5. **Write 4 missing test files** for project-hermes critical services: `test_a2a_server.py`, `test_hermes_pipeline.py`, `test_a2a_team_coordinator.py`, `test_agent_loop_sh.bats`.
6. **Merge stranded GhostClaw suite** from `.worktrees/*/WORKSPACE_SCAFFOLD/tests/` into sirinx-os main `tests/` + add `conftest.py` + `pytest.ini`.
7. **Restore 7 orphaned Python tests** in sirinx-agent-native-os or delete orphan `__pycache__`.
8. **Add `pytest.ini` + `conftest.py`** to project-hermes so tests don't rely on per-file `sys.path` hacks.

### P2 — hardening

9. **Register `telegram_sync` in `~/.hermes/config.yaml` `mcp_servers:`** block — currently only `hyperresearch-safe-mcp` is wired.
10. **Move `pulses.jsonl` out of sirinx-os repo** (or gitignore it) to stop agent-loop commit churn.
11. **Move `ccsk-…` key to `key_env`** in `~/.hermes/config.yaml` (use macOS Keychain or env var).
12. **Resolve sirinx-co path/remote mismatch** — either clone sirinx-co or rename `sirinx-agent-native-os` remote.
13. **Pin Python version** — either bump hermes_cli to 3.14 or pin project-hermes venv to 3.12 to close the version split.

### P3 — borrowed patterns

14. **Per-launch in-memory token** for A2A `/rpc` (OpenWorker pattern) — gates write/send/shell behind ephemeral token.
15. **Extract `ToolCollection` registry** from HUB_COMMANDS (OpenManus pattern) for cleaner tool discovery.

---

## 10. Required approval gate

Per `sirinx-spec-first-swarm` skill, this audit is **read-only and complete**. The P0/P1/P2 action items above are **proposed specs** — they require:

```
APPROVE_IMPLEMENTATION
```

…before any source-code change, package install, MCP reload, provider call, deploy, push, or publish.

No implementation has been started.

```
HERMES SPEC-FIRST SWARM READY - LIVE LOCAL STATE - WAITING FOR APPROVE_IMPLEMENTATION
```
