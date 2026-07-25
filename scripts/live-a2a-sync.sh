#!/bin/bash
# ─── A2A Live Sync ───────────────────────────────────────────────────────
# Runs the A2A sync cycle across all 11 agents, produces a receipt.
# Designed for cron: every 2m for near-real-time bridge sync.
# Usage: ./scripts/live-a2a-sync.sh
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="${BASE:-/Users/sirinx/sirinx-os}"
OUTBOX_DIR="$BASE/.ghostclaw_runtime/a2a2a/outbox"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
QUEUE_DIR="$BASE/.ghostclaw_runtime/queue"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SYNC_ID="A2A-$(date -u +%s)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ─── Sync Cycle ──────────────────────────────────────────────────────────

sync_all() {
  log "╭─────────────────────────────────────────────╮"
  log "│ A2A Live Sync — ${SYNC_ID}        │"
  log "╰─────────────────────────────────────────────╯"

  # 1. Update bridge state timestamp
  STATE_FILE="$BRIDGE_DIR/bridge-state.json"
  if [ -f "$STATE_FILE" ]; then
    python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
state['last_sync_cycle'] = '$TIMESTAMP'
# Update agent outbox counts
for agent, info in state.get('agents', {}).items():
    outbox_dir = '$OUTBOX_DIR/' + agent
    import os, glob
    count = len(glob.glob(os.path.join(outbox_dir, '*')) or [])
    # Exclude .gitkeep
    count = len([p for p in glob.glob(os.path.join(outbox_dir, '*'))
                 if not os.path.basename(p) == '.gitkeep'])
    info['outbox'] = count
    info['last_seen'] = '$TIMESTAMP'
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" 2>&1 || log "⚠️ Failed to update bridge state"
  fi

  # 2. Count outbox per agent
  TOTAL=0
  for agent in hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui; do
    count=$(find "$OUTBOX_DIR/$agent" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$((TOTAL + count))
    log "  $agent: $count messages"
  done

  # 3. Check queue
  QUEUE_COUNT=$(find "$QUEUE_DIR" -name 'TASK-*.json' 2>/dev/null | wc -l | tr -d ' ')

  # 4. Write sync receipt
  mkdir -p "$BRIDGE_DIR/receipts"
  cat > "$BRIDGE_DIR/receipts/sync-$SYNC_ID.json" <<- RECEIPTEOF
{
  "sync_id": "$SYNC_ID",
  "timestamp": "$TIMESTAMP",
  "type": "a2a_live_sync",
  "total_outbox": $TOTAL,
  "queue_pending": $QUEUE_COUNT,
  "agent_count": 11,
  "status": "complete"
}
RECEIPTEOF

  log "Sync complete: $TOTAL outbox messages, $QUEUE_COUNT queue tasks"
}

# ─── Main ─────────────────────────────────────────────────────────────────

cd "$BASE" || { echo "❌ Cannot cd to $BASE"; exit 1; }
sync_all
