#!/bin/bash
# ─── A2A Triad Sync: Kiro CLI ↔ Copilot CLI ↔ ZCode ─────────────────────
# Bi-directional sync bridge for the 3 CLI-based agents.
# Run: ./gc-sync-triad.sh [watch]
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="/Users/sirinx/sirinx-os"
OUTBOX_DIR="$BASE/.ghostclaw_runtime/a2a2a/outbox"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
KIRO_BIN="/Users/sirinx/.local/bin/kiro-cli"
COPILOT_BIN="/Users/sirinx/.local/bin/copilot"
ZCODE_BIN="/Users/sirinx/.local/bin/zcode"
SYNC_ID="SYNC-$(date -u +%s)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

sync_kiro_to_copilot() {
  log "╰─➤ Kiro → Copilot sync"
  local kiro_files=$(find "$OUTBOX_DIR/kiro" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$kiro_files" -gt 0 ]; then
    # Mirror kiro packets into copilot outbox for visibility
    for f in "$OUTBOX_DIR/kiro"/*.md; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      local target="$OUTBOX_DIR/copilot/A2A-SYNC-kiro-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> copilot outbox"
      fi
    done
    # Also send JSON packets
    for f in "$OUTBOX_DIR/kiro"/*.json; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      local target="$OUTBOX_DIR/copilot/A2A-SYNC-kiro-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> copilot outbox"
      fi
    done
  fi
}

sync_copilot_to_kiro() {
  log "╰─➤ Copilot → Kiro sync"
  local copilot_files=$(find "$OUTBOX_DIR/copilot" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$copilot_files" -gt 0 ]; then
    for f in "$OUTBOX_DIR/copilot"/*.md; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      local target="$OUTBOX_DIR/kiro/A2A-SYNC-copilot-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> kiro outbox"
      fi
    done
    for f in "$OUTBOX_DIR/copilot"/*.json; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      local target="$OUTBOX_DIR/kiro/A2A-SYNC-copilot-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> kiro outbox"
      fi
    done
  fi
}

sync_kiro_to_zcode() {
  log "╰─➤ Kiro → ZCode sync"
  local kiro_files=$(find "$OUTBOX_DIR/kiro" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$kiro_files" -gt 0 ]; then
    for f in "$OUTBOX_DIR/kiro"/*.md; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      local target="$OUTBOX_DIR/zcode/A2A-SYNC-kiro-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> zcode outbox"
      fi
    done
    for f in "$OUTBOX_DIR/kiro"/*.json; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      local target="$OUTBOX_DIR/zcode/A2A-SYNC-kiro-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> zcode outbox"
      fi
    done
  fi
}

sync_zcode_to_kiro() {
  log "╰─➤ ZCode → Kiro sync"
  local zcode_files=$(find "$OUTBOX_DIR/zcode" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$zcode_files" -gt 0 ]; then
    for f in "$OUTBOX_DIR/zcode"/*.md; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      [[ "$basename" == A2A-SYNC-* ]] && continue  # skip already-synced
      local target="$OUTBOX_DIR/kiro/A2A-SYNC-zcode-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> kiro outbox"
      fi
    done
  fi
}

sync_copilot_to_zcode() {
  log "╰─➤ Copilot → ZCode sync"
  local copilot_files=$(find "$OUTBOX_DIR/copilot" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$copilot_files" -gt 0 ]; then
    for f in "$OUTBOX_DIR/copilot"/*.md; do
      [ -f "$f" ] || continue
      local basename=$(basename "$f")
      [[ "$basename" == A2A-SYNC-* ]] && continue
      local target="$OUTBOX_DIR/zcode/A2A-SYNC-copilot-$basename"
      if [ ! -f "$target" ]; then
        cp "$f" "$target"
        log "    Copied $basename -> zcode outbox"
      fi
    done
  fi
}

sync_all() {
  log "╭─────────────────────────────────────────────╮"
  log "│ A2A Triad Sync — $SYNC_ID          │"
  log "├─────────────────────────────────────────────┤"
  sync_kiro_to_copilot
  sync_copilot_to_kiro
  sync_kiro_to_zcode
  sync_zcode_to_kiro
  sync_copilot_to_zcode
  log "╰─────────────────────────────────────────────╯"
  
  # Write sync receipt
  mkdir -p "$BRIDGE_DIR/receipts"
  cat > "$BRIDGE_DIR/receipts/sync-triad-$SYNC_ID.json" <<- RECEIPTEOF
{
  "sync_id": "$SYNC_ID",
  "timestamp": "$TIMESTAMP",
  "type": "triad_sync",
  "agents": ["kiro", "copilot", "zcode"],
  "status": "complete"
}
RECEIPTEOF
}

watch_loop() {
  log "Starting A2A Triad watch mode (sync every 15s)..."
  while true; do
    sync_all
    echo ""
    sleep 15
  done
}

case "${1:-sync}" in
  sync)    sync_all ;;
  watch)   watch_loop ;;
  *)       echo "Usage: $0 [sync|watch]" ;;
esac
