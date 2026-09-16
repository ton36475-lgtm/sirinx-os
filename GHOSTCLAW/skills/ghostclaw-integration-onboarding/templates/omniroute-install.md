### OmniRoute Installation Paths (Mac mini M2)

Three ways to install — use in this priority:

#### 1. Global npm (fastest if network OK)
```bash
npm install -g omniroute
omniroute --version  # Should print 3.8.48
```
⚠️ Check disk first: `df -h /` must show > 2GB free

#### 2. Local clone + npm install (fallback)
```bash
git clone --depth=1 https://github.com/diegosouzapw/OmniRoute integrations/omniroute
cd integrations/omniroute
npm install
node bin/omniroute.mjs --version
```

#### 3. npx (no install, slower)
```bash
npx omniroute@3.8.48 --version
npx omniroute@3.8.48 serve --port 8787
```

### OmniRoute serve commands

```bash
# Start server (default :8787)
node bin/omniroute.mjs serve

# Dry-run simulation (no API call)
node bin/omniroute.mjs simulate "your prompt here"

# List models (requires server running)
node bin/omniroute.mjs models

# Setup wizard
node bin/omniroute.mjs setup

# Compression config
node bin/omniroute.mjs compression
```

### Common errors

| Error | Fix |
|-------|-----|
| `network` error in npm | Check proxy settings, run `npm cache clean --force` first |
| `No space left on device` | `rm -rf ~/.npm/_npx ~/.npm/_cacache`, free 2GB+ |
| `swc.darwin-arm64.node: segment '__TEXT'...` | Delete corrupted binary, `rm -rf node_modules/@swc/*`, then `npm rebuild` |
| `Server not found: app/server.js` | Run `npm install` first (needs build) |

### Integration checklist (Mac)
- [ ] Disk space > 2GB
- [ ] `npm install -g omniroute` OR clone + `npm install`
- [ ] `node bin/omniroute.mjs --version` → 3.8.48
- [ ] Add tmux window: `tmux new-window -t ghostclaw -n omniroute`
- [ ] `node bin/omniroute.mjs serve` → listens :8787
- [ ] Point agents to endpoint: `http://127.0.0.1:8787`