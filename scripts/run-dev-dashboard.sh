#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/ops/logs"
PID_DIR="$ROOT/ops/pids"
API_URL="${DEV_CONTROL_API_URL:-http://127.0.0.1:8711/health}"
DASHBOARD_URL="${DEV_DASHBOARD_URL:-http://127.0.0.1:8710}"

mkdir -p "$LOG_DIR" "$PID_DIR"

is_up() {
  curl -fsS --max-time 2 "$1" >/dev/null 2>&1
}

pid_alive() {
  [[ -f "$1" ]] && kill -0 "$(cat "$1")" >/dev/null 2>&1
}

session_name() {
  printf "sirinx-%s" "$1"
}

tmux_alive() {
  command -v tmux >/dev/null 2>&1 && tmux has-session -t "$1" >/dev/null 2>&1
}

start_detached() {
  local name="$1"
  local url="$2"
  local pid_file="$3"
  local log_file="$4"
  shift 4
  local session
  session="$(session_name "$name")"

  if is_up "$url"; then
    echo "$name already responding at $url"
    return 0
  fi

  if tmux_alive "$session"; then
    echo "$name already running in tmux session $session"
    return 0
  fi

  if pid_alive "$pid_file"; then
    echo "$name already running with pid $(cat "$pid_file")"
    return 0
  fi

  rm -f "$pid_file"

  if command -v tmux >/dev/null 2>&1; then
    local command_line quoted_log
    printf -v command_line "%q " "$@"
    printf -v quoted_log "%q" "$log_file"
    : >"$log_file"
    tmux new-session -d -s "$session" -c "$ROOT" "exec ${command_line} >> ${quoted_log} 2>&1"
    tmux display-message -p -t "$session" "#{pane_pid}" >"$pid_file"
  else
    (
      cd "$ROOT"
      exec nohup "$@" >"$log_file" 2>&1 < /dev/null
    ) &
    echo "$!" >"$pid_file"
  fi

  echo "started $name pid $(cat "$pid_file")"
}

wait_for() {
  local name="$1"
  local url="$2"
  local tries="${3:-40}"

  for _ in $(seq 1 "$tries"); do
    if is_up "$url"; then
      echo "$name ready at $url"
      return 0
    fi
    sleep 0.5
  done

  echo "$name did not become ready at $url" >&2
  return 1
}

stop_pid() {
  local name="$1"
  local pid_file="$2"
  local session
  session="$(session_name "$name")"

  if tmux_alive "$session"; then
    tmux kill-session -t "$session" >/dev/null 2>&1 || true
    rm -f "$pid_file"
    echo "stopped $name tmux session $session"
    return 0
  fi

  if pid_alive "$pid_file"; then
    local pid
    pid="$(cat "$pid_file")"
    kill "$pid" >/dev/null 2>&1 || true
    rm -f "$pid_file"
    echo "stopped $name pid $pid"
  else
    rm -f "$pid_file"
    echo "$name not running from $pid_file"
  fi
}

start_stack() {
  start_detached "dev-control-api" "$API_URL" "$PID_DIR/dev-control-api.pid" "$LOG_DIR/dev-control-api.log" pnpm dev:api
  start_detached "dev-dashboard" "$DASHBOARD_URL" "$PID_DIR/dev-dashboard.pid" "$LOG_DIR/dev-dashboard.log" pnpm dev:dashboard
  wait_for "dev-control-api" "$API_URL"
  wait_for "dev-dashboard" "$DASHBOARD_URL"
  echo "dashboard: $DASHBOARD_URL"
}

stop_stack() {
  stop_pid "dev-dashboard" "$PID_DIR/dev-dashboard.pid"
  stop_pid "dev-control-api" "$PID_DIR/dev-control-api.pid"
}

status_stack() {
  if is_up "$API_URL"; then
    echo "api: online $API_URL"
  else
    echo "api: offline $API_URL"
  fi

  if is_up "$DASHBOARD_URL"; then
    echo "dashboard: online $DASHBOARD_URL"
  else
    echo "dashboard: offline $DASHBOARD_URL"
  fi
}

foreground_stack() {
  local owned_pids=()

  cleanup() {
    for pid in "${owned_pids[@]}"; do
      kill "$pid" >/dev/null 2>&1 || true
    done
  }

  trap cleanup EXIT INT TERM

  if ! is_up "$API_URL"; then
    (
      cd "$ROOT"
      pnpm dev:api
    ) >"$LOG_DIR/dev-control-api.playwright.log" 2>&1 &
    owned_pids+=("$!")
  fi

  if ! is_up "$DASHBOARD_URL"; then
    (
      cd "$ROOT"
      pnpm dev:dashboard
    ) >"$LOG_DIR/dev-dashboard.playwright.log" 2>&1 &
    owned_pids+=("$!")
  fi

  wait_for "dev-control-api" "$API_URL"
  wait_for "dev-dashboard" "$DASHBOARD_URL"

  while true; do
    for pid in "${owned_pids[@]}"; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        echo "dashboard stack process exited: $pid" >&2
        exit 1
      fi
    done
    sleep 2
  done
}

case "${1:-start}" in
  start)
    start_stack
    ;;
  stop)
    stop_stack
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  status)
    status_stack
    ;;
  open)
    start_stack
    open "$DASHBOARD_URL"
    ;;
  foreground)
    foreground_stack
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|open|foreground}" >&2
    exit 2
    ;;
esac
