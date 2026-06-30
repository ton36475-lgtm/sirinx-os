# GitHub Toptrend Agent Research Workflow

**Part of:** GHOSTCLAW Research Worker
**Status:** ACTIVE
**Mode:** public_metadata_only

---

## 1. Overview

The GitHub Toptrend Research Worker uses GitHub public repository metadata as research input for GHOSTCLAW. It is not an install lane. It never clones, installs, or executes trending repository code.

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

## 5. Output

Each scan writes only structured JSON under `.ghostclaw_runtime/research/github_trending/`:

- `toptrend_<timestamp>.json` — manifest with topics, safety flags, and per-topic status
- `<topic>_<timestamp>.json` — per-topic public metadata results when `gh` is available and auth status is OK
- `scan_status_<timestamp>.json` — setup-required status when `gh` is missing, unavailable, or auth status cannot be verified without secrets

## 6. Worker

The worker is implemented in `GHOSTCLAW/research/github-toptrend-worker.mjs`.

```javascript
import { runGithubToptrendResearch } from "./GHOSTCLAW/research/github-toptrend-worker.mjs";
const result = runGithubToptrendResearch();
// result.status === "completed_public_metadata_only" | "setup_required"
```

The worker uses argument-based process execution, not shell command strings. Test coverage injects a fake `gh` runner so validation does not call GitHub or require credentials.

## 7. Canonical Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias (read compatibility only)
- `beststrom` = invalid typo (reject)
