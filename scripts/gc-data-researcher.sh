#!/usr/bin/env bash
# GC-DATA-RESEARCHER — Automated Data Research Sub-Agent
# Sub-agent ที่ทำหน้าที่ค้นหาข้อมูลเชิงลึกเพื่อพัฒนาทุกระบบ

set -e

REPO="/Users/sirinx/sirinx-os"
RUNTIME="$REPO/.ghostclaw_runtime/research"
OUTBOX="$REPO/.ghostclaw_runtime/a2a2a/outbox"
INBOX="$REPO/.ghostclaw_runtime/a2a2a/inbox"

mkdir -p "$RUNTIME"{/questions,/findings,/logs,/tasks}
DATE=$(date +%Y%m%d-%H%M%S)
RESEARCH_ID="DR-${DATE}"

echo "=== DATA RESEARCHER AGENT ==="
echo "Research ID: $RESEARCH_ID"
echo ""

# ── Phase 1: Scan System Gaps ──
echo "--- Phase 1: SCANNING SYSTEM GAPS ---"

# ดู bridge state
BRIDGE_STATE="$RUNTIME/tasks/bridge-snapshot.json"
if [ -f "$REPO/.ghostclaw_runtime/bridge_memory_state.json" ]; then
    cp "$REPO/.ghostclaw_runtime/bridge_memory_state.json" "$BRIDGE_STATE"
    echo "  [bridge] state loaded"
fi

# ดู outbox backlog
for agent in hermes codex opencode zcode kiro copilot; do
    COUNT=$(ls "$OUTBOX/$agent/"*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        echo "  [backlog] $agent: $COUNT pending"
    fi
done

# ดู QA logs ล่าสุด
QA_LOG=$(ls -t "$REPO/.ghostclaw_runtime/a2a2a/qa-reviews/" 2>/dev/null | head -1)
if [ -n "$QA_LOG" ]; then
    VERDICT=$(grep -o '"verdict": "[^"]*"' "$REPO/.ghostclaw_runtime/a2a2a/qa-reviews/$QA_LOG" 2>/dev/null || echo "unknown")
    echo "  [qa] latest: $VERDICT"
fi

# ── Phase 2: Formulate Research Questions ──
echo ""
echo "--- Phase 2: FORMULATING RESEARCH QUESTIONS ---"

QUESTIONS_FILE="$RUNTIME/questions/${RESEARCH_ID}.md"
cat > "$QUESTIONS_FILE" << 'QEOF'
# Data Research Questions — Auto-Generated

## System Development Topics

1. **Best practices for multi-agent orchestration (2026)**
   - Latest patterns in agent coordination
   - A2A protocol implementations
   - Error recovery strategies

2. **Rust async patterns for CLI applications**
   - tokio vs smol for agent CLI tools
   - Graceful shutdown patterns
   - Signal handling in long-running agents

3. **Knowledge graph integration for AI agents**
   - Obsidian vault as knowledge base: best practices
   - Semantic search optimization
   - Memory node patterns

4. **AI pipeline safety and governance**
   - Tier-based approval systems
   - Audit trail implementations
   - Human-in-the-loop patterns

5. **Automated QA engineering**
   - Code review automation tools (2026)
   - Secret scanning best practices
   - CI/CD safety gates

## Business Development Topics

6. **Solar ROI AI systems**
   - Latest AI for solar energy estimation
   - Real-time monitoring patterns
   - Load balancing algorithms

7. **Live streaming AI assistants**
   - YouTube live chat AI integration
   - Real-time avatar systems
   - Multi-platform chat aggregation
QEOF

echo "  Generated $QUESTIONS_FILE"

# ── Phase 3: Dispatch Questions ──
echo ""
echo "--- Phase 3: DISPATCHING TO SUB-AGENTS ---"

# Dispatch to OpenCode review lane
cp "$QUESTIONS_FILE" "$OUTBOX/opencode/RESEARCH-${RESEARCH_ID}.md"

# Dispatch to zcode architecture lane
cp "$QUESTIONS_FILE" "$OUTBOX/zcode/RESEARCH-${RESEARCH_ID}.md"

echo "  -> opencode: RESEARCH-${RESEARCH_ID}.md"
echo "  -> zcode: RESEARCH-${RESEARCH_ID}.md"

# ── Phase 4: Logging ──
echo ""
echo "--- Phase 4: LOGGING ---"

LOG_FILE="$RUNTIME/logs/research-runner.log"
echo "[$DATE] RESEARCH_ID=$RESEARCH_ID questions=7 dispatched=opencode,zcode" >> "$LOG_FILE"

echo ""
echo "=== DATA RESEARCHER COMPLETE ==="
echo "ID: $RESEARCH_ID"
echo "Questions: 7 topics"
echo "Dispatched to: opencode, zcode"
echo "Log: $LOG_FILE"
