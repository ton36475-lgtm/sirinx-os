#!/usr/bin/env bash
# Manus.ai ↔ LINE OA MCP Bridge — Start/Stop/Status
# Part of SIRINX OS GhostClaw MCP Infrastructure
set -e

BRIDGE_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_SCRIPT="$BRIDGE_DIR/manus-mcp-bridge.py"
PID_FILE="/tmp/manus-mcp-bridge.pid"
LOG_FILE="/tmp/manus-mcp-bridge.log"
CONFIG_FILE="${SIRINX_MCP_CONFIG:-$BRIDGE_DIR/../config/manus-mcp-config.json}"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(timestamp)] $1"; }

usage() {
    cat <<EOF
Manus.ai ↔ LINE OA MCP Bridge Control

Usage: $(basename "$0") <command> [options]

Commands:
  start       Start the MCP bridge server
  stop        Stop the MCP bridge server
  restart     Restart the MCP bridge server
  status      Show server status
  logs        Tail server logs
  health      Check server health (requires curl)

Options:
  --port PORT         Override MCP port (default: 8788)
  --host HOST         Override bind host (default: 127.0.0.1)
  --live              Enable live mode (default: dry-run)
  --no-auto-approve   Disable auto-approval
  --foreground        Run in foreground (for debugging)

Environment variables:
  SIRINX_MCP_HOST        Bind address (default: 127.0.0.1)
  SIRINX_MCP_PORT        Bind port (default: 8788)
  SIRINX_MCP_AUTO_APPROVE Auto-approve MCP calls (default: true)
  SIRINX_LINE_MODE       dry-run | live | disabled (default: dry-run)
  SIRINX_LINE_SEND_BLOCKED Block LINE sends (default: false)
  LINE_CHANNEL_ACCESS_TOKEN LINE OA channel access token (required for live)
  DESTINATION_USER_ID    Default LINE user ID

EOF
}

start_server() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log "Bridge already running (PID $(cat "$PID_FILE"))"
        return 0
    fi

    # Build env
    export SIRINX_MCP_AUTO_APPROVE="${SIRINX_MCP_AUTO_APPROVE:-true}"
    export SIRINX_LINE_MODE="${SIRINX_LINE_MODE:-dry-run}"

    log "Starting Manus MCP Bridge..."
    log "  Port:     ${SIRINX_MCP_PORT:-8788}"
    log "  Mode:     ${SIRINX_LINE_MODE}"
    log "  Auto-App: ${SIRINX_MCP_AUTO_APPROVE}"

    if [ "$1" = "--foreground" ]; then
        exec python3 "$BRIDGE_SCRIPT"
    else
        nohup python3 "$BRIDGE_SCRIPT" >> "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        sleep 1
        if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            log "Bridge started (PID $(cat "$PID_FILE"))"
            log "Log: $LOG_FILE"
        else
            log "ERROR: Bridge failed to start"
            tail -5 "$LOG_FILE"
            return 1
        fi
    fi
}

stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        log "No PID file found"
        # Try to find and kill
        pkill -f "python3.*manus-mcp-bridge.py" 2>/dev/null && log "Stopped via pkill" || log "No bridge process found"
        return 0
    fi
    PID=$(cat "$PID_FILE")
    log "Stopping bridge (PID $PID)..."
    kill "$PID" 2>/dev/null && log "Stopped" || log "Process not found"
    rm -f "$PID_FILE"
}

status_server() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        PID=$(cat "$PID_FILE")
        PORT="${SIRINX_MCP_PORT:-8788}"
        log "Bridge: RUNNING (PID $PID)"
        log "  Port:     $PORT"
        log "  Mode:     ${SIRINX_LINE_MODE:-dry-run}"
        log "  Auto-App: ${SIRINX_MCP_AUTO_APPROVE:-true}"
        log "  Health:   http://127.0.0.1:$PORT/health"
        log "  MCP:      http://127.0.0.1:$PORT/mcp"
        # Check health endpoint
        if command -v curl &>/dev/null; then
            HEALTH=$(curl -s "http://127.0.0.1:$PORT/health" 2>/dev/null || echo '{"status":"unreachable"}')
            log "  Response: $HEALTH"
        fi
    else
        log "Bridge: STOPPED"
        rm -f "$PID_FILE"
    fi
}

health_check() {
    PORT="${SIRINX_MCP_PORT:-8788}"
    if command -v curl &>/dev/null; then
        curl -s "http://127.0.0.1:$PORT/health" | python3 -m json.tool 2>/dev/null || echo '{"status":"unreachable"}'
    else
        echo "curl not available"
        return 1
    fi
}

# ── Parse Arguments ──
EXTRA_ARGS=()
while [ $# -gt 0 ]; do
    case "$1" in
        start|stop|restart|status|logs|health)
            COMMAND="$1"
            shift
            ;;
        --port) SIRINX_MCP_PORT="$2"; shift 2 ;;
        --host) SIRINX_MCP_HOST="$2"; shift 2 ;;
        --live) SIRINX_LINE_MODE="live"; shift ;;
        --no-auto-approve) SIRINX_MCP_AUTO_APPROVE="false"; shift ;;
        --foreground) EXTRA_ARGS+=("--foreground"); shift ;;
        --help|-h) usage; exit 0 ;;
        *) EXTRA_ARGS+=("$1"); shift ;;
    esac
done

export SIRINX_MCP_PORT SIRINX_MCP_HOST SIRINX_MCP_AUTO_APPROVE SIRINX_LINE_MODE

case "${COMMAND:-status}" in
    start)   start_server "${EXTRA_ARGS[@]}" ;;
    stop)    stop_server ;;
    restart) stop_server; sleep 1; start_server ;;
    status)  status_server ;;
    logs)    [ -f "$LOG_FILE" ] && tail -f "$LOG_FILE" || log "No log file found" ;;
    health)  health_check ;;
    *)       usage; exit 1 ;;
esac
