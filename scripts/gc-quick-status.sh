#!/bin/bash
# ─── GhostClaw Quick Status (one-liner for Telegram) ────────────────────
# Outputs a compact multi-line status summary suitable for Telegram messages.
# Usage: ./gc-quick-status.sh
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="/Users/sirinx/sirinx-os"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a"
OUTBOX_DIR="$BRIDGE_DIR/outbox"
QUEUE_DIR="$BASE/.ghostclaw_runtime/queue"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

RUNNING_COUNT=0
STANDBY_COUNT=0
TOTAL_OUTBOX=0
QUEUE_COUNT=0
RUNNING_AGENTS=""
STANDBY_AGENTS=""
BRIDGE_STATUS="⏳ unknown"

# ─── Check bridge state ──────────────────────────────────────────────────

BRIDGE_STATE="$BRIDGE_DIR/model-bridge/bridge-state.json"
if [ -f "$BRIDGE_STATE" ]; then
  STATUS=$(grep -o '"status": *"[^"]*"' "$BRIDGE_STATE" | cut -d'"' -f4)
  [ "$STATUS" = "running" ] && BRIDGE_STATUS="✅ RUNNING" || BRIDGE_STATUS="⛔ $STATUS"
else
  BRIDGE_STATUS="⚠️ NO STATE FILE"
fi

# ─── Agent status loop ────────────────────────────────────────────────────

for agent in hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui; do
  outbox=$(find "$OUTBOX_DIR/$agent" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_OUTBOX=$((TOTAL_OUTBOX + outbox))

  # Determine running vs standby
  case "$agent" in
    hermes|codex|opencode|zcode|kiro|copilot|zai_tui)
      RUNNING_COUNT=$((RUNNING_COUNT + 1))
      [ -n "$RUNNING_AGENTS" ] && RUNNING_AGENTS="$RUNNING_AGENTS, "
      RUNNING_AGENTS="${RUNNING_AGENTS}$agent($outbox)"
      ;;
    claude|antigravity2|webmcp|planner)
      STANDBY_COUNT=$((STANDBY_COUNT + 1))
      [ -n "$STANDBY_AGENTS" ] && STANDBY_AGENTS="$STANDBY_AGENTS, "
      STANDBY_AGENTS="${STANDBY_AGENTS}$agent($outbox)"
      ;;
  esac
done

# ─── Queue count ──────────────────────────────────────────────────────────

QUEUE_COUNT=$(find "$QUEUE_DIR" -name 'TASK-*.json' 2>/dev/null | wc -l | tr -d ' ')

# ─── Last sync check ──────────────────────────────────────────────────────

LAST_RECEIPT=$(ls -t "$BRIDGE_DIR/receipts/" 2>/dev/null | head -1)
LAST_SYNC="never"
if [ -n "$LAST_RECEIPT" ]; then
  TS=$(grep -o '"timestamp": *"[^"]*"' "$BRIDGE_DIR/receipts/$LAST_RECEIPT" 2>/dev/null | cut -d'"' -f4)
  [ -n "$TS" ] && LAST_SYNC="$TS"
fi

# ─── Output ───────────────────────────────────────────────────────────────

cat <<- STATUS
🤖 GhostClaw Agent Status
━━━━━━━━━━━━━━━━━━━

Active (${RUNNING_COUNT}): ${RUNNING_AGENTS}
Standby (${STANDBY_COUNT}): ${STANDBY_AGENTS}
Outbox total: ${TOTAL_OUTBOX}
Queue: ${QUEUE_COUNT} pending

Bridge: ${BRIDGE_STATUS}
Last sync: ${LAST_SYNC}

${TIMESTAMP}
STATUS
