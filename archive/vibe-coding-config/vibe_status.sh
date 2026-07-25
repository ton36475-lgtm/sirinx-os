#!/bin/bash
# Vibe Coding Sidebar - Autonomous Status Check

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    VIBE CODING SIDEBAR - AUTONOMOUS STATUS                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"

REPO_ROOT="/Users/sirinx/sirinx-os"
cd "$REPO_ROOT" || exit 1

echo ""
echo "📊 WORKTREE STATUS:"
git worktree list

echo ""
echo "🤖 ACTIVE AGENTS:"
ps aux | grep -E 'codex|claude|opencode|hermes' | grep -v grep | head -5

echo ""
echo "🔗 OMNIROUTE STATUS:"
curl -s http://localhost:20128/health 2>/dev/null && echo "✓ OmniRoute running" || echo "✗ OmniRoute not running"

echo ""
echo "🧠 A2A SYNC STATUS:"
if [ -f "$HOME/.hermes/profiles/solis/a2a-sync/a2a-sync.sh" ]; then
    echo "✓ A2A sync available"
else
    echo "✗ A2A sync not found"
fi

echo ""
echo "🛡️  LANE GUARD:"
if [ -f ".git/hooks/pre-commit" ]; then
    echo "✓ Lane guard hook installed"
else
    echo "✗ Lane guard hook missing"
fi

echo ""
echo "📝 SYSTEM SCHEMA:"
if [ -f "SYSTEM_SCHEMA.yaml" ]; then
    echo "✓ SYSTEM_SCHEMA.yaml exists"
else
    echo "✗ SYSTEM_SCHEMA.yaml missing"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                         AUTONOMOUS SYSTEM READY                             ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
