#!/bin/bash
# a2a-dispatch — send an A2A task to any agent tool
# Usage:
#   a2a-dispatch codex "Refactor the auth module"
#   a2a-dispatch claude "Design the database schema"
#   a2a-dispatch opencode "Review the changes in apps/"
#   a2a-dispatch hermes "Orchestrate the full pipeline"
#   a2a-dispatch --watch   # Run bridge in watch mode

set -eo pipefail

A2A_QUEUE="${A2A_QUEUE:-$(dirname "$0")}"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$A2A_QUEUE")}"
UUID="${A2A_UUID:-$(uuidgen 2>/dev/null || echo "$(date +%s)-$$")}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

AGENT_MAP_CODEX="codex-captain"
AGENT_MAP_CLAUDE="claude-architect"
AGENT_MAP_OPENCODE="opencode-reviewer"
AGENT_MAP_HERMES="hermes-commander"

usage() {
    echo "Usage:"
    echo "  $0 <agent> <goal> [files...]"
    echo "  $0 --watch"
    echo ""
    echo "Agents: codex, claude, opencode, hermes, antigravity"
    echo ""
    echo "Examples:"
    echo "  $0 codex 'Fix the login bug' src/auth/login.ts"
    echo "  $0 claude 'Design API architecture'"
    echo "  $0 opencode 'Review app changes' apps/"
    echo "  $0 --watch   # Run bridge (process inbox)"
    exit 1
}

if [ $# -eq 0 ]; then
    usage
fi

if [ "$1" = "--watch" ]; then
    exec python3 "$A2A_QUEUE/a2a-bridge.py" --watch
fi

if [ $# -lt 2 ]; then
    usage
fi

AGENT_NAME="$1"
GOAL="$2"
shift 2

# Build files JSON array safely
if [ $# -gt 0 ]; then
    FILES_JSON="["
    sep=""
    for f in "$@"; do
        FILES_JSON="${FILES_JSON}${sep}\"${f}\""
        sep=", "
    done
    FILES_JSON="${FILES_JSON}]"
else
    FILES_JSON="[]"
fi

case "$AGENT_NAME" in
    codex|codex-captain)
        TO_AGENT="codex-captain"
        TO_ROLE="build_captain"
        ;;
    claude|claude-architect|opus)
        TO_AGENT="claude-architect"
        TO_ROLE="chief_architect"
        ;;
    opencode|opencode-reviewer)
        TO_AGENT="opencode-reviewer"
        TO_ROLE="independent_reviewer"
        ;;
    hermes|hermes-commander)
        TO_AGENT="hermes-commander"
        TO_ROLE="mission_commander"
        ;;
    antigravity|agy)
        TO_AGENT="antigravity2"
        TO_ROLE="speed_execution"
        ;;
    *)
        echo "Unknown agent: $AGENT_NAME"
        echo "Known: codex, claude, opencode, hermes, antigravity"
        exit 1
        ;;
esac

MISSION_ID="M-$(date +%Y%m%d)-$$"
CORRELATION_ID="a2a-${AGENT_NAME}-$(date +%s)-${RANDOM}"

cat > "$A2A_QUEUE/inbox/packet_${MISSION_ID}.json" << EOF
{
  "a2a2a_version": "2.0",
  "mission_id": "${MISSION_ID}",
  "correlation_id": "${CORRELATION_ID}",
  "phase": "dispatch",
  "from": {
    "agent": "human-operator",
    "role": "operator"
  },
  "to": {
    "agent": "${TO_AGENT}",
    "role": "${TO_ROLE}"
  },
  "action_requested": "${GOAL}",
  "context": {
    "goal": "${GOAL}",
    "constraints": [
      "no deploy",
      "no git push",
      "no cloud mutation",
      "no secret read or print",
      "no external send",
      "dry-run first"
    ],
    "lane": "",
    "files": ${FILES_JSON},
    "deliverables": [],
    "command_source": "operator"
  },
  "response_expected": {
    "format": "receipt_json",
    "max_turns": 3
  },
  "human_approval_required": false,
  "timestamp": "${TIMESTAMP}",
  "ttl_seconds": 86400,
  "status": "PENDING",
  "safe_execution_v3": {
    "mode": "full_auto_yolo_safe_execution",
    "blocked_action_behavior": "auto_block_and_continue"
  }
}
EOF

echo "✅ Dispatched mission ${MISSION_ID} → ${TO_AGENT}"
echo "   Goal: ${GOAL}"
echo "   Correlation: ${CORRELATION_ID}"
echo ""
echo "Process with: python3 ${A2A_QUEUE}/a2a-bridge.py --once"
echo "Or watch:     python3 ${A2A_QUEUE}/a2a-bridge.py --watch"
