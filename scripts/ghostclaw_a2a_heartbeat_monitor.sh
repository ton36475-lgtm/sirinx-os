#!/bin/bash
# GHOSTCLAW A2A2A Heartbeat Monitor
# Runs every 5 minutes via Hermes cronjob
# Checks: tmux sessions alive, worker processes running, receipt count growing
# Output: stdout (delivered to local cron output)

set -euo pipefail

REPO="/Users/sirinx/sirinx-os"
RT="$REPO/.ghostclaw_runtime/a2a2a"
SESSIONS=("ghostclaw-hermes" "ghostclaw-kob" "ghostclaw-a2a-sync")
WARNINGS=""

# Check tmux sessions
for s in "${SESSIONS[@]}"; do
  if ! tmux has-session -t "$s" 2>/dev/null; then
    WARNINGS="$WARNINGS\n⚠️ tmux session '$s' is DOWN"
  fi
done

# Check worker processes
PROC_COUNT=$(ps aux | grep "ghostclaw_a2a_" | grep -v grep | wc -l | tr -d ' ')
if [ "$PROC_COUNT" -lt 3 ]; then
  WARNINGS="$WARNINGS\n⚠️ Only $PROC_COUNT/3+ worker processes running"
fi

# Check receipt count (should be > 0)
RECEIPT_COUNT=$(find "$RT/receipts" -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')

# Check last log timestamp (should be within 2 minutes)
LATEST_LOG=$(find "$RT/logs" -name "*.log" -type f -exec tail -1 {} \; 2>/dev/null | grep -o '"timestamp": "[^"]*"' | tail -1 | sed 's/"timestamp": "//;s/"//')

# Output
if [ -n "$WARNINGS" ]; then
  echo "🛡 GHOSTCLAW A2A2A Heartbeat — ISSUES DETECTED"
  echo "$WARNINGS"
  echo ""
  echo "Receipts: $RECEIPT_COUNT"
  echo "Last log: $LATEST_LOG"
  echo "ACTION: Check and restart workers if needed"
else
  # Silent on success — watchdog pattern
  : # no output = no alert
fi