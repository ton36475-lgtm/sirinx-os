#!/usr/bin/env bash
# GC-BRIDGE-ORCHESTRATOR — Master Bridge Connector
# เชื่อมทุก agent ผ่าน A2A Live Sync bridge
# ใช้: bash gc-bridge-orchestrator.sh [start|status|sync]

A2A_DIR="$HOME/.hermes/profiles/solis/a2a-sync"
A2A2A_DIR="/Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a"
OUTBOX="$A2A2A_DIR/outbox"
REPO="/Users/sirinx/sirinx-os"
SCRIPT_DIR="$A2A_DIR"

ALL_AGENTS="hermes codex claude opencode zcode zai_tui kiro copilot antigravity2 webmcp planner"

case "${1:-status}" in
    "start")
        echo "🚀 Starting GC-BRIDGE-ORCHESTRATOR..."
        
        # 1. Initialize state files for all agents
        for agent in $ALL_AGENTS; do
            state_file="$A2A_DIR/${agent}_sessions.jsonl"
            if [ ! -f "$state_file" ]; then
                echo "{}" > "$state_file"
                echo "  ✅ Created state file: ${agent}_sessions.jsonl"
            fi
        done
        
        # 2. Ensure all outbox directories exist
        for agent in $ALL_AGENTS; do
            mkdir -p "$OUTBOX/$agent"
        done
        
        # 3. Write bridge_start receipt
        echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"bridge\":\"active\",\"agents\":\"$ALL_AGENTS\",\"omniroute\":\"fallback_local\"}" \
            > "$A2A2A_DIR/bridge_active.json"
        
        # 4. Sync initial state
        cd "$REPO"
        for agent in hermes codex claude opencode zcode zai_tui kiro copilot; do
            if [ -f "$SCRIPT_DIR/${agent}-sync.sh" ]; then
                bash "$SCRIPT_DIR/${agent}-sync.sh" start "bridge-start-$(date +%s)" 2>/dev/null || true
            fi
        done
        
        echo ""
        echo "✅ Bridge started. $(echo $ALL_AGENTS | wc -w | tr -d ' ') agents connected."
        echo "📁 State files: $A2A_DIR/*_sessions.jsonl"
        echo "📤 Outbox: $OUTBOX/*/"
        echo "ℹ️  OmniRoute: fallback to local JSONL sync"
        ;;
    
    "status")
        echo "=== GC-BRIDGE STATUS ==="
        echo ""
        echo "Bridge active: $(cat "$A2A2A_DIR/bridge_active.json" 2>/dev/null || echo 'NOT ACTIVE')"
        echo ""
        echo "--- Session State Files ---"
        for f in "$A2A_DIR"/*_sessions.jsonl; do
            name=$(basename "$f" _sessions.jsonl)
            count=$(wc -l < "$f" 2>/dev/null || echo 0)
            last=$(tail -1 "$f" 2>/dev/null | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('action','?'), d.get('task','?'))" 2>/dev/null || echo "—")
            echo "  $name: $count records | last: $last"
        done
        echo ""
        echo "--- A2A2A Queue ---"
        for agent in $ALL_AGENTS; do
            pending=$(ls "$OUTBOX/$agent"/*.md 2>/dev/null | wc -l | tr -d ' ')
            [ "$pending" -gt 0 ] && echo "  $agent: $pending pending"
        done
        echo ""
        echo "--- Agent Processes ---"
        for agent in codex claude opencode zcode kiro copilot; do
            count=$(ps aux | grep "$agent" | grep -v grep | wc -l | tr -d ' ')
            [ "$count" -gt 0 ] && echo "  $agent: $count process(es) RUNNING"
        done
        ;;
    
    "sync")
        echo "🔄 Syncing all agents state to bridge..."
        cd "$REPO"
        for agent in hermes codex claude opencode zcode zai_tui kiro copilot antigravity2 webmcp planner; do
            if [ -f "$SCRIPT_DIR/${agent}-sync.sh" ]; then
                bash "$SCRIPT_DIR/${agent}-sync.sh" progress "bridge-sync-$(date +%u-%H%M)" 2>/dev/null || true
                echo "  ✅ $agent synced"
            fi
        done
        echo "Bridge sync complete."
        ;;
    
    *)
        echo "GC-Bridge Orchestrator — เชื่อมต่อทุก agents ผ่าน A2A Live Sync bridge"
        echo ""
        echo "Usage:"
        echo "  bash gc-bridge-orchestrator.sh start   — เริ่ม bridge (เชื่อมทุก agent)"
        echo "  bash gc-bridge-orchestrator.sh status  — ดูสถานะ bridge"
        echo "  bash gc-bridge-orchestrator.sh sync    — sync state ทุก agent"
        exit 1
        ;;
esac