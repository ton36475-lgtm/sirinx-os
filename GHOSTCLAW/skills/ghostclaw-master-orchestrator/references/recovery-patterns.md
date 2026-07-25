## Disk Space Management (macOS)

Always check disk BEFORE heavy installs:

```bash
df -h /      # Check available space FIRST
npm cache clean --force    # If < 2GB available
rm -rf ~/.npm/_npx ~/.npm/_cacache  # Emergency cleanup
```

### Disk thresholds:
- **< 2GB free**: Block npm install, clean cache first
- **> 85% used**: Run `scripts/cron-disk-check.mjs` auto-cleanup
- **Crash recovery**: Disk full caused npm timeouts, swc corruption

## tmux Session Recovery

If tmux session disappears after crash/hang:

```bash
./scripts/ghostclaw-tmux.sh   # Recreate all 16 windows
# OR manually:
tmux new-session -d -s ghostclaw
tmux new-window -t ghostclaw -n "omniroute"
tmux new-window -t ghostclaw -n "cynative-secondary"
tmux new-window -t ghostclaw -n "auto-loop"
```

### Service restart after crash:
```bash
# Skills API
tmux send-keys -t ghostclaw:1 "cd services/skills-api && node src/server-zero-dep.mjs" Enter
# Dev Control API  
tmux send-keys -t ghostclaw:2 "cd services/dev-control-api && node server.mjs" Enter
```

## npm Install Workarounds

When npm install hangs > 5 minutes:

### Option A: Clean cache first (disk full case)
```bash
npm cache clean --force
npm install -g omniroute
```

### Option B: Clone then install (network slow case)
```bash
git clone --depth=1 https://github.com/diegosouzapw/OmniRoute integrations/omniroute
cd integrations/omniroute
npm install    # Often faster than global npm install
```

### Option C: npx fallback
```bash
npx omniroute@3.8.48 --version  # Works even without global install
```

## Corrupted Binary Recovery

swc core corruption (common after disk full):

```bash
# Remove corrupted binary
rm -rf node_modules/@swc/core-*

# Rebuild
npm rebuild @swc/core-darwin-arm64
# OR full reinstall
rm -rf node_modules && npm install
```

Error pattern: `dlopen(...swc.darwin-arm64.node'): segment '__TEXT' load command content extends beyond end of file`