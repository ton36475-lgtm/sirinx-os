#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CODEX_NO_MCP_HOME="${CODEX_NO_MCP_HOME:-$ROOT/.ghostclaw_runtime/codex-no-mcp-home}"
STATE_DIR="$ROOT/.ghostclaw_runtime/a2a2a/state"
LOG_DIR="$ROOT/.ghostclaw_runtime/a2a2a/logs"
STATE_FILE="$STATE_DIR/codex-no-mcp-sidebar-probe.json"
LOG_FILE="$LOG_DIR/codex-no-mcp-sidebar.log"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

usage() {
  cat <<'USAGE'
Usage: scripts/codex_no_mcp_a2a_sidebar.sh [--probe|--print-launch]

--probe         Verify an isolated CODEX_HOME reports no MCP servers.
--print-launch  Print the no-MCP Codex launch command; do not execute it.
USAGE
}

write_probe_state() {
  local output_file="$1"
  local exit_code="$2"
  local confirmed="$3"
  python3 - "$STATE_FILE" "$ROOT" "$CODEX_NO_MCP_HOME" "$output_file" "$exit_code" "$confirmed" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

state_file, root, codex_home, output_file, exit_code, confirmed = sys.argv[1:]
payload = {
    "schema": "ghostclaw.codex_no_mcp_sidebar_probe.v1",
    "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "repo": root,
    "codex_home": codex_home,
    "codex_mcp_list_output": output_file,
    "codex_mcp_list_exit_code": int(exit_code),
    "no_mcp_confirmed": confirmed == "true",
    "global_codex_config_mutated": False,
    "auth_files_read": False,
    "mcp_auth_refreshed": False,
    "provider_calls_executed": False,
    "external_writes_executed": False,
    "next_safe_action": "Use --print-launch to copy the no-MCP Codex command, or refresh MCP auth separately.",
}
path = Path(state_file)
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

probe() {
  mkdir -p "$CODEX_NO_MCP_HOME" "$STATE_DIR" "$LOG_DIR"
  local output_file="$STATE_DIR/codex-no-mcp-mcp-list.txt"
  local output
  local exit_code=0
  if output="$(CODEX_HOME="$CODEX_NO_MCP_HOME" codex mcp list 2>&1)"; then
    exit_code=0
  else
    exit_code=$?
  fi
  printf '%s\n' "$output" > "$output_file"
  printf '[%s] CODEX_HOME=%s exit=%s\n' "$(timestamp)" "$CODEX_NO_MCP_HOME" "$exit_code" >> "$LOG_FILE"
  local confirmed=false
  if [ "$exit_code" -eq 0 ] && grep -q "No MCP servers configured" "$output_file"; then
    confirmed=true
  fi
  write_probe_state "$output_file" "$exit_code" "$confirmed"
  cat "$STATE_FILE"
  if [ "$confirmed" != "true" ]; then
    exit 20
  fi
}

print_launch() {
  mkdir -p "$CODEX_NO_MCP_HOME" "$STATE_DIR" "$LOG_DIR"
  cat <<EOF
CODEX_HOME="$CODEX_NO_MCP_HOME" codex --cd "$ROOT" --sandbox danger-full-access --ask-for-approval never --no-alt-screen "/ghostclaw-a2a-sync-start local_safe_autonomous codex_sidebar_runtime no_mcp"
EOF
}

MODE="${1:---probe}"
case "$MODE" in
  --probe)
    probe
    ;;
  --print-launch)
    print_launch
    ;;
  -h|--help)
    usage
    ;;
  *)
    usage
    exit 2
    ;;
esac
