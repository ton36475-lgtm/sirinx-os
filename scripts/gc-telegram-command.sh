#!/bin/bash
# ─── GhostClaw Telegram Command Processor ────────────────────────────────
# Processes Telegram inline button callbacks for GhostClaw management.
# Usage: ./gc-telegram-command.sh <callback_data>
#
# Callbacks: gc_status, gc_sync, gc_activate, gc_start:<agent>,
#            gc_stop:<agent>, gc_dashboard, gc_reset, gc_logs, gc_help
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="/Users/sirinx/sirinx-os"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ─── Utilities ────────────────────────────────────────────────────────────

log() { echo "[$(date '+%H:%M:%S')] $*"; }
usage() { echo "Usage: $0 <callback_data>"; exit 1; }

# ─── Callback Router ──────────────────────────────────────────────────────

main() {
  local callback="${1:-}"
  [ -z "$callback" ] && usage

  case "$callback" in
    gc_status)
      log "Processing: gc_status — System Status"
      cd "$BASE" && bash scripts/gc-bridge-orchestrator.sh status
      ;;

    gc_sync)
      log "Processing: gc_sync — A2A Sync"
      cd "$BASE" && bash scripts/gc-bridge-orchestrator.sh sync
      ;;

    gc_activate)
      log "Processing: gc_activate — Activate Queue"
      cd "$BASE" && bash scripts/gc-bridge-orchestrator.sh activate-queue
      ;;

    gc_start:*)
      local agent="${callback#gc_start:}"
      if [ -z "$agent" ]; then
        echo "⚠️ Usage: gc_start:<agent_name>"
        echo "   Agents: hermes, codex, opencode, zcode, kiro, copilot,"
        echo "          claude, antigravity2, webmcp, planner, zai_tui"
        exit 1
      fi
      log "Processing: gc_start:$agent"
      cd "$BASE" && bash scripts/gc-agent-control.sh start "$agent"
      ;;

    gc_stop:*)
      local agent="${callback#gc_stop:}"
      if [ -z "$agent" ]; then
        echo "⚠️ Usage: gc_stop:<agent_name>"
        echo "   Agents: hermes, codex, opencode, zcode, kiro, copilot,"
        echo "          claude, antigravity2, webmcp, planner, zai_tui"
        exit 1
      fi
      log "Processing: gc_stop:$agent"
      cd "$BASE" && bash scripts/gc-agent-control.sh stop "$agent"
      ;;

    gc_dashboard)
      log "Processing: gc_dashboard"
      cat <<- DASH
📊 GhostClaw Dashboard
━━━━━━━━━━━━━━━━━━━━━
Local Bridge: http://127.0.0.1:20128
OmniRoute:    dev.sirinx.co/9router
A2A Runtime:  .ghostclaw_runtime/a2a2a/
Dashboard:    .ghostclaw_runtime/a2a2a/a2a2a-evidence-dashboard.html
DASH
      ;;

    gc_reset)
      log "Processing: gc_reset — Reset Bridge"
      cd "$BASE" && bash scripts/gc-bridge-orchestrator.sh start
      echo "✅ Bridge state reset to clean running state at $TIMESTAMP"
      ;;

    gc_logs)
      log "Processing: gc_logs — Recent Logs"
      echo "=== Recent Bridge Logs ==="
      ls -lt "$BASE/.ghostclaw_runtime/a2a2a/logs/" 2>/dev/null | head -10
      echo ""
      echo "=== Outbox Counts ==="
      for agent in hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui; do
        count=$(find "$BASE/.ghostclaw_runtime/a2a2a/outbox/$agent" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
        echo "  $agent: $count"
      done
      ;;

    gc_help)
      log "Processing: gc_help"
      cat <<- HELP
🤖 GhostClaw Telegram Commands
━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Status (gc_status)
   Show all 11 agents health, queue status, and bridge state.

🔄 Sync (gc_sync)
   Trigger full A2A bridge sync cycle across all agents.

▶ Activate (gc_activate)
   Activate all pending queue tasks for processing.

▶ Start Agent (gc_start:<agent>)
   Mark an agent as running in bridge state.
   Agents: hermes, codex, opencode, zcode, kiro, copilot,
           claude, antigravity2, webmcp, planner, zai_tui

⏹ Stop Agent (gc_stop:<agent>)
   Mark an agent as stopped in bridge state.

📊 Dashboard (gc_dashboard)
   Show GhostClaw dashboard URL and status links.

🔁 Reset Bridge (gc_reset)
   Reset bridge state to clean running state.

📋 Logs (gc_logs)
   Show recent bridge logs and outbox counts.

❓ Help (gc_help)
   Show this command menu.
HELP
      ;;

    *)
      echo "⚠️ Unknown callback: $callback"
      echo "   Valid callbacks: gc_status, gc_sync, gc_activate, gc_start:<agent>,"
      echo "                    gc_stop:<agent>, gc_dashboard, gc_reset, gc_logs, gc_help"
      exit 1
      ;;
  esac
}

main "$@"
