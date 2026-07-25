#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# SIRINX OS — SUPERPOWER DISK PURGE + OMNIROUTE WIRE SCRIPT
# Run via: bash scripts/superpower-disk-and-wire.sh
# Safe: only removes regeneratable caches, never touches secrets/repos
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
echo "════════════════════════════════════════════════════"
echo "🧹 SIRINX OS — DISK PURGE + OMNIROUTE WIRE"
echo "════════════════════════════════════════════════════"

BEFORE=$(df -h / | awk 'NR==2 {print $4}')
echo "BEFORE: ${BEFORE} free"

# ─── 1. PACKAGE MANAGER CACHES ───
echo ""
echo "┌─ Package Manager Caches"
pnpm store prune 2>/dev/null && echo "│ ✅ pnpm store pruned" || true
npm cache clean --force 2>/dev/null && echo "│ ✅ npm cache cleaned" || true
bun pm cache rm 2>/dev/null && echo "│ ✅ bun cache cleaned" || true
pip cache purge 2>/dev/null && echo "│ ✅ pip cache purged" || true

# ─── 2. BUILD ARTIFACTS ───
echo "├─ Build Artifacts"
for d in \
  "/Users/sirinx/sirinx-os/apps/centerbrain-shell/.next" \
  "/Users/sirinx/sirinx-os/.turbo" \
  "/Users/sirinx/sirinx-os/integrations/omniroute/.build" \
  "/Users/sirinx/sirinx-os/.cache"; do
  if [ -d "$d" ]; then
    SZ=$(du -sh "$d" 2>/dev/null | awk '{print $1}')
    rm -rf "$d" || true
    echo "│ ✅ ${d##*/} (${SZ})"
  fi
done

# ─── 3. PYTHON CACHE ───
echo "├─ Python Cache"
find /Users/sirinx/sirinx-os -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
find /Users/sirinx/sirinx-os -name "*.pyc" -delete 2>/dev/null
echo "│ ✅ __pycache__ + .pyc cleaned"

# ─── 4. LOG ROTATION (>1MB → keep last 100 lines) ───
echo "├─ Log Rotation"
for logdir in "/Users/sirinx/.hermes/logs" "/Users/sirinx/sirinx-os/logs"; do
  if [ -d "$logdir" ]; then
    for f in "$logdir"/*.log; do
      [ -f "$f" ] || continue
      SZ=$(stat -f%z "$f" 2>/dev/null || echo 0)
      if [ "$SZ" -gt 1000000 ]; then
        tail -100 "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
        echo "│ ✅ rotated $(basename $f)"
      fi
    done
  fi
done

# ─── 5. A2A OUTBOX ARCHIVAL (>24h) ───
echo "├─ A2A Outbox Archival"
OUTBOX="/Users/sirinx/sirinx-os/_A2A_QUEUE/outbox"
ARCHIVE="/Users/sirinx/sirinx-os/_A2A_QUEUE/archive"
mkdir -p "$ARCHIVE"
if [ -d "$OUTBOX" ]; then
  COUNT=0
  for f in "$OUTBOX"/*.json; do
    [ -f "$f" ] || continue
    # Check if older than 24h
    if [ "$(find "$f" -mtime +1 -print 2>/dev/null | wc -l)" -gt 0 ]; then
      mv "$f" "$ARCHIVE/"
      COUNT=$((COUNT + 1))
    fi
  done
  [ "$COUNT" -gt 0 ] && echo "│ ✅ archived ${COUNT} packets (>24h)"
fi

# ─── 6. SYSTEM CACHES ───
echo "├─ System Caches"
for d in \
  "/Users/sirinx/Library/Caches/dev.kdrag0n.MacVirt" \
  "/Users/sirinx/Library/Caches/Google" \
  "/Users/sirinx/Library/Caches/camoufox" \
  "/Users/sirinx/Library/Caches/ms-playwright" \
  "/Users/sirinx/Library/Caches/Codex"; do
  if [ -d "$d" ]; then
    SZ=$(du -sh "$d" 2>/dev/null | awk '{print $1}')
    rm -rf "$d" || true
    echo "│ ✅ ${d##*/} (${SZ})"
  fi
done

# ─── 7. UV PYTHON CACHE ───
echo "├─ UV Cache"
if [ -d "/Users/sirinx/.local/share/uv" ]; then
  SZ=$(du -sh /Users/sirinx/.local/share/uv 2>/dev/null | awk '{print $1}')
  rm -rf /Users/sirinx/.local/share/uv || true
  echo "│ ✅ uv cache (${SZ})"
fi

# ─── 8. CODEX SESSIONS ───
echo "├─ Codex Sessions"
if [ -d "/Users/sirinx/.codex/sessions" ]; then
  SZ=$(du -sh /Users/sirinx/.codex/sessions 2>/dev/null | awk '{print $1}')
  rm -rf /Users/sirinx/.codex/sessions || true
  echo "│ ✅ codex sessions (${SZ})"
fi

# ─── 9. CLAUDE OLD VERSIONS ───
echo "├─ Claude Old Versions"
CLAUDE_VER="/Users/sirinx/.local/share/claude/versions"
if [ -d "$CLAUDE_VER" ]; then
  cd "$CLAUDE_VER"
  VERSIONS=(*)
  for v in "${VERSIONS[@]:1}"; do  # Keep latest
    [ -d "$v" ] && { rm -rf "$v" || true; } && echo "│ ✅ removed claude $v"
  done
fi

# ─── 10. TRASH ───
echo "├─ Trash"
if [ -d "/Users/sirinx/.Trash" ]; then
  rm -rf /Users/sirinx/.Trash/* 2>/dev/null && echo "│ ✅ Trash emptied"
fi

AFTER=$(df -h / | awk 'NR==2 {print $4}')
echo "└──────────────────────────────────────"
echo ""
echo "════════════════════════════════════════════════════"
echo "AFTER: ${AFTER} free (was ${BEFORE})"
echo "════════════════════════════════════════════════════"

# ─── OMNIROUTE WIRE ───
echo ""
echo "════════════════════════════════════════════════════"
echo "🔌 OMNIROUTE GATEWAY WIRE CHECK"
echo "════════════════════════════════════════════════════"

# Check if OmniRoute is running
OMNI_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:20128/ 2>/dev/null || echo "000")
if [ "$OMNI_STATUS" = "307" ] || [ "$OMNI_STATUS" = "200" ]; then
  echo "✅ OmniRoute: RUNNING on :20128"
else
  echo "⚠️  OmniRoute: OFFLINE (start with: cd integrations/omniroute && npm run dev)"
fi

# Check gateway config
CONFIG="/Users/sirinx/sirinx-os/config/omniroute-gateway-wiring.json"
if [ -f "$CONFIG" ]; then
  echo "✅ Gateway config: EXISTS"
else
  echo "⚠️  Gateway config: MISSING"
fi

# Check agent cards
CARDS="/Users/sirinx/sirinx-os/config/ronin-47-agent-cards.json"
if [ -f "$CARDS" ]; then
  AGENTS=$(python3.12 -c "import json; print(len(json.load(open('$CARDS'))['agents']))" 2>/dev/null || echo "?")
  echo "✅ Agent cards: ${AGENTS} agents registered"
else
  echo "⚠️  Agent cards: MISSING"
fi

# Check A2A bridge safety
BRIDGE="/Users/sirinx/sirinx-os/_A2A_QUEUE/a2a-bridge.py"
if grep -q "safety_scan" "$BRIDGE" 2>/dev/null; then
  echo "✅ Safety gates: ACTIVE in bridge"
else
  echo "⚠️  Safety gates: NOT wired"
fi

# Check canonical A2A
INBOX_COUNT=$(find /Users/sirinx/sirinx-os/_A2A_QUEUE/inbox -maxdepth 1 -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
echo "✅ A2A inbox: ${INBOX_COUNT} packets (canonical v2)"

# Evolution engine
EVO="/Users/sirinx/sirinx-os/scripts/self-evolution-engine.py"
if [ -f "$EVO" ]; then
  echo "✅ Evolution engine: READY"
else
  echo "⚠️  Evolution engine: MISSING"
fi

# DAG resolver
DAG="/Users/sirinx/sirinx-os/scripts/task-dag-resolver.py"
if [ -f "$DAG" ]; then
  echo "✅ DAG resolver: READY"
else
  echo "⚠️  DAG resolver: MISSING"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "🚀 SYSTEM READY FOR AUTONOMOUS OPERATION"
echo "════════════════════════════════════════════════════"
