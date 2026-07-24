#!/usr/bin/env bash
# GC Priority Queue — bash shim for gc-orch Go REST API (:8721)
# Delegates all queue operations to gc-orch's Go backend.
#
# Usage: bash scripts/gc-priority-queue.sh [add|list|process|status]
#
# Backward-compatible with the original file-based implementation,
# now backed by go/gc-orch in-memory queue with REST endpoints.

set -e
GC_ORCH_HOST="${GC_ORCH_HOST:-localhost}"
GC_ORCH_PORT="${GC_ORCH_PORT:-8721}"
BASE="http://${GC_ORCH_HOST}:${GC_ORCH_PORT}"

ACTION="${1:-list}"

case "$ACTION" in
    add)
        TITLE="${2:-Untitled}"
        PRIORITY="${3:-P2}"
        OWNER="${4:-unassigned}"
        # Validate priority
        case "$PRIORITY" in
            P0|P1|P2|P3) ;;
            *) echo "❌ Invalid priority: $PRIORITY (use P0|P1|P2|P3)" >&2; exit 1 ;;
        esac
        RESPONSE=$(curl -sf -X POST "$BASE/queue" \
            -H 'Content-Type: application/json' \
            -d "$(printf '{"title":"%s","priority":"%s","owner":"%s"}' "$TITLE" "$PRIORITY" "$OWNER")") || {
            echo "❌ Failed to add task — gc-orch unreachable on $BASE" >&2
            exit 1
        }
        ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "✅ $ID | $PRIORITY | $TITLE | $OWNER"
        ;;

    list)
        echo "=== PRIORITY QUEUE ==="
        echo ""
        RESPONSE=$(curl -sf "$BASE/queue") || {
            echo "❌ Failed to list queue — gc-orch unreachable on $BASE" >&2
            exit 1
        }
        # Format: grouped by priority like the original bash script
        for p in P0 P1 P2 P3; do
            # Extract items for this priority using grep/sed on the JSON array
            ITEMS=$(echo "$RESPONSE" | grep -o '{[^}]*"priority":"'"$p"'"[^}]*}' 2>/dev/null) || true
            if [ -n "$ITEMS" ]; then
                echo "--- $p ---"
                while IFS= read -r item; do
                    ID=$(echo "$item" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
                    TITLE=$(echo "$item" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
                    STATUS=$(echo "$item" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
                    OWNER=$(echo "$item" | grep -o '"owner":"[^"]*"' | head -1 | cut -d'"' -f4)
                    echo "  $ID | $STATUS | $OWNER | $TITLE"
                done <<< "$ITEMS"
                echo ""
            fi
        done
        TOTAL=$(echo "$RESPONSE" | grep -o '"priority":"[^"]*"' | wc -l | tr -d ' ')
        echo "=== ${TOTAL:-0} total items ==="
        ;;

    process)
        echo "=== PROCESS QUEUE ==="
        NEXT=$(curl -sf "$BASE/queue/next" 2>/dev/null) || {
            echo "  (queue empty or no pending items)"
            echo "---"
            echo "Use: queue.sh add 'title' P0|P1|P2|P3 owner"
            exit 0
        }
        ID=$(echo "$NEXT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        TITLE=$(echo "$NEXT" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
        PRIORITY=$(echo "$NEXT" | grep -o '"priority":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "  👉 $ID | $PRIORITY | $TITLE"
        echo "---"
        echo "Use: queue.sh process <task-id> to execute"
        ;;

    status)
        RESPONSE=$(curl -sf "$BASE/status") || {
            echo "❌ Failed to get status — gc-orch unreachable on $BASE" >&2
            exit 1
        }
        P0=$(echo "$RESPONSE" | grep -o '"P0":[0-9]*' | cut -d: -f2)
        P1=$(echo "$RESPONSE" | grep -o '"P1":[0-9]*' | cut -d: -f2)
        P2=$(echo "$RESPONSE" | grep -o '"P2":[0-9]*' | cut -d: -f2)
        P3=$(echo "$RESPONSE" | grep -o '"P3":[0-9]*' | cut -d: -f2)
        TOTAL=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
        echo "=== QUEUE STATUS ==="
        echo "🔴 P0 (Blocker):    ${P0:-0}"
        echo "🟡 P1 (Feature):    ${P1:-0}"
        echo "🟢 P2 (Improvement): ${P2:-0}"
        echo "⚪ P3 (Background):  ${P3:-0}"
        echo "───"
        echo "Total: ${TOTAL:-0} items"
        ;;

    *)
        echo "Usage: $0 [add|list|process|status]"
        echo "  add 'title' P0|P1|P2|P3 owner"
        echo "  list"
        echo "  process"
        echo "  status"
        ;;
esac
