#!/bin/bash
# ─── Claude App Model Bridge Connection ──────────────────────────────────
# Sets up the bridge between Hermes agents and Claude app.
# Connects Claude (Chief Architect) to the A2A model bridge.
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail
BASE="/Users/sirinx/sirinx-os"
BRIDGE_DIR="$BASE/.ghostclaw_runtime/a2a2a/model-bridge"
OUTBOX_DIR="$BASE/.ghostclaw_runtime/a2a2a/outbox/claude"
QUEUE_DIR="$BASE/.ghostclaw_runtime/queue"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

connect() {
  log "=== Setting up Claude App Model Bridge ==="

  # 1. Ensure Claude outbox directory
  mkdir -p "$OUTBOX_DIR"
  
  # 2. Write Claude's bridge connection manifest
  cat > "$BRIDGE_DIR/claude-bridge-manifest.json" <<- MANIFESTEOF
{
  "schema_version": "ghostclaw.a2a.claude_bridge.v1",
  "agent_id": "claude",
  "role": "chief_architect",
  "tier": "T3",
  "status": "standby",
  "connected_to": [
    {"agent": "hermes", "type": "command", "mode": "bidirectional"},
    {"agent": "zcode", "type": "peer_review", "mode": "bidirectional"},
    {"agent": "codex", "type": "build_handoff", "mode": "unidirectional", "direction": "claude->codex"}
  ],
  "bridge_routes": [
    "route-001", "route-005", "route-006"
  ],
  "trigger_conditions": {
    "activate_on": "architecture_task_in_outbox",
    "requires_tier": "T3",
    "standby_with": []
  },
  "established_at": "$TIMESTAMP",
  "model": "claude-sonnet-4-20250514",
  "provider": "anthropic",
  "knowledge_domains": [
    "docs/", "prompts/", "kms/", "schemas/", "packages/config"
  ]
}
MANIFESTEOF
  log "Bridge manifest written to claude-bridge-manifest.json"

  # 3. Create Claude's bridge connection certificate
  cat > "$OUTBOX_DIR/GC-CLAUDE-BRIDGE-CONNECT.md" <<- CERTEOF
# Claude Bridge Connection Certificate
bridge_id: 9router-a2a-bridge
agent_id: claude
role: chief_architect
status: standby
connected_at: $TIMESTAMP

## Bridge Routes
- route-001: Full mesh broadcast (all agents)
- route-005: Architect channel with zcode
- route-006: T3 Architecture channel with hermes, zcode, codex

## Trigger
Architecture task appears in outbox → activate Claude.

## Domains
docs/, prompts/, kms/, schemas/, packages/config

## Peer Agents
- hermes (commander) — bidirectional command channel
- zcode (safety_architect) — bidirectional peer review
- codex (build_captain) — unidirectional build handoff
CERTEOF
  log "Bridge certificate sent to Claude outbox"

  # 4. Create Hermes-side bridge acknowledgment
  mkdir -p "$BASE/.ghostclaw_runtime/a2a2a/outbox/hermes"
  cat > "$BASE/.ghostclaw_runtime/a2a2a/outbox/hermes/GC-CLAUDE-BRIDGE-ACK.md" <<- ACKEOF
# Claude Bridge Acknowledgement
To: Claude (Chief Architect)
From: Hermes Commander
bridge_id: 9router-a2a-bridge
acknowledged_at: $TIMESTAMP

Claude is now connected to the A2A Model Bridge as standby agent.
Routes 001, 005, 006 active.
Architecture tasks routed through omni_route/al2a.

Status: ⏳ Standby — activate when architecture task arrives.
ACKEOF
  log "Bridge acknowledgment sent to Hermes outbox"

  # 5. Update bridge state to reflect Claude connection
  log "Claude bridge established. Standby mode active."
  log "Activation trigger: architecture task in outbox"
  
  # 6. Write connection receipt
  mkdir -p "$BRIDGE_DIR/receipts"
  cat > "$BRIDGE_DIR/receipts/claude-bridge-connect-$TIMESTAMP.json" <<- RECEIPTEOF
{
  "agent": "claude",
  "action": "bridge_connect",
  "timestamp": "$TIMESTAMP",
  "status": "standby",
  "routes": ["route-001", "route-005", "route-006"],
  "tier": "T3",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
RECEIPTEOF
}

status() {
  log "=== Claude Bridge Status ==="
  if [ -f "$BRIDGE_DIR/claude-bridge-manifest.json" ]; then
    echo "Bridge manifest: FOUND"
    grep '"status"' "$BRIDGE_DIR/claude-bridge-manifest.json"
  else
    echo "Bridge manifest: NOT FOUND"
  fi
  
  outbox_count=$(find "$OUTBOX_DIR" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')
  echo "Claude outbox: $outbox_count files"
  
  pgrep -f "claude" >/dev/null 2>&1 && echo "Process: RUNNING" || echo "Process: NOT RUNNING (standby)"
}

disconnect() {
  log "Disconnecting Claude bridge..."
  rm -f "$BRIDGE_DIR/claude-bridge-manifest.json"
  log "Claude bridge disconnected."
}

case "${1:-status}" in
  connect)    connect ;;
  status)     status ;;
  disconnect) disconnect ;;
  *)
    echo "Usage: $0 [connect|status|disconnect]"
    exit 1
    ;;
esac
