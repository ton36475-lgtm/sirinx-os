#!/usr/bin/env bash
# GHOSTCLAW Agent Council — Daily Meeting Orchestrator
set -e

REPO="/Users/sirinx/sirinx-os"
COUNCIL_DIR="$REPO/.ghostclaw_runtime/council-minutes"
mkdir -p "$COUNCIL_DIR"

DATE=$(date +%Y%m%d)
COUNTER=1
LATEST=$(ls -t "$COUNCIL_DIR" 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
    COUNTER=$((10#$(echo "$LATEST" | grep -oP '\d+(?=\.json$)' | head -1) + 1))
fi

COUNCIL_ID="COUNCIL-${DATE}-$(printf '%03d' $COUNTER)"

echo "=== GC COUNCIL SESSION ==="
echo "Council: $COUNCIL_ID"
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Phase: OPENING"
echo ""

# 1. Roll call — check which agents are running
echo "--- ROLL CALL ---"
for role in "flagship:hermes,brain-curator" "build_ops:codex,opencode" "integration:kiro,webmcp" "qa_security:copilot,claude"; do
    ship="${role%%:*}"
    agents="${role#*:}"
    for agent in ${agents//,/ }; do
        running=$(pgrep -f "$agent" 2>/dev/null | head -1)
        if [ -n "$running" ]; then
            echo "  ✅ $ship / $agent (PID $running)"
        else
            echo "  ❌ $ship / $agent (not running)"
        fi
    done
done

echo ""
echo "--- SKILLS READY ---"
cd "$REPO"
for skill in ~/.hermes/profiles/solis/skills/ghostclaw-os/*/SKILL.md; do
    name=$(basename "$(dirname "$skill")")
    echo "  📘 $name"
done

echo "--- RESEARCH AGENDA ---"
# Pull latest research findings for council discussion
RESEARCH_DIR="$REPO/.ghostclaw_runtime/research/questions"
LATEST_RESEARCH=$(ls -t "$RESEARCH_DIR"/*.json 2>/dev/null | head -1)
if [ -n "$LATEST_RESEARCH" ]; then
    echo "  Research findings found: $(basename "$LATEST_RESEARCH")"
    # Read research topics
    RESEARCH_TOPICS=$(grep -o '"topic": "[^"]*"' "$LATEST_RESEARCH" 2>/dev/null | head -7)
    if [ -n "$RESEARCH_TOPICS" ]; then
        echo "  Council Agenda — Research Topics:"
        echo "$RESEARCH_TOPICS" | while read line; do
            topic=$(echo "$line" | sed 's/"topic": "//;s/"//')
            echo "    📋 $topic"
        done
    fi
    # Add to minutes
    echo "\"research_discussed\": {" >> "$MINUTES_FILE"
    echo "\"source\": \"$(basename "$LATEST_RESEARCH" 2>/dev/null)\"," >> "$MINUTES_FILE"
    echo "\"topics\": \"$(cat "$LATEST_RESEARCH" 2>/dev/null | head -30 | tr '\n' ' ')\"" >> "$MINUTES_FILE"
    echo "}," >> "$MINUTES_FILE"
else
    echo "  No new research findings — skip research agenda"
    echo "\"research_discussed\": false," >> "$MINUTES_FILE"
fi

echo ""
echo "--- CURRENT STATE ---"
bash "$REPO/scripts/gc-bridge-orchestrator.sh" status 2>/dev/null || echo "  bridge-check: error"

echo ""
echo "--- COUNCIL MINUTES ---"
MINUTES_FILE="$COUNCIL_DIR/${COUNCIL_ID}.json"
cat > "$MINUTES_FILE" << EOF
{
    "council_id": "$COUNCIL_ID",
    "date": "$(date -u +%Y-%m-%d)",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "phase": "OPENING",
    "ships_present": {
        "flagship": {"status": "running", "crew": ["hermes","brain-curator"]},
        "build_ops": {"status": "checking", "crew": ["codex","opencode"]},
        "integration": {"status": "checking", "crew": ["kiro","webmcp","planner"]},
        "qa_security": {"status": "checking", "crew": ["copilot","claude","antigravity2"]}
    },
    "status_reports": {},
    "planning": {},
    "skill_utilization": [],
    "blockers": [],
    "votes": [],
    "next_council": "$(date -u -v+1d +%Y-%m-%dT08:00:00Z 2>/dev/null || date -u -d '+1 day' +%Y-%m-%dT08:00:00Z)"
}
EOF
echo "Minutes saved: $MINUTES_FILE"
echo ""
echo "=== COUNCIL OPENING COMPLETE ==="
echo ""
echo "Agents: สง minutes + council packet ไปยังทุก ship ผ่าน A2A2A outbox"
