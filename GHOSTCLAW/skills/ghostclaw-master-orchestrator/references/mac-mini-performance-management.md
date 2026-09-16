# Mac Mini M2 Performance Management

## Hardware Constraints
- Apple M2 chip: 10-core GPU, Metal 4
- **8GB unified memory** — shared between CPU/GPU; large models (>6GB) will swap and crawl
- 228GB SSD — fills up fast with npm caches + Xcode + multiple node_modules

## Disk Cleanup Procedure (verified, reclaims ~13GB+)

Always run this BEFORE any large install (npm, model download, repo clone):

```bash
# 1. Check current usage
df -h / | tail -1

# 2. npm caches (biggest: 8-12GB combined)
rm -rf ~/.npm/_cacache ~/.npm/_npx ~/.npm/_logs
npm cache clean --force 2>/dev/null

# 3. Go build cache (782MB)
go clean -cache

# 4. Homebrew cache (374MB+)
brew cleanup --prune=0 2>/dev/null

# 5. Python/pip cache (208MB)
rm -rf ~/Library/Caches/pip

# 6. pnpm/electron caches
rm -rf ~/Library/Caches/pnpm ~/Library/Caches/electron

# 7. ms-playwright (2.1GB) — only if not running browser tests
rm -rf ~/Library/Caches/ms-playwright

# 8. Google Chrome cache (1.6GB)
rm -rf ~/Library/Caches/Google

# 9. Verify
df -h / | tail -1
```

### Removing Unused Apps

```bash
# List by size
du -sh /Applications/*.app | sort -rh | head -10
```

**CRITICAL**: Apps installed via .pkg or certain Homebrew casks have root ownership.
`rm -rf` without `sudo` fails silently. Must use `sudo rm -rf "/Applications/AppName.app"`.

Safe to remove (not used by GhostClaw/SIRINX):
- Games (0 A.D. = 3.5GB)
- Duplicate apps (ChatGPT Classic if ChatGPT.app exists)
- Unused browsers/email clients

Keep:
- Xcode (4GB) — needed for Swift/SwiftUI/Command Line Tools
- ChatGPT/Codex (1.4GB) — Codex CLI host
- Ollama (559MB) — local model inference (when needed)

## CPU/Memory Diagnostic

When "machine is slow", check real culprits:

```bash
# Top CPU+MEM consumers
ps aux -m | head -10 | awk '{printf "MEM:%s%% CPU:%s%% %s\n", $4, $3, $11}'

# Memory pressure
memory_pressure | tail -1
```

### Known CPU/MEM Hogs (verified ranking)

| Process | CPU | MEM | Notes |
|---------|-----|-----|-------|
| **OrbStack** (Docker VM) | 32.8% | 10.9% | #1 hog — runs Docker VMs continuously |
| Codex Renderer | 14-16% | 7.4% | ChatGPT.app's Codex Framework |
| Chrome | 10.8% | 1.4% | Multi-process |
| Hermes Gateway | 12.9% | 1.4% | Required — agent host |
| Ollama | 0.0% idle | varies | Only consumes when running a model |

### Disabling Ollama (when not using local models)

```bash
# Kill all Ollama processes
pkill -f "Ollama"
pkill -f "ollama"

# Remove from login items
osascript -e 'tell application "System Events" to delete login item "Ollama"'

# Unload launchctl
launchctl remove com.ollama.ollama 2>/dev/null
```

After disabling: RAM free goes from ~30% → ~44%.

### Disabling OrbStack (when not using Docker)

OrbStack is the #1 resource consumer. If no Docker containers are needed:

```bash
# Stop OrbStack (GUI) — just quit the app
osascript -e 'quit app "OrbStack"'
# Or kill the process
pkill -f "OrbStack"
```

This frees 32.8% CPU + 10.9% RAM immediately.

## npm Global Install Workaround

`npm install -g <pkg>` consistently times out or fails on this machine (5-10 min).

**Preferred pattern** (verified with OmniRoute, Markdownify):

```bash
# 1. Git clone instead of npm global
git clone --depth=1 https://github.com/org/repo integrations/repo
cd integrations/repo

# 2. Test CLI directly without deps
node bin/xxx.mjs --version  # works if no heavy deps needed

# 3. If deps needed, install locally with background + notify
# (use terminal background=true notify_on_complete=true)

# 4. Symlink for convenience
ln -sf "$(pwd)/bin/xxx.mjs" ~/.local/bin/xxx
```

## tmux Session Recovery

tmux sessions die after reboots or crashes:

```bash
# Recreate base 14 windows
bash scripts/ghostclaw-tmux.sh

# Add custom windows (omniroute, markdownify, auto-loop)
tmux new-window -t ghostclaw -n "omniroute"
tmux new-window -t ghostclaw -n "markdownify"
tmux new-window -t ghostclaw -n "auto-loop"

# Restart services in their windows
tmux send-keys -t ghostclaw:dev-api "cd /Users/sirinx/sirinx-os/services/dev-control-api && node server.mjs" Enter
tmux send-keys -t ghostclaw:skills-api "cd /Users/sirinx/sirinx-os/services/skills-api && node src/server-zero-dep.mjs" Enter
```

After recreation, verify with health check:
```bash
curl -s http://localhost:8711/health && echo " ✅ Dev Control"
curl -s http://localhost:3800/health && echo " ✅ Skills API"
```
