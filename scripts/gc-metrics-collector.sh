#!/usr/bin/env bash
# GC-METRICS-COLLECTOR — GhostClaw Feedback/Metrics Collector
# Records and reports on agent execution metrics
#
# Usage:
#   gc-metrics-collector.sh record <agent_id> <task_type> <latency_ms> <tokens_used> <passed>
#   gc-metrics-collector.sh report
#
# Record mode: appends a row to metrics.csv
# Report mode: prints summary stats from the CSV + runtime data

set -euo pipefail

REPO="/Users/sirinx/sirinx-os"
METRICS_DIR="$REPO/.ghostclaw_runtime/metrics"
CSV_FILE="$METRICS_DIR/metrics.csv"
DATE=$(date +%Y-%m-%d)
NOW=$(date +%Y-%m-%dT%H:%M:%S%z)

# ── Ensure CSV header exists ──
ensure_header() {
  if [ ! -f "$CSV_FILE" ]; then
    mkdir -p "$METRICS_DIR"
    echo "timestamp,agent_id,task_type,latency_ms,tokens_used,passed" > "$CSV_FILE"
  fi
}

# ── Record mode: append a metric row ──
cmd_record() {
  if [ $# -lt 5 ]; then
    echo "Usage: gc-metrics-collector.sh record <agent_id> <task_type> <latency_ms> <tokens_used> <passed>"
    echo ""
    echo "  agent_id    — name/ID of the agent (e.g. codex, hermes, claude)"
    echo "  task_type   — category of task (e.g. code_review, bridge_sync, qa_test)"
    echo "  latency_ms  — execution time in milliseconds"
    echo "  tokens_used — total tokens consumed"
    echo "  passed      — 1 for pass, 0 for fail"
    exit 1
  fi

  ensure_header

  local agent_id="$1"
  local task_type="$2"
  local latency_ms="$3"
  local tokens_used="$4"
  local passed="$5"

  echo "$NOW,$agent_id,$task_type,$latency_ms,$tokens_used,$passed" >> "$CSV_FILE"
  echo "✓ Recorded: [$DATE] $agent_id/$task_type — ${latency_ms}ms, ${tokens_used}tok, $([ "$passed" = "1" ] && echo "PASS" || echo "FAIL")"
}

# ── Report mode: print summary stats ──
cmd_report() {
  if [ ! -f "$CSV_FILE" ]; then
    echo "No metrics data yet. Run with 'record' first."
    exit 0
  fi

  echo "============================================"
  echo "  GHOSTCLAW METRICS REPORT — $(date)"
  echo "============================================"
  echo ""

  # ── CSV summary ──
  local total_lines
  total_lines=$(wc -l < "$CSV_FILE")
  local data_lines=$(( total_lines - 1 ))  # subtract header

  if [ "$data_lines" -le 0 ]; then
    echo "No data rows in metrics.csv (header only)."
    echo ""
  else
    echo "── Overall Stats ──"
    echo "Total executions:   $data_lines"

    # Pass rate
    local passed_total failed_total
    passed_total=$(awk -F',' 'NR>1 && $6==1 {count++} END {print count+0}' "$CSV_FILE")
    failed_total=$(awk -F',' 'NR>1 && $6==0 {count++} END {print count+0}' "$CSV_FILE")
    local pass_rate="0"
    if [ "$data_lines" -gt 0 ]; then
      pass_rate=$(awk "BEGIN {printf \"%.1f\", ($passed_total / $data_lines) * 100}")
    fi
    echo "Pass rate:          $passed_total / $data_lines ($pass_rate%)"
    echo "Failures:           $failed_total"

    # Average latency
    local avg_latency avg_tokens
    avg_latency=$(awk -F',' 'NR>1 {sum+=$4; count++} END {printf "%.0f", sum/count}' "$CSV_FILE")
    avg_tokens=$(awk -F',' 'NR>1 {sum+=$5; count++} END {printf "%.0f", sum/count}' "$CSV_FILE")
    echo "Avg latency:        ${avg_latency}ms"
    echo "Avg tokens/run:     ${avg_tokens}"

    # By agent
    echo ""
    echo "── By Agent ──"
    awk -F',' 'NR>1 {
      agent[$2]++; passed[$2]+=$6; latency[$2]+=$4; tokens[$2]+=$5
    } END {
      for (a in agent) {
        pr = (passed[a] / agent[a]) * 100
        printf "  %-15s %3d runs  %5.0fms avg  %5.0f tok avg  %5.1f%% pass\n", a, agent[a], latency[a]/agent[a], tokens[a]/agent[a], pr
      }
    }' "$CSV_FILE" | sort

    # By task type
    echo ""
    echo "── By Task Type ──"
    awk -F',' 'NR>1 {
      type[$3]++; passed[$3]+=$6; latency[$3]+=$4
    } END {
      for (t in type) {
        pr = (passed[t] / type[t]) * 100
        printf "  %-20s %3d runs  %5.0fms avg  %5.1f%% pass\n", t, type[t], latency[t]/type[t], pr
      }
    }' "$CSV_FILE" | sort

    # Today's stats
    echo ""
    echo "── Today ($DATE) ──"
    local today_total today_pass today_fail
    today_total=$(awk -F',' -v d="$DATE" 'NR>1 && index($1,d) {count++} END {print count+0}' "$CSV_FILE")
    today_pass=$(awk -F',' -v d="$DATE" 'NR>1 && index($1,d) && $6==1 {count++} END {print count+0}' "$CSV_FILE")
    today_fail=$(awk -F',' -v d="$DATE" 'NR>1 && index($1,d) && $6==0 {count++} END {print count+0}' "$CSV_FILE")
    echo "  Runs:     $today_total"
    echo "  Passed:   $today_pass"
    echo "  Failed:   $today_fail"
    if [ "$today_total" -gt 0 ]; then
      local today_rate
      today_rate=$(awk "BEGIN {printf \"%.1f\", ($today_pass / $today_total) * 100}")
      echo "  Pass rate: $today_rate%"
    fi
  fi

  # ── Git commits today ──
  echo ""
  echo "── Git Commits Today ──"
  if cd "$REPO" 2>/dev/null; then
    local commit_count
    commit_count=$(git log --oneline --since="today" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Commits today:  $commit_count"
  else
    echo "  (unable to read git repo)"
  fi

  # ── Queue / Outbox counts ──
  echo ""
  echo "── Agent Outbox / Queue ──"
  local QUEUE_DIR="$REPO/.ghostclaw_runtime/queue"
  if [ -d "$QUEUE_DIR" ]; then
    local task_count
    task_count=$(find "$QUEUE_DIR" -maxdepth 1 -type f -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
    echo "  Queue tasks:    $task_count"
    # Count pending vs completed from queue task JSONs
    local pending_count
    pending_count=0
    for f in "$QUEUE_DIR"/*.json; do
      if [ -f "$f" ]; then
        local status
        status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$f" 2>/dev/null | head -1 | grep -o '"[^"]*"$' | tr -d '"')
        if [ "$status" = "pending" ] || [ "$status" = "queued" ]; then
          pending_count=$(( pending_count + 1 ))
        fi
      fi
    done 2>/dev/null || true
    echo "  Pending tasks:  $pending_count"
  else
    echo "  Queue directory not found"
  fi

  # ── Bridge sync latency ──
  echo ""
  echo "── A2A Bridge Sync ──"
  local SYNC_FILE="$REPO/.ghostclaw_runtime/a2a-sync-status.json"
  if [ -f "$SYNC_FILE" ]; then
    local sync_ts inbox allowed blocked
    sync_ts=$(grep -o '"timestamp"[[:space:]]*:[[:space:]]*"[^"]*"' "$SYNC_FILE" 2>/dev/null | head -1 | sed 's/.*: "\(.*\)"/\1/')
    inbox=$(grep -o '"inbox_count"[[:space:]]*:[[:space:]]*[0-9]*' "$SYNC_FILE" 2>/dev/null | sed 's/.*: //')
    allowed=$(grep -o '"allowed"[[:space:]]*:[[:space:]]*[0-9]*' "$SYNC_FILE" 2>/dev/null | sed 's/.*: //')
    blocked=$(grep -o '"blocked"[[:space:]]*:[[:space:]]*[0-9]*' "$SYNC_FILE" 2>/dev/null | sed 's/.*: //')
    echo "  Last sync:      $sync_ts"
    [ -n "$inbox" ]  && echo "  Inbox count:    $inbox"
    [ -n "$allowed" ] && echo "  Allowed:        $allowed"
    [ -n "$blocked" ] && echo "  Blocked:        $blocked"

    # Compute bridge sync latency from last sync timestamp
    if command -v python3 &>/dev/null && [ -n "$sync_ts" ]; then
      local latency_display
      latency_display=$(python3 -c "
import datetime, sys
try:
    sync = datetime.datetime.fromisoformat('$sync_ts'.replace('Z', '+00:00'))
    now = datetime.datetime.now(datetime.timezone.utc)
    delta = now - sync
    secs = int(delta.total_seconds())
    if secs < 60:
        print(f'{secs}s ago')
    elif secs < 3600:
        print(f'{secs//60}m {secs%60}s ago')
    else:
        print(f'{secs//3600}h {(secs%3600)//60}m ago')
except:
    print('unknown')
")
      echo "  Sync age:       $latency_display"
    fi
  else
    echo "  No A2A sync status found"
  fi

  echo ""
  echo "============================================"
}

# ── Main dispatcher ──
case "${1:-help}" in
  record)
    shift
    cmd_record "$@"
    ;;
  report)
    cmd_report
    ;;
  --help|-h|help)
    echo "GHOSTCLAW Metrics Collector"
    echo ""
    echo "Usage:"
    echo "  $0 record <agent_id> <task_type> <latency_ms> <tokens_used> <passed>"
    echo "    Append a metric row to metrics.csv"
    echo ""
    echo "  $0 report"
    echo "    Print summary stats from metrics.csv + runtime context"
    echo ""
    echo "Examples:"
    echo "  $0 record codex code_review 3420 1500 1"
    echo "  $0 record hermes bridge_sync 850 420 1"
    echo "  $0 record claude qa_test 12000 3200 0"
    echo "  $0 report"
    ;;
  *)
    echo "Unknown command: ${1:-}"
    echo "Usage: $0 {record|report|help}"
    exit 1
    ;;
esac
