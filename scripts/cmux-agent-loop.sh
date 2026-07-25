#!/opt/homebrew/bin/bash
# ─── A2A Cmux Agent Auto-Loop ──────────────────────────────────────────
# Manages all 11 agents in a cmux/tmux session with auto-restart.
# Each agent gets its own window in a named cmux session.
# Usage: ./cmux-agent-loop.sh [start|stop|status|list|restart|watch]
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE="/Users/sirinx/sirinx-os"
SESSION="a2a-agents"
CMUX="/opt/homebrew/bin/cmux"
TMUX="/opt/homebrew/bin/tmux"
RUNTIME="$BASE/.ghostclaw_runtime/a2a2a"
OUTBOX_DIR="$RUNTIME/outbox"
BRIDGE_DIR="$RUNTIME/model-bridge"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Colour helpers
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "[$(date '+%H:%M:%S')] $*"; }

# ── Agent definitions ──────────────────────────────────────────────────
# Each agent: id, display name, CLI command, health check command
declare -A AGENT_NAME AGENT_CMD AGENT_HEALTH

AGENT_CMD[hermes]="hermes"
AGENT_NAME[hermes]="Hermes Commander"
AGENT_HEALTH[hermes]="pgrep -f 'hermes$'"

AGENT_CMD[codex]="codex"
AGENT_NAME[codex]="OpenAI Codex"
AGENT_HEALTH[codex]="pgrep -f 'codex$'"

AGENT_CMD[opencode]="opencode"
AGENT_NAME[opencode]="OpenCode Lite"
AGENT_HEALTH[opencode]="pgrep -f 'opencode$'"

AGENT_CMD[zcode]="zcode"
AGENT_NAME[zcode]="ZCode CLI"
AGENT_HEALTH[zcode]="pgrep -f 'zcode$'"

AGENT_CMD[kiro]="kiro-cli"
AGENT_NAME[kiro]="Kiro CLI"
AGENT_HEALTH[kiro]="pgrep -f 'kiro-cli$'"

AGENT_CMD[copilot]="copilot"
AGENT_NAME[copilot]="GitHub Copilot"
AGENT_HEALTH[copilot]="pgrep -f 'copilot$'"

AGENT_CMD[claude]="claude"
AGENT_NAME[claude]="Claude CLI"
AGENT_HEALTH[claude]="pgrep -f 'claude$'"

AGENT_CMD[antigravity2]="hermes -p antigravity2 --daemon"
AGENT_NAME[antigravity2]="Antigravity 2"
AGENT_HEALTH[antigravity2]="pgrep -f 'hermes.*antigravity2'"

AGENT_CMD[webmcp]="hermes -p webmcp --daemon"
AGENT_NAME[webmcp]="WebMCP"
AGENT_HEALTH[webmcp]="pgrep -f 'hermes.*webmcp'"

AGENT_CMD[planner]="planner"
AGENT_NAME[planner]="Planner"
AGENT_HEALTH[planner]="pgrep -f 'planner$'"

AGENT_CMD[zai_tui]="zai"
AGENT_NAME[zai_tui]="ZAI TUI"
AGENT_HEALTH[zai_tui]="pgrep -f 'zai$'"

AGENTS=(hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui)

# ── Helper functions ────────────────────────────────────────────────────

agent_is_running() {
  local agent="$1"
  local check="${AGENT_HEALTH[$agent]:-}"
  [ -n "$check" ] && eval "$check" >/dev/null 2>&1
}

agent_pid() {
  local agent="$1"
  case "$agent" in
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
  find "$OUTBOX_DIR/$agent" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' '
}

session_exists() {
  $TMUX has-session -t "$SESSION" 2>/dev/null
}

# ── Action: list ────────────────────────────────────────────────────────

list_agents() {
  echo ""
  printf "  %-15s %-20s %-10s %8s\n" "Agent" "Display" "Status" "Outbox"
  printf "  %-15s %-20s %-10s %8s\n" "-----" "-------" "------" "------"
  for agent in "${AGENTS[@]}"; do
    local status
    if agent_is_running "$agent"; then
      status="${GREEN}RUNNING${NC}"
    else
      status="${RED}STOPPED${NC}"
    fi
    local outbox
    outbox=$(agent_outbox_count "$agent")
    printf "  %-15s %-20s %b %6s\n" "$agent" "${AGENT_NAME[$agent]}" "$status" "$outbox"
  done
  echo ""
}

# ── Action: status ──────────────────────────────────────────────────────

status() {
  echo ""
  log "${CYAN}=== A2A Cmux Agent Auto-Loop Status ===${NC}"
  log "Session: ${SESSION}"
  log "Bridge: ${BRIDGE_DIR}"
  echo ""

  if session_exists; then
    log "${GREEN}✓${NC} cmux session '${SESSION}' exists"
    $TMUX list-windows -t "$SESSION" 2>/dev/null | while read -r line; do
      log "  ${line}"
    done
  else
    log "${RED}✗${NC} cmux session '${SESSION}' does not exist"
  fi
  echo ""

  printf "  %-15s %-20s %-10s %8s  %s\n" "Agent" "Display" "Status" "PID" "Outbox"
  printf "  %-15s %-20s %-10s %8s  %s\n" "-----" "-------" "------" "---" "------"
  for agent in "${AGENTS[@]}"; do
    local status_txt pid outbox
    if agent_is_running "$agent"; then
      status_txt="${GREEN}RUNNING${NC}"
      pid=$(agent_pid "$agent")
    else
      status_txt="${RED}STOPPED${NC}"
      pid="-"
    fi
    outbox=$(agent_outbox_count "$agent")
    printf "  %-15s %-20s %b %8s  %s\n" "$agent" "${AGENT_NAME[$agent]}" "$status_txt" "$pid" "$outbox"
  done
  echo ""

  # OmniRoute health indicator
  if curl -sf http://127.0.0.1:20128/health >/dev/null 2>&1; then
    log "${GREEN}✓${NC} OmniRoute health check: PASS"
  else
    log "${YELLOW}⚠${NC} OmniRoute health check: UNREACHABLE"
  fi

  # Bridge state
  if [ -f "$BRIDGE_DIR/bridge-state.json" ]; then
    local state_status
    state_status=$(grep -o '"status": *"[^"]*"' "$BRIDGE_DIR/bridge-state.json" | cut -d'"' -f4)
    log "Bridge state: ${state_status}"
  fi
  echo ""
}

# ── Action: start ────────────────────────────────────────────────────────

start_agent() {
  local agent="$1"
  local cmd="${AGENT_CMD[$agent]}"
  local name="${AGENT_NAME[$agent]}"

  if agent_is_running "$agent"; then
    log "${YELLOW}⚠${NC} ${agent} (${name}) is already running (PID $(agent_pid "$agent"))"
    return 0
  fi

  log "Starting ${agent} (${name})..."

  # Create a new cmux window for this agent
  if session_exists; then
    $TMUX new-window -t "$SESSION" -n "$agent" "$cmd" 2>/dev/null || \
      $TMUX send-keys -t "$SESSION:$agent" "$cmd" Enter 2>/dev/null || true
  else
    # Create session with first window
    $CMUX new-session -d -s "$SESSION" -n "$agent" "$cmd" 2>/dev/null || \
    $TMUX new-session -d -s "$SESSION" -n "$agent" "$cmd" 2>/dev/null || true
  fi

  # Wait briefly and check
  sleep 1
  if agent_is_running "$agent"; then
    log "${GREEN}✓${NC} ${agent} started [PID $(agent_pid "$agent")]"
  else
    log "${YELLOW}⚠${NC} ${agent} may not have started — check logs"
  fi
}

start_all() {
  log "${CYAN}=== Starting all ${#AGENTS[@]} A2A agents ===${NC}"

  # Create or ensure session exists
  if ! session_exists; then
    $CMUX new-session -d -s "$SESSION" -n "a2a-bridge" "cd $BASE && exec bash" 2>/dev/null || \
    $TMUX new-session -d -s "$SESSION" -n "a2a-bridge" "cd $BASE && exec bash" 2>/dev/null || true
    sleep 0.5
  fi

  for agent in "${AGENTS[@]}"; do
    start_agent "$agent"
    sleep 0.3  # Brief pause between agent starts
  done

  log ""
  log "${GREEN}✓${NC} All agents started"

  # Write bridge state
  mkdir -p "$BRIDGE_DIR"
  cat > "$BRIDGE_DIR/bridge-state.json" <<- STATEEOF
{
  "schema_version": "ghostclaw.a2a.model_bridge.state.v1",
  "bridge_id": "9router-a2a-bridge",
  "bridge_ts": "$TIMESTAMP",
  "status": "running",
  "agents": {
$(for agent in "${AGENTS[@]}"; do
  if agent_is_running "$agent"; then
    echo "    \"$agent\": {\"connected\": true, \"last_seen\": \"$TIMESTAMP\", \"pid\": $(agent_pid "$agent")},"
  else
    echo "    \"$agent\": {\"connected\": false, \"last_seen\": \"\"},"
  fi
done)
  },
  "total_outbox": $(for a in "${AGENTS[@]}"; do agent_outbox_count "$a"; done | paste -sd+ | bc),
  "active_routes": ${#AGENTS[@]},
  "sync_groups": 5,
  "cloudflare_worker": "starting",
  "omni_route_healthy": false,
  "last_sync_cycle": "$TIMESTAMP"
}
STATEEOF
  log "Bridge state updated."
}

# ── Action: stop ────────────────────────────────────────────────────────

stop_agent() {
  local agent="$1"
  local name="${AGENT_NAME[$agent]}"

  if ! agent_is_running "$agent"; then
    log "${YELLOW}⚠${NC} ${agent} (${name}) is not running"
    return 0
  fi

  local pid
  pid=$(agent_pid "$agent")
  log "Stopping ${agent} (${name}) [PID ${pid}]..."

  # Send graceful termination
  kill "$pid" 2>/dev/null || true
  sleep 1

  if agent_is_running "$agent"; then
    # Force kill
    kill -9 "$pid" 2>/dev/null || true
    sleep 0.5
  fi

  if agent_is_running "$agent"; then
    log "${RED}✗${NC} ${agent} could not be stopped"
  else
    log "${GREEN}✓${NC} ${agent} stopped"
  fi

  # Close cmux window if it exists
  if session_exists && $TMUX list-windows -t "$SESSION" 2>/dev/null | grep -q "^[0-9]*: ${agent}[[:space:]]"; then
    $TMUX kill-window -t "$SESSION:$agent" 2>/dev/null || true
  fi
}

stop_all() {
  log "${CYAN}=== Stopping all A2A agents ===${NC}"

  # Stop in reverse order (standby agents first, then primary)
  for agent in zai_tui planner webmcp antigravity2 claude copilot kiro zcode opencode codex hermes; do
    stop_agent "$agent"
  done

  # Kill the session if it exists
  if session_exists; then
    $TMUX kill-session -t "$SESSION" 2>/dev/null || true
    log "Session '${SESSION}' terminated."
  fi

  # Update bridge state
  mkdir -p "$BRIDGE_DIR"
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
  log "Bridge state: stopped."
  log "${GREEN}✓${NC} All agents stopped"
}

# ── Action: restart ─────────────────────────────────────────────────────

restart_agent() {
  local agent="$1"
  log "Restarting ${agent}..."
  stop_agent "$agent"
  sleep 1
  start_agent "$agent"
}

restart_all() {
  log "${CYAN}=== Restarting all A2A agents ===${NC}"
  stop_all
  sleep 2
  start_all
}

# ── Action: watch (auto-loop) ───────────────────────────────────────────

watch_loop() {
  log "${CYAN}=== A2A Agent Watch Loop (auto-restart) ===${NC}"
  log "Press Ctrl+C to stop"
  echo ""

  local poll_interval="${1:-15}"

  # Ensure session exists
  if ! session_exists; then
    log "Creating cmux session '${SESSION}'..."
    $CMUX new-session -d -s "$SESSION" -n "a2a-bridge" "cd $BASE && exec bash" 2>/dev/null || \
    $TMUX new-session -d -s "$SESSION" -n "a2a-bridge" "cd $BASE && exec bash" 2>/dev/null || true
    sleep 0.5
  fi

  local rotation_index=0
  while true; do
    local changed=0

    # Check all agents, round-robin style (check 3 per cycle to spread load)
    local start_idx=$(( rotation_index % ${#AGENTS[@]} ))
    for i in 0 1 2; do
      local idx=$(( (start_idx + i) % ${#AGENTS[@]} ))
      local agent="${AGENTS[$idx]}"

      if ! agent_is_running "$agent"; then
        log "${YELLOW}↻${NC} ${agent} is DOWN — restarting..."
        start_agent "$agent"
        changed=$((changed + 1))
      fi
    done
    rotation_index=$((rotation_index + 3))

    # Show status every 2 minutes
    if [ $(( $(date +%s) % 120 )) -lt "$poll_interval" ]; then
      local running_count=0
      for agent in "${AGENTS[@]}"; do
        agent_is_running "$agent" && running_count=$((running_count + 1))
      done
      log "${GREEN}${running_count}/${#AGENTS[@]}${NC} agents running | poll cycle ${rotation_index}"
    fi

    sleep "$poll_interval"
  done
}

# ── MAIN ────────────────────────────────────────────────────────────────

case "${1:-list}" in
  start)
    if [ $# -ge 2 ]; then
      start_agent "$2"
    else
      start_all
    fi
    ;;
  stop)
    if [ $# -ge 2 ]; then
      stop_agent "$2"
    else
      stop_all
    fi
    ;;
  restart)
    if [ $# -ge 2 ]; then
      restart_agent "$2"
    else
      restart_all
    fi
    ;;
  status)  status ;;
  list)    list_agents ;;
  watch)
    interval="${2:-15}"
    watch_loop "$interval"
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status|list|watch] [agent]"
    echo ""
    echo "Commands:"
    echo "  start [agent]    Start all agents or a specific agent"
    echo "  stop  [agent]    Stop all agents or a specific agent"
    echo "  restart [agent]  Restart all agents or a specific agent"
    echo "  status           Detailed status of all agents"
    echo "  list             Quick agent overview"
    echo "  watch [sec]      Auto-restart loop (default 15s interval)"
    echo ""
    echo "Agents: ${AGENTS[*]}"
    exit 1
    ;;
esac
