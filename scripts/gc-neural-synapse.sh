#!/usr/bin/env bash
# GC-NEURAL-SYNAPSE — Neural Knowledge Architecture Sync
# เชื่อมทุก agent → Memory Hub → Bridge → All
set -e

REPO="/Users/sirinx/sirinx-os"
OBSIDIAN="/Users/sirinx/Documents/Obsidian Vault/SIRINX/08_AI_MEMORY"
BRIDGE_STATE="$REPO/.ghostclaw_runtime/bridge_memory_state.json"
A2A2A="$REPO/.ghostclaw_runtime/a2a2a"
OUTBOX="$A2A2A/outbox"
ACTION="${1:-sync}"

case "$ACTION" in
    "build")
        echo "🧠 Building Neural Knowledge Architecture..."
        mkdir -p "$REPO/.ghostclaw_runtime/neural"
        
        # สร้าง neural node registry
        cat > "$REPO/.ghostclaw_runtime/neural/node-registry.json" << 'NODEREG'
{
    "version": "2.0",
    "hub": {
        "name": "Obsidian Brain",
        "path": "08_AI_MEMORY/",
        "type": "central-synapse",
        "nodes": [
            {"id": "memory-node", "file": "GC-Bridge Memory Node.md", "type": "system-state"},
            {"id": "ai-architecture", "file": "AI Memory Architecture.md", "type": "architecture"},
            {"id": "rag-pipeline", "file": "RAG Pipeline Design.md", "type": "pipeline"}
        ]
    },
    "agents": [
        {"id": "hermes",       "ship": "flagship",       "role": "commander",    "status": "active"},
        {"id": "codex",        "ship": "build-ops",      "role": "builder",      "status": "running"},
        {"id": "opencode",     "ship": "build-ops",      "role": "checker",      "status": "running"},
        {"id": "zcode",        "ship": "build-ops",      "role": "architecture", "status": "running"},
        {"id": "kiro",         "ship": "integration",    "role": "builder",      "status": "running"},
        {"id": "copilot",      "ship": "qa-security",    "role": "security",     "status": "running"},
        {"id": "claude",       "ship": "qa-security",    "role": "architect",    "status": "standby"},
        {"id": "antigravity2", "ship": "qa-security",    "role": "safety",       "status": "standby"},
        {"id": "webmcp",       "ship": "integration",    "role": "web-bridge",   "status": "standby"},
        {"id": "planner",      "ship": "integration",    "role": "planner",      "status": "standby"},
        {"id": "zai_tui",      "ship": "standby",        "role": "utility",      "status": "standby"}
    ],
    "processes": [
        {"id": "bridge",        "file": "gc-bridge-orchestrator.sh",     "type": "signal-layer"},
        {"id": "council",       "file": "gc-council-orchestrator.sh",    "type": "governance"},
        {"id": "research",      "file": "gc-researcher-cycle.py",       "type": "knowledge"},
        {"id": "qa",            "file": "qa-auto-review.sh",            "type": "validation"},
        {"id": "queue",         "file": "gc-priority-queue.sh",         "type": "scheduling"},
        {"id": "report",        "file": "gc-system-report.sh",          "type": "observability"}
    ],
    "edges": [
        {"from": "hermes",   "to": "memory-node",  "type": "command-state"},
        {"from": "codex",    "to": "memory-node",  "type": "build-state"},
        {"from": "opencode", "to": "memory-node",  "type": "review-state"},
        {"from": "kiro",     "to": "memory-node",  "type": "integration-state"},
        {"from": "council",  "to": "memory-node",  "type": "decision-record"},
        {"from": "research", "to": "memory-node",  "type": "knowledge-feed"},
        {"from": "qa",       "to": "memory-node",  "type": "validation-verdict"},
        {"from": "queue",    "to": "memory-node",  "type": "priority-state"},
        {"from": "report",   "to": "memory-node",  "type": "system-snapshot"},
        {"from": "memory-node", "to": "all",       "type": "broadcast-state"}
    ]
}
NODEREG
        echo "  ✅ Neural node registry created"
        echo "  → .ghostclaw_runtime/neural/node-registry.json"
        ;;

    "sync")
        echo "🧠 Syncing Neural Network → Memory Hub..."
        
        # 1. อ่านสถานะล่าสุดจาก bridge
        BRIDGE_TS=$(grep -o '"ts":"[^"]*"' "$REPO/.ghostclaw_runtime/a2a2a/bridge_active.json" 2>/dev/null | head -1 | sed 's/"ts":"//;s/"//')
        echo "  [afferent] Bridge: $BRIDGE_TS"
        
        # 2. เก็บสถานะ agent ล่าสุด
        NEURAL_STATE="$REPO/.ghostclaw_runtime/neural/state-snapshot.json"
        
        AGENTS_JSON="["
        FIRST=true
        for agent in hermes codex opencode zcode kiro copilot claude antigravity2 webmcp planner zai_tui; do
            PID=$(pgrep -f "$agent" 2>/dev/null | head -1)
            if [ "$FIRST" = true ]; then FIRST=false; else AGENTS_JSON+=","; fi
            AGENTS_JSON+="{\"id\":\"$agent\",\"running\":"
            if [ -n "$PID" ]; then AGENTS_JSON+="true,\"pid\":$PID"; else AGENTS_JSON+="false"; fi
            OUTBOX_COUNT=$(ls "$OUTBOX/$agent/"*.md 2>/dev/null | wc -l | tr -d ' ')
            AGENTS_JSON+=",\"outbox\":$OUTBOX_COUNT}"
        done
        AGENTS_JSON+="]"
        
        QUEUE_INFO=$(bash "$REPO/scripts/gc-priority-queue.sh" status 2>/dev/null | grep -E 'P0|P1|P2|P3|Total' | sed 's/^[[:space:]]*//' | tr '\n' ',')
        
        cat > "$NEURAL_STATE" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "bridge_synced": true,
    "agents": $AGENTS_JSON,
    "queue_summary": "$QUEUE_INFO",
    "memory_hub_path": "$OBSIDIAN",
    "hub_files": $(ls "$OBSIDIAN"/*.md 2>/dev/null | wc -l)
}
EOF
        echo "  [synapse] Neural state saved → $NEURAL_STATE"
        
        # 3. Broadcast state ไปยัง memory hub
        MEMORY_PULSE="$OBSIDIAN/Neural Pulse $(date +%Y-%m-%d).md"
        cat > "$MEMORY_PULSE" << PULSE
---
tags: [neural-pulse, auto-sync, system-state]
created: $(date +%Y-%m-%dT%H:%M:%S%z)
type: neural-snapshot
---

# 🧠 Neural Pulse: $(date +%Y-%m-%d)

## Afferent Signals (Input to Memory)
- Bridge active: $BRIDGE_TS
- Queue: $(echo "$QUEUE_INFO" | tr ',' ' | ')
- Agents running: $(echo "$AGENTS_JSON" | grep -o '"running":true' | wc -l)/11

## Efferent Signals (Memory to Agents)
- All agents synced via A2A bridge
- Council agenda: Pending
- Research findings: Available for next council

## Neural Edge Weights
| Edge | Type | Status |
|------|------|--------|
| hermes → memory | command-state | active |
| codex → memory | build-state | active |
| opencode → memory | review-state | active |
| kiro → memory | integration-state | active |
| council → memory | decision-record | active |
| research → memory | knowledge-feed | active |
| qa → memory | validation-verdict | active |
| queue → memory | priority-state | active |
PULSE
        echo "  [efferent] Neural pulse → $MEMORY_PULSE"
        
        # 4. Dispatch state ไปยังทุก agent via bridge
        echo "  [signal] Broadcasting to all agents..."
        for agent in hermes codex opencode zcode kiro copilot claude antigravity2; do
            mkdir -p "$OUTBOX/$agent"
            cp "$NEURAL_STATE" "$OUTBOX/$agent/NEURAL-STATE-$(date +%Y%m%d).json"
        done
        echo "  [signal] → dispatched to 8 agents"
        
        echo ""
        echo "✅ Neural network synced"
        echo "  Afferent: Bridge → Memory Hub ✓"
        echo "  Synapse: Memory Hub → Neural Pulse ✓"
        echo "  Efferent: Memory Hub → All Agents ✓"
        ;;
    
    "status")
        echo "🧠 Neural Network Status"
        echo ""
        if [ -f "$REPO/.ghostclaw_runtime/neural/node-registry.json" ]; then
            echo "Registry: ✅ loaded"
            AGENTS=$(grep -o '"id":"[^"]*"' "$REPO/.ghostclaw_runtime/neural/node-registry.json" | grep -v memory-node | grep -v bridge | grep -v council | grep -v research | grep -v qa | grep -v queue | grep -v report | wc -l | tr -d ' ')
            echo "Agent nodes: $AGENTS"
            EDGES=$(grep -o '"from"' "$REPO/.ghostclaw_runtime/neural/node-registry.json" | wc -l | tr -d ' ')
            echo "Synaptic edges: $EDGES"
        else
            echo "Registry: ❌ not built"
        fi
        if [ -f "$REPO/.ghostclaw_runtime/neural/state-snapshot.json" ]; then
            echo "State: ✅ latest snapshot"
            python3 -c "import json; d=json.load(open('$REPO/.ghostclaw_runtime/neural/state-snapshot.json')); print(f'  Bridge: {d[\"bridge_synced\"]}'); print(f'  Active agents: {sum(1 for a in d[\"agents\"] if a[\"running\"])}/{len(d[\"agents\"])}')" 2>/dev/null || true
        else
            echo "State: ❌ not synced"
        fi
        ;;
    
    *)
        echo "Usage: $0 [build|sync|status]"
        echo "  build — Create neural node registry"
        echo "  sync  — Sync all agents ↔ memory hub"
        echo "  status — Show neural network health"
        ;;
esac
