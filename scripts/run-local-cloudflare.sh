#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Cloudflare Workers Local Simulation - No Real Deploy
# Simulates KV/R2 bindings using local filesystem
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SIM_DIR="$REPO_ROOT/.cloudflare_simulation"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  GhostClaw Cloudflare Workers - Local Simulation          ║"
echo "╚══════════════════════════════════════════════════════════╝"

# Create simulation directories
mkdir -p "$SIM_DIR"/{kv_r2/{HERMES_LEDGER,IDEMPOTENCY_CACHE},build,logs,temp}

echo "✅ Simulation directories created at $SIM_DIR"
echo ""

# Export simulated env vars
export CF_ACCOUNT_ID="simulation"
export CF_WORKERS_KV_PATH="$SIM_DIR/kv_r2"
export CLOUDFLARE_SIMULATION=true

# Show simulated bindings
echo "Simulated KV Namespaces:"
echo "  HERMES_LEDGER → $SIM_DIR/kv_r2/HERMES_LEDGER/"
echo "  IDEMPOTENCY_CACHE → $SIM_DIR/kv_r2/IDEMPOTENCY_CACHE/"
echo ""

# Test routes (preview mode)
echo "Testing Worker Routes (dry-run):"
echo ""

# Route 1: Hermes Ledger
echo "  GET /api/hermes/ledger/status"
echo "    → Check ledger sync status" > "$SIM_DIR/kv_r2/HERMES_LEDGER/status.json"
cat "$SIM_DIR/kv_r2/HERMES_LEDGER/status.json" 2>/dev/null || echo "    pending"

# Route 2: Idempotency Cache
echo "  GET /api/cache/check/:key"
echo '{"key":"test","cached":false,"simulation":true}' > "$SIM_DIR/kv_r2/IDEMPOTENCY_CACHE/test.json"

# Route 3: Agent Dispatch
echo "  POST /api/worker/dispatch"
echo '{"status":"dry_run","message":"use hermes approve worker-dispatch to execute"}'

# Show what would be deployed
echo ""
echo "Would-be Deploy Config:"
cat "$REPO_ROOT/services/orchestrator/wrangler.toml" | grep -E "^name|^main|^vars" | head -5

echo ""
echo "══════════════════════════════════════════════════════════"
echo "✅ Simulation complete — no real Cloudflare resources used"
echo "══════════════════════════════════════════════════════════"

# Cleanup marker
echo "simulation_timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SIM_DIR/simulation-marker.env"

# Export simulation status for other tools
echo "CLOUDFLARE_SIMULATION=true"
echo "KV_SIM_PATH=$SIM_DIR/kv_r2"
echo "BUILD_SIM_PATH=$SIM_DIR/build"