#!/bin/bash
# scripts/recovery-fix-npm-cache.sh
# Emergency npm cache cleanup when disk full blocks installs

set -e

echo "=== Emergency npm cache cleanup ==="

# Check disk first
BEFORE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
echo "Disk usage before: ${BEFORE}%"

if [ "$BEFORE" -gt 90 ]; then
    echo "🚨 Critical disk space — running cleanup..."
    
    # Clean npm caches
    npm cache clean --force 2>/dev/null || true
    rm -rf ~/.npm/_npx/* 2>/dev/null || true
    rm -rf ~/.npm/_cacache/* 2>/dev/null || true
    
    # Clean caches
    rm -rf ~/.cache/* 2>/dev/null || true
    
    # Clean temp files
    find /tmp -name "flashpay-*" -delete 2>/dev/null || true
    
    # Go caches
    go clean -cache 2>/dev/null || true
    
    echo "✅ Cleanup done"
else
    echo "✅ Disk at ${BEFORE}% — cleanup not needed"
fi

AFTER=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
echo "Disk usage after: ${AFTER}%"

if [ "$AFTER" -lt 85 ]; then
    echo "✅ Ready for npm install"
    exit 0
else
    echo "⚠️ Still above 85% threshold"
    exit 1
fi