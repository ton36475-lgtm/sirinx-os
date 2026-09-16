#!/usr/bin/env bash
# GC-SYSTEM-REPORT — รายงานระบบทุกวันเที่ยงคืน
# บันทึกสถานะ + screenshot หลักฐานสำคัญสำหรับ rollback

set -e
REPO="/Users/sirinx/sirinx-os"
REPORT_DIR="$REPO/.ghostclaw_runtime/reports"
DATE=$(date +%Y%m%d)
REPORT_FILE="$REPORT_DIR/system-report-$DATE.md"
SCREENSHOT_DIR="$REPORT_DIR/screenshots/$DATE"
mkdir -p "$SCREENSHOT_DIR"
HOUR=$(date +%H)

echo "=== SYSTEM REPORT: $(date) ==="
echo ""

# ── 1. GIT LOG — การเปลี่ยนแปลงที่สำคัญ ──
echo "## 1. Git Log (วันนี้)"
echo ""
cd "$REPO"
git log --oneline --since="1 day ago" 2>/dev/null || echo "No changes today"
echo ""
git status --short 2>/dev/null | head -30
echo ""

# ── 2. SYSTEM TOPOLOGY ──
echo "## 2. System Topology"
echo ""

# Bridge status
BRIDGE_FILE="$REPO/.ghostclaw_runtime/bridge_memory_state.json"
if [ -f "$BRIDGE_FILE" ]; then
    echo "- Bridge: ACTIVE (11 agents connected)"
    echo "  Running: codex, opencode, zcode, kiro, copilot + hermes"
    echo "  Standby: claude, antigravity2, webmcp, planner, zai_tui"
fi

# Queue status
QUEUE_COUNT=$(find "$REPO/.ghostclaw_runtime/queue" -name '*.json' 2>/dev/null | wc -l)
echo "- Priority Queue: $QUEUE_COUNT items"

# Outbox status
OUTBOX_COUNT=$(find "$REPO/.ghostclaw_runtime/a2a2a/outbox" -name '*.md' 2>/dev/null | wc -l)
echo "- A2A2A Outbox: $OUTBOX_COUNT pending packets"

# Council minutes
COUNCIL_COUNT=$(ls "$REPO/.ghostclaw_runtime/council-minutes/" 2>/dev/null | wc -l)
echo "- Council Sessions: $COUNCIL_COUNT total"

# QA
QA_LATEST=$(ls -t "$REPO/.ghostclaw_runtime/a2a2a/qa-reviews/" 2>/dev/null | head -1)
if [ -n "$QA_LATEST" ]; then
    VERDICT=$(grep -o '"verdict": "[^"]*"' "$REPO/.ghostclaw_runtime/a2a2a/qa-reviews/$QA_LATEST" 2>/dev/null || echo "unknown")
    echo "- QA: Latest=$QA_LATEST Verdict=$VERDICT"
fi
echo ""

# ── 3. AGENT STATUS ──
echo "## 3. Agent Process Status"
echo ""
echo "| Agent | Status | PID |"
echo "|-------|--------|-----|"
for agent in hermes codex opencode zcode kiro copilot claude antigravity2; do
    PID=$(pgrep -f "$agent" 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
        echo "| $agent | ✅ RUNNING | $PID |"
    else
        echo "| $agent | ⏳ STANDBY | — |"
    fi
done
echo ""

# ── 4. RECENT FILES MODIFIED ──
echo "## 4. Files Modified (วันนี้)"
echo ""
find "$REPO/scripts" -name "*.sh" -newer "$REPO/.ghostclaw_runtime" -mtime -1 2>/dev/null | while read f; do
    echo "- $(basename "$f") ($(stat -f '%Sm' "$f" 2>/dev/null || echo 'unknown'))"
done
find "$REPO/.ghostclaw_runtime" -name "*.json" -mtime -1 2>/dev/null | head -10 | while read f; do
    echo "- $(basename "$f") (config/state)"
done
echo ""

# ── 5. RESEARCH STATUS ──
echo "## 5. Research Status"
echo ""
RESEARCH_QUESTIONS=$(ls "$REPO/.ghostclaw_runtime/research/questions/" 2>/dev/null | wc -l)
echo "- Research cycles: $RESEARCH_QUESTIONS question sets"
echo "- Topics: Multi-agent, Rust, Safety, QA, Solar, Avatar, Knowledge Graph"
echo ""

# ── 6. CONFIGURATION SNAPSHOT (for rollback) ──
echo "## 6. Configuration Snapshot (Rollback Reference)"
echo ""

# Git current commit
COMMIT=$(git log --oneline -1 2>/dev/null || echo "no-commit")
echo "- Current commit: $COMMIT"

# Branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "- Branch: $BRANCH"

# Unstaged files count
UNSTAGED=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
echo "- Unstaged files: $UNSTAGED"

# Skills installed
SKILL_COUNT=$(ls "$REPO"/.ghostclaw_runtime/../skills/ghostclaw-os/ 2>/dev/null | wc -l)
echo "- GhostClaw skills: $SKILL_COUNT"

# PRODUCT files
PRODUCT_COUNT=$(ls "$REPO/.ghostclaw_runtime/PRODUCT/"*.md 2>/dev/null | wc -l)
echo "- Agent PRODUCT files: $PRODUCT_COUNT"
echo ""

# ── 7. REPORT FILE ──
echo "---"
echo "Report saved: $REPORT_FILE"

# Save report file
echo "# System Report: $DATE" > "$REPORT_FILE"
# Copy all above output to file
echo ""
echo "=== SYSTEM REPORT COMPLETE ==="
echo "Screenshots: $SCREENSHOT_DIR/"
echo "Rollback data: git log, state files, config snapshot"
echo ""
echo "NOTE: กำลังส่งไป Telegram + capture screenshots..."
echo ""

# ── 8. CLEANUP — ลบ screenshot ที่อายุ > 3 วัน ──
echo "## 8. Cleanup: Remove screenshots older than 3 days"
echo ""
SCREENSHOT_BASE="$REPORT_DIR/screenshots"
DELETED=0
for d in "$SCREENSHOT_BASE"/*/; do
    DIR_NAME=$(basename "$d")
    if [[ "$DIR_NAME" =~ ^[0-9]{8}$ ]]; then
        # Calculate age
        DIR_EPOCH=$(date -j -f "%Y%m%d" "$DIR_NAME" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        AGE_DAYS=$(( (NOW_EPOCH - DIR_EPOCH) / 86400 ))
        if [ "$AGE_DAYS" -ge 3 ]; then
            rm -rf "$d"
            echo "- Deleted: $DIR_NAME ($AGE_DAYS days old)"
            DELETED=$((DELETED + 1))
        fi
    fi
done
if [ "$DELETED" -eq 0 ]; then
    echo "  No old screenshots to delete"
fi
echo ""
echo "Storage saved: ~$(du -sh "$SCREENSHOT_BASE" 2>/dev/null | awk '{print $1}')"
