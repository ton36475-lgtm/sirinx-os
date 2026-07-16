---
name: ghostclaw-integration-onboarding
description: Complete onboarding checklist for integrating external tools (Cynative, ThaiMart, OpenResearcher) into GhostClaw OS safely.
version: 1.0.0
---

# GhostClaw Integration Onboarding

## When to Use

- Integrating a new external tool or service into GhostClaw OS
- Cloning a repo for local analysis
- Setting up a connector for read-only operations

## Integration Checklist

### 1. Clone & Analyze (read-only)

```bash
cd /Users/sirinx/sirinx-os
git clone --depth=1 https://github.com/<org>/<repo> integrations/<name>
```

### 2. License Gate Check

```yaml
license_gate:
  status: PASS | BLOCKED
  conditions:
    - "Root LICENSE file present?"
    - "Commercial use allowed?"
    - "Redistribution allowed?"
```

| Tool | License | Gate |
|------|---------|------|
| Cynative | Apache-2.0 | PASS |
| OmniRoute | MIT | PASS |
| OpenResearcher | Missing root LICENSE | BLOCKED |
| ThaiMart API | Unknown (no contract) | BLOCKED |

### 3. Create Connector Wrapper

```javascript
// integrations/<name>-connector/index.mjs
export function get<Name>ConnectorStatus() {
  return {
    name: '<name>',
    capabilities: { /* ... */ },
    gates: {
      preAuthRequired: true,
      dryRunDefault: true,
      readOnlyConstruction: true
    }
  };
}
```

### 4. Binary Installation (if applicable)

**CRITICAL: Check disk space first!** Mac mini M2 has 228GB, 8GB RAM, and npm caches can consume 13GB+:

```bash
df -h /  # ensure >5GB free before installing
# If <10GB free, clean first:
rm -rf ~/.npm/_cacache ~/.npm/_npx ~/Library/Caches/pip ~/Library/Caches/pnpm
go clean -cache 2>/dev/null
brew cleanup --prune=0 2>/dev/null
```

**CRITICAL: `timeout` command does NOT exist on macOS.** Do not use it in shell scripts. Use `terminal(background=true)` + `process(action='poll')` for time-bounded runs.

**Preferred order (avoids npm global timeout on slow networks):**

1. **Download release binary** (fastest for single binaries):
```bash
curl -sL -o <name>.tar.gz \
  https://github.com/<org>/<repo>/releases/download/v<ver>/<name>_Darwin_arm64.tar.gz
tar -xzf <name>.tar.gz
chmod +x <name>
```

2. **Git clone + run directly** (best for npm packages that timeout on `npm install -g`):
```bash
git clone --depth=1 https://github.com/<org>/<repo> integrations/<name>
cd integrations/<name>
node bin/xxx.mjs --version  # test without npm install
# Symlink for convenience:
ln -sf "$(pwd)/bin/xxx.mjs" ~/.local/bin/<name>
```

3. **npm install -g** (last resort — clean caches first):
```bash
npm cache clean --force
rm -rf ~/.npm/_npx ~/.npm/_cacache  # reclaim 10GB+
npm install -g <name>
```

### 5. Add to tmux

```bash
tmux new-window -t ghostclaw -n "<name>"
tmux send-keys -t ghostclaw:<name> "cd integrations/<name> && echo '<Name> Ready'" Enter
```

### 6. Verify

```bash
node --check integrations/<name>-connector/index.mjs
```

## Safety Rules

- **Read-only by default** — all connectors start read-only
- **Pre-auth gated** — credentials required before any API call
- **Dry-run first** — simulate before real execution
- **LICENSE_GATE BLOCKED** → study patterns only, no vendoring/deployment
- **No secrets in code** — use `secret_ref` handles only

## Current Integrations (VERIFIED 2026-07-16)

| Integration | Path | Status | Version |
|-------------|------|--------|---------|
| Cynative | `integrations/cynative/cynative` | ✅ Binary ready (89MB) | v1.5.1 |
| OmniRoute | `integrations/omniroute/` | ✅ Cloned + CLI ready | v3.8.48 |
| Markdownify MCP | `integrations/markdownify-mcp/` | ✅ Built + markitdown[all] installed | latest |
| ThaiMart | `services/dev-control-api/src/thaimart-k-workflow-engine.mjs` | disabled_pending_contract | K01-K15 |
| OpenResearcher | `packages/types/src/worker-interfaces.mjs` (mock) | LICENSE_GATE BLOCKED | research_snapshot |

### OmniRoute Quick Commands
```bash
cd /Users/sirinx/sirinx-os/integrations/omniroute

# Version
node bin/omniroute.mjs --version    # → 3.8.48

# Simulate routing (dry-run, no API call)
node bin/omniroute.mjs simulate "hello world"

# Start server (needs npm install first for full deps)
node bin/omniroute.mjs serve

# List models
node bin/omniroute.mjs models

# Compression config (RTK + Caveman)
node bin/omniroute.mjs compression
```

### OmniRoute Capabilities
- 250+ AI providers, 90+ free tiers
- RTK + Caveman compression (15-95% token savings)
- Auto-fallback when provider fails
- Compatible: Claude Code, Codex, Cursor, Cline, Copilot
- MCP Server (94 tools), A2A v0.3 Protocol
- MIT License, 17,698 stars
| OpenResearcher | `packages/types/src/worker-interfaces.mjs` (mock) | LICENSE_GATE BLOCKED |

## OmniRoute Build Pitfalls (VERIFIED)

- **swc binary corruption**: If disk fills during initial `npm install`, `@swc/core-darwin-arm64/swc.darwin-arm64.node` gets truncated. Error: `dlopen(...) segment '__TEXT' load command content extends beyond end of file`. Fix: `rm -rf node_modules && npm install` fresh.
- **`npm run build` fails without `dist/`**: OmniRoute's serve command looks for `app/server.js` under `dist/`. Must run `npm run build` after `npm install` before `serve` works.
- **Clone approach works without global install**: `git clone --depth=1` + `node bin/omniroute.mjs --version` works immediately. Full serve requires deps + build.
- **FULL VERIFIED**: After `npm install && npm run build`, `.build/` dir is created. Serve still looks for `app/server.js` — the `assembleStandalone` build step outputs to `dist/`, so `npm run build` must complete successfully. 230 packages installed in ~86s.

## Local Model Integration (Bonsai / Ollama)

Mac mini M2 constraints (8GB unified memory, 10-core GPU, Metal 4):

| Model | Size | Source | Status |
|-------|------|--------|--------|
| Bonsai-27B | 4-6GB (compressed Qwen 27B) | PrismML | Research phase — not downloaded |
| Qwen3.5:4b | 3.4GB | Ollama | ✅ Installed |
| Qwen3.5:2b | 2.7GB | Ollama | ✅ Installed |
| Hermes-prime-lite | 4.7GB | Ollama | ✅ Installed |
| Qwythos-9B | 6.8GB | HuggingFace | ✅ Installed |

**Bonsai 27B**: First 27B-class model that runs on a phone. Compressed from Qwen 27B to 4-6GB while maintaining quality. Source: `prismml.com/news/bonsai-27b`, GitHub: `PrismML-Eng/Bonsai-demo`. Suitable for M2 8GB but disk must have >6GB free (currently tight after OmniRoute install).

**Download pattern for local models**:
```bash
# Check disk first
df -h / | tail -1
# Pull via ollama
ollama pull hf.co/<org>/<model>-GGUF:Q4_K_M
# Or direct HuggingFace
ollama pull hf.co/PrismML-Eng/Bonsai-27B-GGUF:Q4_K_M  # verify exists first
```

## Integration Patterns

### Pattern A: Pre-built Binary (Cynative)
Download release `.tar.gz` → extract → run. No deps needed.

### Pattern B: Git Clone + Direct Run (OmniRoute)
Clone repo → `node bin/xxx.mjs --version` works immediately without `npm install`.
For full server mode, `npm install` is needed but can be deferred.

### Pattern C: Spec-Only / Mock (ThaiMart, OpenResearcher)
No binary download. Build connector wrapper + mock interfaces from the governance contracts.

### Pattern D: Bun + Python Hybrid (Markdownify MCP)
Bun-managed TypeScript project that also creates a Python venv at install time.

```bash
cd integrations/markdownify-mcp
bun install        # installs TS deps AND creates .venv with markitdown[all]
bun run build      # tsc → dist/index.js
# If markitdown missing from venv:
.venv/bin/pip install "markitdown[all]"
# MCP server runs via:
node dist/index.js   # or: bun start
```

**Pitfall**: `bun install` preinstall step creates the venv, but on Mac mini it may skip markitdown. Run `.venv/bin/pip install "markitdown[all]"` manually if `ls .venv/bin/markitdown` returns nothing.

**MCP config for Claude Code / Cursor / Codex**:
```json
{
  "mcpServers": {
    "markdownify": {
      "command": "node",
      "args": ["/Users/sirinx/sirinx-os/integrations/markdownify-mcp/dist/index.js"],
      "env": {
        "MD_ALLOWED_PATHS": "/Users/sirinx/sirinx-os:/Users/sirinx/Documents"
      }
    }
  }
}
```

11 tools: `pdf-to-markdown`, `image-to-markdown` (OCR), `audio-to-markdown` (transcription), `docx/xlsx/pptx-to-markdown`, `youtube-to-markdown`, `webpage-to-markdown`, `bing-search-to-markdown`, `git-repo-to-markdown`, `get-markdown-file`.
