#!/bin/bash
# ─── GhostClaw Agent Control ─────────────────────────────────────────────
# Start, stop, or restart an agent in the A2A bridge state.
# Updates bridge-state.json to reflect agent running/stopped status.
# Usage: ./gc-agent-control.sh <start|stop|restart> <agent>
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="/Users/sirinx/sirinx-os"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
STATE_FILE="$BRIDGE_DIR/bridge-state.json"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ─── Supported agents ─────────────────────────────────────────────────────
VALID_AGENTS="hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui"

log() { echo "[$(date '+%H:%M:%S')] $*"; }
usage() {
  echo "Usage: $0 <start|stop|restart> <agent>"
  echo ""
  echo "Actions:"
  echo "  start   — Mark agent as running in bridge state"
  echo "  stop    — Mark agent as stopped in bridge state"
  echo "  restart — Stop then start agent"
  echo ""
  echo "Supported agents:"
  echo "  $VALID_AGENTS"
  exit 1
}

# ─── Validate args ────────────────────────────────────────────────────────

action="${1:-}"
agent="${2:-}"

[ -z "$action" ] && usage
[ -z "$agent" ] && usage

# Check agent is valid
valid=false
for a in $VALID_AGENTS; do
  [ "$a" = "$agent" ] && valid=true && break
done
$valid || { echo "❌ Unknown agent: $agent"; usage; }

# ─── Ensure state file exists ────────────────────────────────────────────

ensure_state() {
  if [ ! -f "$STATE_FILE" ]; then
    mkdir -p "$BRIDGE_DIR"
    cat > "$STATE_FILE" <<- EOF
{
  "schema_version": "ghostclaw.a2a.model_bridge.state.v1",
  "bridge_id": "9router-a2a-bridge",
  "bridge_ts": "$TIMESTAMP",
  "status": "running",
  "agents": {},
  "total_outbox": 0,
  "active_routes": 0,
  "sync_groups": 0,
  "cloudflare_worker": null,
  "omni_route_healthy": false,
  "last_sync_cycle": ""
}
EOF
    log "Created new state file"
  fi
}

# ─── Update agent in state file ──────────────────────────────────────────

update_agent_state() {
  local agent_name="$1"
  local agent_status="$2"
  local agent_connected="false"

  [ "$agent_status" = "running" ] && agent_connected="true"

  ensure_state

  # Use Python to safely update JSON
  cd "$BASE" && python3 -c "
import json, sys

with open('$STATE_FILE', 'r') as f:
    state = json.load(f)

if 'agents' not in state:
    state['agents'] = {}

state['agents']['$agent_name'] = {
    'connected': $agent_connected,
    'status': '$agent_status',
    'last_seen': '$TIMESTAMP'
}

state['bridge_ts'] = '$TIMESTAMP'

with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)

print(f'Agent [$agent_name] set to [{agent_status}]')
" 2>&1 || {
    log "⚠️ Failed to update state via Python, trying fallback"
    # Fallback: simpler state update without agent list
    cat > "$STATE_FILE" <<- EOF
{
  "schema_version": "ghostclaw.a2a.model_bridge.state.v1",
  "bridge_id": "9router-a2a-bridge",
  "bridge_ts": "$TIMESTAMP",
  "status": "running",
  "last_sync_cycle": "$TIMESTAMP"
}
EOF
    log "⚠️  State file reset (minimal). Agent state not preserved."
  }
}

# ─── Actions ──────────────────────────────────────────────────────────────

case "$action" in
  start)
    log "Starting agent: $agent"
    update_agent_state "$agent" "running"

    # Create outbox directory if needed
    mkdir -p "$BASE/.ghostclaw_runtime/a2a2a/outbox/$agent"

    echo "✅ Agent [$agent] started at $TIMESTAMP"
    ;;

  stop)
    log "Stopping agent: $agent"
    update_agent_state "$agent" "stopped"
    echo "✅ Agent [$agent] stopped at $TIMESTAMP"
    ;;

  restart)
    log "Restarting agent: $agent"
    update_agent_state "$agent" "stopped"
    sleep 1
    update_agent_state "$agent" "running"

    echo "✅ Agent [$agent] restarted at $TIMESTAMP"
    ;;

  status)
    log "Status for agent: $agent"
    if [ -f "$STATE_FILE" ]; then
      python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
agents = state.get('agents', {})
if '$agent' in agents:
    a = agents['$agent']
    print(f'Agent: $agent')
    print(f'  Status:    {a.get(\"status\", \"unknown\")}')
    print(f'  Connected: {a.get(\"connected\", false)}')
    print(f'  Last seen: {a.get(\"last_seen\", \"never\")}')
else:
    print(f'Agent: $agent — not found in state')
" 2>/dev/null || echo "⚠️ Cannot read state file"
    else
      echo "⚠️ No state file found"
    fi
    ;;

  *)
    usage
    ;;
esac
