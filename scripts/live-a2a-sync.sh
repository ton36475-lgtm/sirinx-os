#!/opt/homebrew/bin/bash
# ─── A2A Live Sync — Real-Time Outbox Watcher & Dispatcher ─────────────
# Polls all 11 agent outboxes, dispatches new messages, updates bridge
# state, and integrates with OmniRoute health checks.
# Usage: ./live-a2a-sync.sh [start|stop|status|dispatch-check|poll] [interval]
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE="/Users/sirinx/sirinx-os"
OUTBOX_DIR="$BASE/.ghostclaw_runtime/a2a2a/outbox"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
# shellcheck disable=SC2034
QUEUE_DIR="$BASE/.ghostclaw_runtime/queue"
# shellcheck disable=SC2034
BRIDGE_CONFIG="$BASE/apps/9router/bridge/config.yaml"
STATE_FILE="$BRIDGE_DIR/bridge-state.json"
PIDFILE="$BRIDGE_DIR/live-sync.pid"
LOGFILE="$BRIDGE_DIR/live-sync.log"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

AGENTS=(hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui)

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOGFILE"; }
log_info()  { log "INFO  $*"; }
log_warn()  { log "WARN  $*"; }
log_error() { log "ERROR $*"; }
log_ok()    { log "OK    $*"; }

# ── Agent process helpers ────────────────────────────────────────────────

agent_pid() {
  case "$1" in
    hermes)      pgrep -f 'hermes$' 2>/dev/null | head -1 ;;
    codex)       pgrep -f 'codex$' 2>/dev/null | head -1 ;;
    opencode)    pgrep -f 'opencode$' 2>/dev/null | head -1 ;;
    zcode)       pgrep -f 'zcode$' 2>/dev/null | head -1 ;;
    kiro)        pgrep -f 'kiro-cli$' 2>/dev/null | head -1 ;;
    copilot)     pgrep -f 'copilot$' 2>/dev/null | head -1 ;;
    claude)      pgrep -f 'claude$' 2>/dev/null | head -1 ;;
    antigravity2) pgrep -f 'hermes.*antigravity2' 2>/dev/null | head -1 ;;
    webmcp)      pgrep -f 'hermes.*webmcp' 2>/dev/null | head -1 ;;
    planner)     pgrep -f 'planner$' 2>/dev/null | head -1 ;;
    zai_tui)     pgrep -f 'zai$' 2>/dev/null | head -1 ;;
    *)           echo "" ;;
  esac
}

agent_outbox_count() {
  local agent="$1"
  find "$OUTBOX_DIR/$agent" -type f ! -name '.gitkeep' ! -path '*/.dispatched/*' 2>/dev/null | wc -l | tr -d ' '
}

agent_is_running() {
  local pid
  pid=$(agent_pid "$1")
  [ -n "$pid" ]
}

omniroute_healthy() {
  curl -sf http://127.0.0.1:20128/health >/dev/null 2>&1
}

# ── Bridge state update ─────────────────────────────────────────────────

update_state_file() {
  local agents_json=""
  local first=true
  local total_outbox=0

  mkdir -p "$BRIDGE_DIR"

  for agent in "${AGENTS[@]}"; do
    local pid outbox
    pid=$(agent_pid "$agent" 2>/dev/null || echo "")
    outbox=$(agent_outbox_count "$agent")
    total_outbox=$((total_outbox + outbox))

    [ "$first" = false ] && agents_json="$agents_json,"
    first=false

    if [ -n "$pid" ]; then
      agents_json="$agents_json
    \"$agent\": {\"connected\": true, \"last_seen\": \"$TIMESTAMP\", \"pid\": $pid, \"outbox\": $outbox}"
    else
      agents_json="$agents_json
    \"$agent\": {\"connected\": false, \"last_seen\": \"\", \"outbox\": $outbox}"
    fi
  done

  cat > "$STATE_FILE" <<- STATEEOF
{
  "schema_version": "ghostclaw.a2a.model_bridge.state.v1",
  "bridge_id": "9router-a2a-bridge",
  "bridge_ts": "$TIMESTAMP",
  "status": "running",
  "omni_route_healthy": $(omniroute_healthy && echo "true" || echo "false"),
  "live_sync_running": true,
  "last_sync_cycle": "$TIMESTAMP",
  "agents": {$agents_json
  },
  "total_outbox": $total_outbox,
  "sync_groups": 5
}
STATEEOF
  log_info "Bridge state updated"
}

# ── Dispatch: new outbox messages → agent processing ───────────────────

dispatch_to_agent() {
  local agent="$1"
  local message_file="$2"

  log_info "Dispatching ${agent}: $(basename "$message_file")"

  case "$agent" in
    hermes)
      hermes --process-outbox "$OUTBOX_DIR/hermes" 2>/dev/null || true
      ;;
    codex|opencode|zcode|kiro|copilot|claude|planner)
      local bin=""
      case "$agent" in
        codex)    bin="codex" ;;
        opencode) bin="opencode" ;;
        zcode)    bin="zcode" ;;
        kiro)     bin="kiro-cli" ;;
        copilot)  bin="copilot" ;;
        claude)   bin="claude" ;;
        planner)  bin="planner" ;;
      esac
      if command -v "$bin" >/dev/null 2>&1; then
        cat "$message_file" | "$bin" --process --from-outbox 2>/dev/null || true
      fi
      ;;
    antigravity2|webmcp)
      hermes -p "$agent" --process-outbox "$OUTBOX_DIR/$agent" 2>/dev/null || true
      ;;
    zai_tui)
      # ZAI TUI reads its outbox directly
      : # passive consumer
      ;;
  esac
}

# ── Poll cycle ──────────────────────────────────────────────────────────

poll_once() {
  local dispatched=0

  for agent in "${AGENTS[@]}"; do
    local outbox="$OUTBOX_DIR/$agent"
    [ -d "$outbox" ] || continue

    local messages
    messages=$(find "$outbox" -maxdepth 1 -type f ! -name '.gitkeep' ! -name '.dispatched' ! -path '*/.dispatched/*' 2>/dev/null | head -20)

    for msg in $messages; do
      local basen
      basen=$(basename "$msg")

      # Skip already-dispatched
      [ -f "$outbox/.dispatched/$basen.synced" ] && continue

      log_info "New message: ${agent}/${basen}"
      dispatch_to_agent "$agent" "$msg"

      # Mark as dispatched
      mkdir -p "$outbox/.dispatched"
      cp "$msg" "$outbox/.dispatched/$basen.synced"
      dispatched=$((dispatched + 1))
    done
  done

  [ "$dispatched" -gt 0 ] && update_state_file
  return "$dispatched"
}

# ── Actions ─────────────────────────────────────────────────────────────

start_sync() {
  local interval="${1:-5}"
  log_info "=== Starting A2A Live Sync (poll interval: ${interval}s) ==="

  mkdir -p "$BRIDGE_DIR"
  for agent in "${AGENTS[@]}"; do
    mkdir -p "$OUTBOX_DIR/$agent/.dispatched"
  done

  echo "$$" > "$PIDFILE"
  log_info "PID: $$"
  update_state_file

  # Kick off bridge orchestrator
  if [ -f "$BASE/scripts/gc-bridge-orchestrator.sh" ]; then
    bash "$BASE/scripts/gc-bridge-orchestrator.sh" start 2>/dev/null || true
  fi

  log_info "Live sync active — watching ${#AGENTS[@]} agent outboxes"

  local cycles=0
  while true; do
    poll_once
    cycles=$((cycles + 1))

    if [ $((cycles % 30)) -eq 0 ]; then
      update_state_file
      local summary=""
      for a in "${AGENTS[@]}"; do
        summary="$summary $a:$(agent_outbox_count "$a")"
      done
      log_info "Cycle #${cycles} —${summary}"
    fi

    if [ $((cycles % 60)) -eq 0 ]; then
      if omniroute_healthy; then
        log_ok "OmniRoute health: PASS"
      else
        log_warn "OmniRoute health: UNREACHABLE"
      fi
    fi

    sleep "$interval"
  done
}

stop_sync() {
  log_info "=== Stopping A2A Live Sync ==="

  if [ -f "$PIDFILE" ]; then
    local old_pid
    old_pid=$(cat "$PIDFILE")
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      kill "$old_pid" 2>/dev/null || true
      log_info "Killed live sync process (PID ${old_pid})"
    fi
    rm -f "$PIDFILE"
  fi

  update_state_file
  log_info "Live sync stopped"
}

status_sync() {
  echo ""
  echo "=== A2A Live Sync Status ==="
  echo ""

  if [ -f "$PIDFILE" ]; then
    local pid
    pid=$(cat "$PIDFILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  Status:  RUNNING (PID ${pid})"
    else
      echo "  Status:  STOPPED (stale PID ${pid})"
    fi
  else
    echo "  Status:  STOPPED"
  fi
  echo "  Outbox:  ${OUTBOX_DIR}"
  echo "  Log:     ${LOGFILE}"
  echo ""

  printf "  %-15s %8s  %-10s  %-10s\n" "Agent" "Outbox" "Running" "Dispatched"
  printf "  %-15s %8s  %-10s  %-10s\n" "-----" "------" "-------" "----------"
  for agent in "${AGENTS[@]}"; do
    local outbox conn dispatched
    outbox=$(agent_outbox_count "$agent")
    agent_is_running "$agent" && conn="YES" || conn="no"
    dispatched=$(find "$OUTBOX_DIR/$agent/.dispatched" -type f 2>/dev/null | wc -l | tr -d ' ')
    printf "  %-15s %8s  %-10s  %-10s\n" "$agent" "$outbox" "$conn" "$dispatched"
  done
  echo ""

  if omniroute_healthy; then
    echo "  OmniRoute: HEALTHY"
  else
    echo "  OmniRoute: UNREACHABLE"
  fi
  echo ""
}

dispatch_check() {
  echo "=== Dispatch Check ==="
  local found=0

  for agent in "${AGENTS[@]}"; do
    local outbox="$OUTBOX_DIR/$agent"
    [ -d "$outbox" ] || continue

    local pending
    pending=$(find "$outbox" -maxdepth 1 -type f ! -name '.gitkeep' ! -name '.dispatched' ! -path '*/.dispatched/*' 2>/dev/null)

    if [ -n "$pending" ]; then
      echo "  ${agent}:"
      while IFS= read -r f; do
        local basen size modified flag
        basen=$(basename "$f")
        size=$(wc -c < "$f" | tr -d ' ')
        modified=$(stat -f "%Sm" -t "%H:%M:%S" "$f" 2>/dev/null || echo "?")
        if [ -f "$outbox/.dispatched/$basen.synced" ]; then
          flag="✓ dispatched"
        else
          flag="✗ pending"
        fi
        echo "    ${basen} (${size}B, ${modified}) ${flag}"
      done <<< "$pending"
      found=$((found + 1))
    fi
  done

  [ "$found" -eq 0 ] && echo "  No pending messages found."
  echo ""
}

# ── MAIN ────────────────────────────────────────────────────────────────

case "${1:-status}" in
  start)
    interval="${2:-5}"
    start_sync "$interval"
    ;;
  stop)     stop_sync ;;
  status)   status_sync ;;
  dispatch-check|dispatch|check)
    dispatch_check
    ;;
  poll)
    poll_once
    echo "Exit: $?"
    ;;
  *)
    echo "Usage: $0 [start|stop|status|dispatch-check|poll] [interval]"
    echo ""
    echo "Commands:"
    echo "  start [sec]       Start live sync (poll interval, default 5s)"
    echo "  stop              Stop live sync"
    echo "  status            Show sync status and agent dispatch stats"
    echo "  dispatch-check    Check for undelivered messages"
    echo "  poll              Single poll cycle (non-blocking)"
    exit 1
    ;;
esac
