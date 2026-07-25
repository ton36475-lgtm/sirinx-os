#!/bin/bash
# ─── Bridge Memory Fix ────────────────────────────────────────────────────
# Fixed version of bridge-memory-sync: reads bridge state, writes memory
# state JSON, no LLM inference required (no-agent mode).
# Usage: ./scripts/bridge-memory-fix.sh
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="${BASE:-/Users/sirinx/sirinx-os}"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
MEMORY_STATE_FILE="$BASE/.ghostclaw_runtime/bridge_memory_state.json"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ─── Read bridge state ───────────────────────────────────────────────────

read_bridge_state() {
  if [ -f "$BRIDGE_DIR/bridge-state.json" ]; then
    python3 -c "
import json, os

with open('$BRIDGE_DIR/bridge-state.json') as f:
    state = json.load(f)

agents = state.get('agents', {})
running = []
standby = []
stopped = []

for name, info in agents.items():
    s = info.get('status', 'unknown')
    if s == 'running':
        running.append(name)
    elif s == 'standby' or info.get('standby'):
        standby.append(name)
    else:
        stopped.append(name)

outbox_dir = '$BASE/.ghostclaw_runtime/a2a2a/outbox'
total_outbox = 0
for agent in list(running) + list(standby) + list(stopped):
    adir = os.path.join(outbox_dir, agent)
    if os.path.isdir(adir):
        count = len([f for f in os.listdir(adir)
                     if f != '.gitkeep' and os.path.isfile(os.path.join(adir, f))])
        total_outbox += count

memory = {
    'schema': 'ghostclaw.bridge_memory_state.v1',
    'timestamp': '$TIMESTAMP',
    'bridge_status': state.get('status', 'unknown'),
    'agents_running': running,
    'agents_standby': standby,
    'agents_stopped': stopped,
    'total_outbox': total_outbox,
    'last_sync': state.get('last_sync_cycle', ''),
    'active_routes': state.get('active_routes', 0)
}

with open('$MEMORY_STATE_FILE', 'w') as f:
    json.dump(memory, f, indent=2)

print(f'Bridge memory state written: {len(running)} running, {len(standby)} standby, {len(stopped)} stopped')
print(f'Total outbox: {total_outbox}')
" 2>&1
  else
    log "⚠️ No bridge state file found at $BRIDGE_DIR/bridge-state.json"
    log "Creating minimal memory state..."
    cat > "$MEMORY_STATE_FILE" <<- EOF
{
  "schema": "ghostclaw.bridge_memory_state.v1",
  "timestamp": "$TIMESTAMP",
  "bridge_status": "unknown",
  "agents_running": [],
  "agents_standby": [],
  "agents_stopped": [],
  "total_outbox": 0,
  "last_sync": "",
  "active_routes": 0,
  "warning": "No bridge state file found — run bridge orchestrator first"
}
EOF
  fi
}

# ─── Main ─────────────────────────────────────────────────────────────────

cd "$BASE" || { echo "❌ Cannot cd to $BASE"; exit 1; }

log "Bridge Memory Fix starting..."
read_bridge_state
log "✅ Bridge memory state written to $MEMORY_STATE_FILE"
