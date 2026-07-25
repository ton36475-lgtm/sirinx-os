#!/bin/bash
# Vibe Coding Sidebar - Autonomous Dispatch
# Multi-agent parallel execution with allwork approval

set -e

VIBE_CONFIG="/Users/sirinx/sirinx-os/vibe-coding-config"
AUTONOMOUS_CONFIG="$VIBE_CONFIG/autonomous_config.json"
REPO_ROOT="/Users/sirinx/sirinx-os"

# Load configuration
if [ ! -f "$AUTONOMOUS_CONFIG" ]; then
    echo "✗ Autonomous config not found"
    exit 1
fi

# Check active agents (CRITICAL)
echo "[STEP 0] Scanning for active agents..."
ACTIVE_AGENTS=$(ps aux | grep -E 'codex|claude|opencode|zcode' | grep -v grep || true)

if [ -n "$ACTIVE_AGENTS" ]; then
    echo "⚠️  Active agents detected:"
    echo "$ACTIVE_AGENTS"
    echo "→ Using A2A sync for coordination"
else
    echo "✓ No active agents - safe to dispatch"
fi

# Function: Dispatch to lane
dispatch_lane() {
    local lane=$1
    local task=$2
    
    echo "→ Dispatching to $lane lane: $task"
    
    cd "$REPO_ROOT/.worktrees/$lane" 2>/dev/null || cd "$REPO_ROOT"
    
    case $lane in
        codex)
            codex "$task" &
            ;;
        opencode)
            opencode "$task" &
            ;;
        claude)
            claude "$task" &
            ;;
        hermes)
            # Hermes handles locally
            hermes "$task" &
            ;;
    esac
    
    echo "✓ $lane dispatch initiated (PID: $!)"
}

# Function: A2A sync pulse
a2a_pulse() {
    local agent=$1
    local action=$2
    local session_id=$3
    local data=$4
    
    export AGENT="$agent" ACTION="$action" SESSION_ID="$session_id" DATA="$data"
    
    if [ -f "$HOME/.hermes/profiles/solis/a2a-sync/a2a-sync.sh" ]; then
        bash "$HOME/.hermes/profiles/solis/a2a-sync/a2a-sync.sh"
    else
        echo "⚠️  A2A sync script not found"
    fi
}

# Main dispatch logic
main() {
    local task=$1
    local lane=${2:-auto}
    
    if [ -z "$task" ]; then
        echo "Usage: $0 'task description' [lane]"
        exit 1
    fi
    
    echo "[VIBE CODING - AUTONOMOUS DISPATCH]"
    echo "Task: $task"
    echo "Lane: $lane"
    echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    
    # Auto-detect lane if not specified
    if [ "$lane" = "auto" ]; then
        if [[ "$task" == *"service"* ]] || [[ "$task" == *"backend"* ]]; then
            lane="codex"
        elif [[ "$task" == *"app"* ]] || [[ "$task" == *"ui"* ]] || [[ "$task" == *"test"* ]]; then
            lane="opencode"
        elif [[ "$task" == *"doc"* ]] || [[ "$task" == *"design"* ]] || [[ "$task" == *"schema"* ]]; then
            lane="claude"
        else
            lane="hermes"
        fi
        echo "→ Auto-detected lane: $lane"
    fi
    
    # Dispatch to lane
    dispatch_lane "$lane" "$task"
    
    # Pulse A2A sync
    a2a_pulse "$lane" "task-dispatched" "vibe-$(date +%s)" "$task"
    
    echo "✓ Dispatch complete"
}

main "$@"
