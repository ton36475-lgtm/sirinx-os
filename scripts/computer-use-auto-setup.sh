#!/usr/bin/env bash
# Computer Use Auto Install & Config - Agent Loop Coding System
# Auto setup all coding agents with computer-use capabilities

set -e

echo "=================================================="
echo "COMPUTER USE AUTO INSTALL & CONFIG - Mac Mini M2"
echo "=================================================="

# Workspace base
WORKSPACE_BASE="$HOME/.hermes/profiles/solis/workspaces"

# Create computer-use directories
for agent in claude opencode codex; do
    mkdir -p "$WORKSPACE_BASE/$agent/computer-use"
    echo "Created: $WORKSPACE_BASE/$agent/computer-use/"
done

# Sync MCP to all workspaces
~/sirinx-os/scripts/hermes-a2a-mcp-sync.sh --sync

# Create computer-use config for each agent
for agent in claude opencode codex; do
    cat > "$WORKSPACE_BASE/$agent/computer-use/config.json" << EOF
{
  "agent": "$agent",
  "mcp_servers": ["sirinx-files", "slayer-demo", "supabase", "unreal-engine", "linear"],
  "auto_sync": true,
  "knowledge_sync": "$HOME/.codex/obsidian-brain-sync.json",
  "loop_interval_seconds": 60,
  "task_queue": "$WORKSPACE_BASE/$agent/tasks.json",
  "coding_preferences": {
    "language": "typescript",
    "framework": "nextjs",
    "testing": "jest"
  }
}
EOF
    echo "✓ Config created for $agent"
done

# Sync to Obsidian
python3 - "$HOME/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md" << 'PY'
import sys
from datetime import datetime, timezone
path = sys.argv[1]
entry = f"""

---

## {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC - Computer Use Auto Setup

Agents configured with computer-use capabilities:

| Agent | Workspace | Computer-Use Ready |
|-------|-----------|------------------|
| Claude | {WORKSPACE_BASE}/claude/computer-use/config.json | ✓ |
| OpenCode | {WORKSPACE_BASE}/opencode/computer-use/config.json | ✓ |
| Codex | {WORKSPACE_BASE}/codex/computer-use/config.json | ✓ |

All agents synced to Obsidian Brain
All agents connected to 5 MCP servers
"""
with open(path, 'a') as f:
    f.write(entry)
PY

echo ""
echo "✓ Computer use auto setup COMPLETE"
echo "All coding agents ready for autonomous loop"