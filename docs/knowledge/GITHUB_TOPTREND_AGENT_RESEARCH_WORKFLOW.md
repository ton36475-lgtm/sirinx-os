# GitHub Toptrend Agent Research Workflow

**Part of:** GHOSTCLAW Research Worker
**Status:** ACTIVE
**Mode:** public_read_only

---

## 1. Overview

The GitHub Toptrend Research Worker scans GitHub trending repositories and GitHub search for topics relevant to the GHOSTCLAW agent system. All research is **read-only** — public metadata only.

## 2. Allowed Actions

- `gh search repos` metadata only (name, description, stars, URL, updatedAt)
- Save output under `.ghostclaw_runtime/research/github_trending/`
- Public metadata analysis

## 3. Blocked Actions

- Clone trending repository
- Install trending repository packages
- Execute unknown code from trending repositories
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

Each scan produces:
- `toptrend_<timestamp>.json` — manifest with all topics and metadata
- `<topic>_<timestamp>.json` — per-topic search results (if `gh` CLI available)
- `scan_status_<timestamp>.log` — status log if `gh` CLI missing

## 6. Worker

The worker is implemented in `GHOSTCLAW/research/github-toptrend-worker.mjs`.

```javascript
import { runGithubToptrendResearch } from "./GHOSTCLAW/research/github-toptrend-worker.mjs";
const result = runGithubToptrendResearch();
// result.status === "success" | "skipped_no_gh_cli"
```

## 7. Canonical Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias (read compatibility only)
- `beststrom` = invalid typo (reject)
