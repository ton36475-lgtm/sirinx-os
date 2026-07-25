#!/bin/bash
# QA Engineering Auto-Review Runner
# Checks all recent A2A2A packets and produces QA receipts
set -e

REPO="/Users/sirinx/sirinx-os"
RUNTIME="$REPO/.ghostclaw_runtime/a2a2a"
RECEIPTS="$RUNTIME/receipts"
EVIDENCE="$RUNTIME/evidence"
QA_LOG="$RUNTIME/qa-reviews/qa-review-$(date +%Y%m%d-%H%M%S).json"
OUTBOX="$RUNTIME/outbox"

mkdir -p "$RUNTIME/qa-reviews"

cd "$REPO"

# Collect git status
GIT_STATUS=$(git status --short 2>/dev/null || echo "NO_REPO")
GIT_DIFF=$(git diff --stat 2>/dev/null || echo "NO_DIFF")
GIT_DIFF_CHECK=$(git diff --check 2>/dev/null || echo "NO_DIFF_CHECK")

# Check all outbox agents
AGENTS="hermes codex claude opencode zcode zai_tui kiro copilot antigravity2 webmcp planner"

echo "{\"qa_review_id\": \"QA-REVIEW-$(date +%Y%m%d-%H%M%S)\"," > "$QA_LOG"
echo "\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$QA_LOG"
echo "\"review_type\": \"automatic_15min\"," >> "$QA_LOG"
echo "\"git_status\": \"$GIT_STATUS\"," >> "$QA_LOG"
echo "\"git_diff_stat\": \"$(echo $GIT_DIFF | tr '\n' ' ')\"," >> "$QA_LOG"

# Check each agent's outbox for pending packets
echo "\"agent_outbox_status\": {" >> "$QA_LOG"
FIRST=true
for agent in $AGENTS; do
    PENDING_FILES=$(ls "$OUTBOX/$agent/"*.md 2>/dev/null || true)
    INBOX_FILES=$(ls "$RUNTIME/inbox/$agent/"*.md 2>/dev/null || true)
    if [ "$FIRST" = true ]; then FIRST=false; else echo "," >> "$QA_LOG"; fi
    echo -n "\"$agent\": {\"pending_packets\": $(ls "$OUTBOX/$agent/"*.md 2>/dev/null | wc -l | tr -d ' '), \"responses\": $(ls "$RUNTIME/inbox/$agent/"*.md 2>/dev/null | wc -l | tr -d ' ')}" >> "$QA_LOG"
done
echo "}," >> "$QA_LOG"

# Check for secrets in diff
SECRET_LEAKS=$(git diff HEAD 2>/dev/null | grep '^+' | grep -i -E '(api.?key|token|secret|password|\.env)' | \
    grep -v '+++' | \
    grep -v '\.env\.example' | \
    grep -v 'grep' | \
    grep -vi 'changeme\|CHANGE_ME\|YOUR_' | \
    grep -v 'os\.environ' | \
    grep -v 'process\.env' | \
    grep -v 'secret_access' | \
    grep -v 'readRuntimeSecret' | \
    grep -v 'HARD_DENY_ACTION_TYPES' | \
    grep -v 'js-tokens' | \
    grep -v 'jsonwebtoken' | \
    grep -vi 'no.secret' | \
    grep -v 'LINE_CHANNEL' | \
    grep -v 'secret.access' | \
    grep -v 'r"' | \
    grep -v '\.env$' | \
    grep -v '=\s*$' || true)
if [ -n "$SECRET_LEAKS" ]; then
    echo "\"secret_leaks_detected\": true," >> "$QA_LOG"
    echo "\"secret_leaks\": \"$(echo $SECRET_LEAKS | tr '\n' ' ')\"," >> "$QA_LOG"
else
    echo "\"secret_leaks_detected\": false," >> "$QA_LOG"
fi

# Check receipt validity
RECEIPT_COUNT=$(ls "$RECEIPTS/"*.json 2>/dev/null | wc -l | tr -d ' ')
EVIDENCE_COUNT=$(ls "$EVIDENCE/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "\"receipt_count\": $RECEIPT_COUNT," >> "$QA_LOG"
echo "\"evidence_count\": $EVIDENCE_COUNT," >> "$QA_LOG"

# Check for git push safety
PUSH_REF=$(git log --oneline -1 2>/dev/null | grep -c 'push\|Push\|PUSH' || true)

# Overall verdict
if [ "$SECRET_LEAKS" != "" ]; then
    VERDICT="BLOCK"
elif [ "$GIT_DIFF_CHECK" != "NO_DIFF_CHECK" ] && echo "$GIT_DIFF_CHECK" | grep -q 'error\|conflict\|whitespace'; then
    VERDICT="FAIL"
elif [ "$RECEIPT_COUNT" -gt 0 ] && [ "$EVIDENCE_COUNT" -gt 0 ]; then
    VERDICT="PASS"
else
    VERDICT="PASS_WARN"
fi

echo "\"verdict\": \"$VERDICT\"" >> "$QA_LOG"
echo "}" >> "$QA_LOG"

echo "QA Review Complete: $VERDICT"
echo "Log: $QA_LOG"
exit 0
