#!/usr/bin/env bash
# GC Priority Queue — จัดลำดับความสำคัญของ Mission/Task
# ใช้: bash scripts/gc-priority-queue.sh [add|list|process|status]

set -e
REPO="/Users/sirinx/sirinx-os"
QUEUE_DIR="$REPO/.ghostclaw_runtime/queue"
mkdir -p "$QUEUE_DIR"

ACTION="${1:-list}"

case "$ACTION" in
    add)
        TITLE="${2:-Untitled}"
        PRIORITY="${3:-P2}"
        OWNER="${4:-unassigned}"
        TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
        ID="TASK-$(date +%Y%m%d)-$(printf '%03d' $(($(ls "$QUEUE_DIR"/*.json 2>/dev/null | wc -l) + 1)))"
        cat > "${QUEUE_DIR}/${ID}.json" << EOF
{
    "id": "$ID",
    "title": "$TITLE",
    "priority": "$PRIORITY",
    "owner": "$OWNER",
    "status": "pending",
    "created": "$TIMESTAMP",
    "phase": "triage"
}
EOF
        echo "✅ $ID | $PRIORITY | $TITLE | $OWNER"
        ;;
    list)
        echo "=== PRIORITY QUEUE ==="
        echo ""
        for p in P0 P1 P2 P3; do
            FILES=$(find "$QUEUE_DIR" -name "*.json" -exec grep -l "\"priority\": \"$p\"" {} \; 2>/dev/null | sort)
            if [ -n "$FILES" ]; then
                echo "--- $p ---"
                while read -r f; do
                    TITLE=$(grep -o '"title": "[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/"title": "//;s/"//')
                    STATUS=$(grep -o '"status": "[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/"status": "//;s/"//')
                    OWNER=$(grep -o '"owner": "[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/"owner": "//;s/"//')
                    ID=$(basename "$f" .json)
                    echo "  $ID | $STATUS | $OWNER | $TITLE"
                done <<< "$FILES"
                echo ""
            fi
        done
        echo "=== $(find "$QUEUE_DIR" -name "*.json" | wc -l | tr -d ' ') total items ==="
        ;;
    process)
        echo "=== PROCESS QUEUE ==="
        for p in P0 P1 P2; do
            for f in $(find "$QUEUE_DIR" -name "*.json" -exec grep -l "\"priority\": \"$p\"" {} \; 2>/dev/null); do
                STATUS=$(grep -o '"status": "[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/"status": "//;s/"//')
                if [ "$STATUS" = "pending" ]; then
                    ID=$(basename "$f" .json)
                    TITLE=$(grep -o '"title": "[^"]*"' "$f" | head -1 | sed 's/"title": "//;s/"//')
                    echo "  👉 $ID | $p | $TITLE"
                fi
            done
        done
        echo "---"
        echo "Use: queue.sh process <task-id> to execute"
        ;;
    status)
        P0=$(find "$QUEUE_DIR" -name "*.json" -exec grep -l '"priority": "P0"' {} \; | wc -l | tr -d ' ')
        P1=$(find "$QUEUE_DIR" -name "*.json" -exec grep -l '"priority": "P1"' {} \; | wc -l | tr -d ' ')
        P2=$(find "$QUEUE_DIR" -name "*.json" -exec grep -l '"priority": "P2"' {} \; | wc -l | tr -d ' ')
        P3=$(find "$QUEUE_DIR" -name "*.json" -exec grep -l '"priority": "P3"' {} \; | wc -l | tr -d ' ')
        TOTAL=$(find "$QUEUE_DIR" -name "*.json" | wc -l | tr -d ' ')
        echo "=== QUEUE STATUS ==="
        echo "🔴 P0 (Blocker):    $P0"
        echo "🟡 P1 (Feature):    $P1"
        echo "🟢 P2 (Improvement): $P2"
        echo "⚪ P3 (Background):  $P3"
        echo "───"
        echo "Total: $TOTAL items"
        ;;
    *)
        echo "Usage: $0 [add|list|process|status]"
        echo "  add 'title' P0|P1|P2|P3 owner"
        echo "  list"
        echo "  process"
        echo "  status"
        ;;
esac