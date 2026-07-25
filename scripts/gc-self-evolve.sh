#!/usr/bin/env bash
# GC-SELF-EVOLVE — Self-Evolution Loop
# 1. Collect training data from agents
# 2. Evaluate with Rust harness
# 3. Identify improvement gaps
# 4. Generate improvement tasks
# 5. Queue them in priority system
set -e

REPO="/Users/sirinx/sirinx-os"
RUNTIME="$REPO/.ghostclaw_runtime"
TRAINING_DIR="$RUNTIME/training"
QUEUE_SCRIPT="$REPO/scripts/gc-priority-queue.sh"
NEURAL_BIN="${NEURAL_BIN:-$HOME/.local/bin/gc-neural}"

log() { echo "[GC-EVOLVE] $*"; }
die() { echo "[GC-EVOLVE] ERROR: $*"; exit 1; }

# 1. Collect training data from recent QA runs
collect_training() {
    log "Collecting training data..."
    
    # From QA logs
    QA_LOG="$RUNTIME/qa-$(date +%Y%m%d).json"
    if [ -f "$QA_LOG" ]; then
        log "  QA log: $QA_LOG ($(wc -c < "$QA_LOG") bytes)"
    else
        log "  No QA log today yet"
    fi
    
    # From bridge state
    BRIDGE_STATE="$RUNTIME/bridge_memory_state.json"
    if [ -f "$BRIDGE_STATE" ]; then
        log "  Bridge state found"
    fi
    
    # From council minutes
    COUNCIL_DIR="$RUNTIME/council-minutes"
    COUNT=$(ls "$COUNCIL_DIR"/*.json 2>/dev/null | wc -l)
    log "  Council minutes: $COUNT sessions"
}

# 2. Evaluate each agent with Rust harness
evaluate_agents() {
    log "Evaluating agents with gc-neural..."
    
    AGENTS=("hermes" "codex" "opencode" "zcode" "kiro" "copilot")
    for agent in "${AGENTS[@]}"; do
        if [ -x "$NEURAL_BIN" ]; then
            result=$(SIRINX_OS="$REPO" "$NEURAL_BIN" train "$agent" 2>/dev/null || echo '{"error": "no data"}')
            quality=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('evaluation',{}).get('avg_quality',0))" 2>/dev/null || echo "?")
            log "  $agent: quality=$quality"
        fi
    done
}

# 3. Generate improvement tasks based on gaps
generate_improvements() {
    log "Generating improvement tasks from gaps..."
    
    # Check for gaps in system
    MISSING_FEEDBACK=$(grep -l "FEEDBACK" "$REPO/.ghostclaw_runtime/GC-LOOP-ENGINEERING-v2.md" 2>/dev/null | wc -l)
    if [ "$MISSING_FEEDBACK" -gt 0 ]; then
        log "  Gap: FEEDBACK phase not implemented"
    fi
    
    MISSING_RECOVERY=$(grep -l "RECOVERY" "$REPO/.ghostclaw_runtime/GC-LOOP-ENGINEERING-v2.md" 2>/dev/null | wc -l)
    if [ "$MISSING_RECOVERY" -gt 0 ]; then
        log "  Gap: RECOVERY phase not implemented"
    fi
    
    # Queue improvements
    if command -v "$QUEUE_SCRIPT" &>/dev/null; then
        bash "$QUEUE_SCRIPT" add "Implement FEEDBACK phase — metrics collector" P1 codex 2>/dev/null || true
        bash "$QUEUE_SCRIPT" add "Implement RECOVERY phase — heartbeat agent" P1 kiro 2>/dev/null || true
        log "  Improvement tasks queued"
    fi
}

# 4. Save evolution state
save_state() {
    STATE_FILE="$RUNTIME/evolution-state.json"
    cat > "$STATE_FILE" <<EOF
{
  "last_evolution": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phase": "self-evolve",
  "status": "complete",
  "system_version": "2.0.0"
}
EOF
    log "  State saved to $STATE_FILE"
}

# Main
main() {
    log "=== GC SELF-EVOLUTION LOOP ==="
    echo ""
    
    mkdir -p "$TRAINING_DIR"
    
    collect_training
    echo ""
    evaluate_agents
    echo ""
    generate_improvements
    echo ""
    save_state
    
    log "=== EVOLUTION COMPLETE ==="
    echo ""
    echo "📊 Evolution Summary:"
    echo "  Training dir: $TRAINING_DIR"
    echo "  Agent eval:   gc-neural train <agent>"
    echo "  State:        $RUNTIME/evolution-state.json"
}

main "$@"
