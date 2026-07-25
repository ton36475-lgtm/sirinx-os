# OmniRoute Integration Notes

## Overview
OmniRoute is a Free AI Gateway — 250+ providers, 90+ free tiers, RTK+Caveman compression (15-95% token savings).

- **Repo**: https://github.com/diegosouzapw/OmniRoute
- **Version**: 3.8.48
- **License**: MIT
- **Stars**: 17,698
- **Local path**: `/Users/sirinx/sirinx-os/integrations/omniroute/`

## Installation Pattern: Git Clone + Direct Run

OmniRoute's `bin/omniroute.mjs` works immediately after `git clone` without `npm install`:
```bash
git clone --depth=1 https://github.com/diegosouzapw/OmniRoute integrations/omniroute
cd integrations/omniroute
node bin/omniroute.mjs --version  # → 3.8.48 ✅
```

Full server mode (`serve`) requires `npm install` + `npm run build`.

## Full Server Setup

```bash
cd /Users/sirinx/sirinx-os/integrations/omniroute

# CRITICAL: Check disk first (need >5GB)
df -h /

npm install       # ~300s on Mac mini
npm run build     # generates dist/app/server.js
node bin/omniroute.mjs serve --port 8787
```

## What Failed (and how to fix)

1. **`npm install -g omniroute`** — timed out at 300s+ repeatedly. Use clone instead.
2. **`npx omniroute`** — ENOSPC (disk full from npm cache). Fix: `npm cache clean --force && rm -rf ~/.npm/_npx ~/.npm/_cacache`
3. **Corrupted `@swc/core-darwin-arm64`** — disk filled mid-install, truncated `.node` binary. Error: `dlopen(...) segment '__TEXT' load command content extends beyond end of file`. Fix: `rm -rf node_modules && npm install`
4. **`serve` without build** — error: `Server not found at: .../app/server.js`. Must run `npm run build` first.

## Key Commands
```bash
node bin/omniroute.mjs serve           # Start local AI gateway
node bin/omniroute.mjs setup           # First-time setup wizard
node bin/omniroute.mjs models          # List all 250+ models
node bin/omniroute.mjs simulate "x"    # Dry-run routing (no API call)
node bin/omniroute.mjs chat "x"        # One-shot chat
node bin/omniroute.mjs compression     # Configure RTK+Caveman
node bin/omniroute.mjs config          # Show configuration
node bin/omniroute.mjs stop            # Stop server
```

## Symlink for Convenience
```bash
mkdir -p ~/.local/bin
ln -sf /Users/sirinx/sirinx-os/integrations/omniroute/bin/omniroute.mjs ~/.local/bin/omniroute
```

## Compatible Agents
Claude Code, Codex, Cursor, Cline, Copilot, Antigravity — all can point to OmniRoute endpoint.

## Capabilities
- 250+ provider entries, 90+ free tiers
- ~1.6B documented free tokens/month
- RTK + Caveman compression (15-95% savings)
- MCP Server (94 tools, 30 scopes)
- A2A v0.3 Protocol (6 skills)
- 134 open-sse services, 17 routing strategies
- 42 i18n locales (including Thai)
- SQLite database (better-sqlite3)

## Safety Gates in GhostClaw
- `localProxyOnly: true` — bind to 127.0.0.1
- `humanApprovalForPaidTier: true` — free tiers auto, paid needs gate
- `failClosed: true` — unknown provider = denied
- `noSecretInLog: true` — API keys via secret_ref only

## Disk Lesson
npm global install failed due to ENOSPC (228GB disk full from npm caches).
**Fix**: `npm cache clean --force && rm -rf ~/.npm/_npx ~/.npm/_cacache` reclaimed 13GB.
Git clone bypasses npm entirely for the initial binary test.
