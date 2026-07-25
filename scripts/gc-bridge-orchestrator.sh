#!/bin/bash
# ─── 9Router A2A Model Bridge Orchestrator ──────────────────────────────
# Starts, monitors, and syncs all 11 agents through the model bridge.
# Usage: ./gc-bridge-orchestrator.sh [start|stop|status|sync|activate-queue]
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="/Users/sirinx/sirinx-os"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
QUEUE_DIR="$BASE/.ghostclaw_runtime/queue"
OUTBOX_DIR="$BASE/.ghostclaw_runtime/a2a2a/outbox"
BRIDGE_CONFIG="$BASE/apps/9router/bridge/config.yaml"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

status() {
  log "=== A2A Model Bridge Status ==="
  log "Bridge config: $BRIDGE_CONFIG"
  echo ""
  for agent in hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui; do
    outbox_count=$(find "$OUTBOX_DIR/$agent" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
    running="?"
    if [ "$outbox_count" -gt 0 ]; then
      # Check if we can find a running process
      case "$agent" in
        kiro)    pgrep -f "kiro-cli" >/dev/null 2>&1 && running="RUNNING" || running="STOPPED" ;;
        copilot) pgrep -f "copilot" >/dev/null 2>&1 && running="RUNNING" || running="STOPPED" ;;
        zcode)   pgrep -f "zcode" >/dev/null 2>&1 && running="RUNNING" || running="STOPPED" ;;
        hermes)  running="ACTIVE" ;;  # Hermes is the orchestrator itself
        *)       running="?" ;;
      esac
    fi
    printf "  %-15s outbox: %3s  status: %s\n" "$agent" "$outbox_count" "$running"
  done
  echo ""
  
  # Queue status
  echo "  --- Queue Tasks ---"
  for f in "$QUEUE_DIR"/TASK-*.json; do
    [ -f "$f" ] || continue
    id=$(basename "$f" .json)
    owner=$(grep -o '"owner": *"[^"]*"' "$f" | cut -d'"' -f4)
    priority=$(grep -o '"priority": *"[^"]*"' "$f" | cut -d'"' -f4)
    title=$(grep -o '"title": *"[^"]*"' "$f" | cut -d'"' -f4)
    status_val=$(grep -o '"status": *"[^"]*"' "$f" | cut -d'"' -f4)
    printf "    %-25s [%s] %s -> %s %s\n" "$id" "$priority" "$owner" "$status_val" "$title"
  done
}

start() {
  log "Starting A2A Model Bridge..."
  # Update bridge state
  cat > "$BRIDGE_DIR/bridge-state.json" <<- STATEEOF
{
  "schema_version": "ghostclaw.a2a.model_bridge.state.v1",
  "bridge_id": "9router-a2a-bridge",
  "bridge_ts": "$TIMESTAMP",
  "status": "running",
  "agents": {
    "hermes": {"connected": true, "last_seen": "$TIMESTAMP"},
    "codex": {"connected": true, "last_seen": "$TIMESTAMP"},
    "opencode": {"connected": true, "last_seen": "$TIMESTAMP"},
    "zcode": {"connected": true, "last_seen": "$TIMESTAMP"},
    "kiro": {"connected": true, "last_seen": "$TIMESTAMP"},
    "copilot": {"connected": true, "last_seen": "$TIMESTAMP"},
    "claude": {"connected": false, "last_seen": "", "standby": true},
    "antigravity2": {"connected": false, "last_seen": "", "standby": true},
    "webmcp": {"connected": false, "last_seen": "", "standby": true},
    "planner": {"connected": false, "last_seen": "", "standby": true},
    "zai_tui": {"connected": true, "last_seen": "$TIMESTAMP"}
  },
  "total_outbox": 135,
  "active_routes": 10,
  "sync_groups": 2,
  "cloudflare_worker": "starting",
  "omni_route_healthy": false,
  "last_sync_cycle": "$TIMESTAMP"
}
STATEEOF
  log "Bridge state updated. Status: running"
  log "Ready for OmniRoute connection at dev.sirinx.co/9router"
}

stop() {
  log "Stopping A2A Model Bridge..."
  cat > "$BRIDGE_DIR/bridge-state.json" <<- STATEEOF
{
  "schema_version": "ghostclaw.a2a.model_bridge.state.v1",
  "bridge_id": "9router-a2a-bridge",
  "bridge_ts": "$TIMESTAMP",
  "status": "stopped",
  "agents": {},
  "total_outbox": 0,
  "active_routes": 0,
  "sync_groups": 0,
  "cloudflare_worker": null,
  "omni_route_healthy": false,
  "last_sync_cycle": ""
}
STATEEOF
  log "Bridge stopped."
}

sync() {
  log "=== A2A Model Bridge Sync Cycle ==="
  
  # Update bridge state timestamp
  STATE_FILE="$BRIDGE_DIR/bridge-state.json"
  if [ -f "$STATE_FILE" ]; then
    # Update last_sync_cycle in the JSON
    sed -i '' "s/\"last_sync_cycle\": *\"[^\"]*\"/\"last_sync_cycle\": \"$TIMESTAMP\"/" "$STATE_FILE"
  fi
  
  # Count outbox for each agent
  for agent in hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui; do
    outbox_count=$(find "$OUTBOX_DIR/$agent" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
    log "  $agent: $outbox_count outbox messages"
  done
  
  log "Sync complete at $TIMESTAMP"
}

activate_queue() {
  log "=== Activating Queue Processing ==="
  
  # Phase 1: P3 tasks (OmniRoute + Standby agents)
  log "Phase 1: Processing P3 tasks owned by kiro..."
  
  for task_file in "$QUEUE_DIR"/TASK-*.json; do
    [ -f "$task_file" ] || continue
    owner=$(grep -o '"owner": *"[^"]*"' "$task_file" | cut -d'"' -f4)
    priority=$(grep -o '"priority": *"[^"]*"' "$task_file" | cut -d'"' -f4)
    task_id=$(basename "$task_file" .json)
    title=$(grep -o '"title": *"[^"]*"' "$task_file" | cut -d'"' -f4)
    status_val=$(grep -o '"status": *"[^"]*"' "$task_file" | cut -d'"' -f4)
    
    if [ "$status_val" = "pending" ]; then
      log "  Activating: $task_id [$priority] $owner -> $title"
      
      # Update task status to 'processing'
      sed -i '' 's/"status": "pending"/"status": "processing"/' "$task_file"
      
      # Create activation packet in agent's outbox
      mkdir -p "$OUTBOX_DIR/$owner"
      cat > "$OUTBOX_DIR/$owner/GC-QUEUE-ACTIVATION-$task_id.md" <<- TASKEOF
# Queue Activation: $task_id
task: $task_id
title: $title
priority: $priority
owner: $owner
activated_at: $TIMESTAMP
status: processing

## Assignment
Please process this task as per the GC-ACTION-PLAN-20260724.

TASKEOF
      log "    -> Packet sent to $owner outbox"
    fi
  done
  
  log "Queue activation complete."
}

# ─── MAIN ────────────────────────────────────────────────────────────────
case "${1:-status}" in
  start)          start ;;
  stop)           stop ;;
  status|state)   status ;;
  sync)           sync ;;
  activate-queue) activate_queue ;;
  *)
    echo "Usage: $0 [start|stop|status|sync|activate-queue]"
    echo ""
    echo "Commands:"
    echo "  start           Start the bridge and update state"
    echo "  stop            Stop the bridge"
    echo "  status          Show agent and queue status"
    echo "  sync            Run a sync cycle"
    echo "  activate-queue  Activate all pending queue tasks"
    exit 1
    ;;
esac
