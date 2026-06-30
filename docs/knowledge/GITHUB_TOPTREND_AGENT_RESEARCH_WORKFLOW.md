# GitHub Toptrend Agent Research Workflow

**Part of:** GHOSTCLAW Research Worker (Phase 11)
**Status:** ACTIVE
**Mode:** public_metadata_only

---

## 1. Overview

The GitHub Toptrend Research Worker uses GitHub public repository metadata as research input for GHOSTCLAW. It is not an install lane. It never clones, installs, or executes trending repository code.

The worker operates under the Zero Prompting workflow: tasks are dispatched as structured Mission Cards with explicit allowed/blocked action lists.

## 2. Allowed Actions

- `gh --version` availability check
- `gh auth status` readiness check without reading or printing tokens
- `gh search repos --visibility public` metadata only
- CLI fields requested: `fullName`, `description`, `stargazersCount`, `url`, `updatedAt`, `visibility`
- Stored output fields: `nameWithOwner`, `description`, `stargazerCount`, `url`, `updatedAt`
- Save output under `.ghostclaw_runtime/research/github_trending/`
- Public metadata analysis

## 3. Blocked Actions

- `clone_trending_repo`
- `install_trending_repo_packages`
- `execute_unknown_code`
- `read_tokens`
- `print_tokens`
- `bypass_rate_limits`
- Network scanning
- Credential extraction

## 4. Research Topics

1. ai-agent
2. multi-agent
3. agent-framework
4. agent-orchestration
5. browser-use
6. mcp
7. a2a
8. autonomous-agent
9. workflow-automation
10. edgeone
11. kimi
12. deepseek
13. glm
14. openai agents
15. claude opus

## 5. Topic-to-Search Mapping

The topic-to-search mapping is defined in `GHOSTCLAW/research/github-toptrend-map.yaml`.

Each topic maps to a `gh search repos` query with:
- `--sort stars` (most starred first)
- `--visibility public` (public repos only)
- `--limit 20` (top 20 results per topic)
- `--json fullName,description,stargazersCount,url,updatedAt,visibility`

## 6. Output

Each scan writes only structured JSON under `.ghostclaw_runtime/research/github_trending/`:

- `toptrend_<timestamp>.json` — manifest with topics, safety flags, and per-topic status
- `<topic>_<timestamp>.json` — per-topic public metadata results when `gh` is available and auth status is OK
- `scan_status_<timestamp>.json` — setup-required status when `gh` is missing, unavailable, or auth status cannot be verified without secrets

## 7. Setup Required Handling

When `gh` is missing or unavailable, the worker:

1. Marks status as `setup_required` in the manifest
2. Records the reason (e.g., `gh_cli_missing_or_unavailable`, `gh_auth_unavailable_without_secret_read`)
3. Writes a `scan_status_<timestamp>.json` receipt with safety flags
4. References this documentation file as `documentation_ref`
5. Sets `continue_local_implementation: true` — local implementation can proceed without live GitHub data
6. Does not attempt to install `gh` or bypass the missing dependency

## 8. Worker

The worker is implemented in `GHOSTCLAW/research/github-toptrend-worker.mjs`.

```javascript
import { runGithubToptrendResearch } from "./GHOSTCLAW/research/github-toptrend-worker.mjs";
const result = runGithubToptrendResearch();
// result.status === "completed_public_metadata_only" | "setup_required"
```

The worker uses argument-based process execution (`spawnSync` with arg arrays), not shell command strings. Test coverage injects a fake `gh` runner so validation does not call GitHub or require credentials.

## 9. Safety Invariants

- No secrets are read, stored, or printed at any point
- No rate limit bypass is attempted
- No trending repository code is cloned, installed, or executed
- No network calls beyond `gh search repos` with public visibility filter
- All output is structured JSON under the runtime research directory
- The worker operates at autonomy level A2 (assisted, no self-approval)

## 10. Canonical Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias (read compatibility only)
- `beststrom` = invalid typo (reject)