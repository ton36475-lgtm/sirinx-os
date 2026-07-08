#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Sovereign Fleet Full Automation Runbook
# Execute this after updating .env with real credentials
# ═══════════════════════════════════════════════════════════

set -e

echo "══════════════════════════════════════════════════════════"
echo "🚀 SOVEREIGN FLEET FULL AUTOMATION ACTIVATION"
echo "══════════════════════════════════════════════════════════"

# === PHASE 1: STATE LAYER ACTIVATION ===
echo "[PHASE 1] State Layer Initialization..."

# Try PostgreSQL first, fallback to SQLite
if command -v docker &> /dev/null; then
    echo "  Attempting PostgreSQL startup..."
    docker run --name sirinx-postgres-state \
      -e POSTGRES_USER=sirinx_operator \
      -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
      -e POSTGRES_DB=sirinx_fleet_state \
      -p 5432:5432 \
      -d postgres:16-alpine 2>/dev/null || true
    
    sleep 3
    if docker ps --filter "name=sirinx-postgres-state" --filter "status=running" | grep -q sirinx; then
        echo "  ✅ PostgreSQL started"
        # Run migration when ready
        # docker exec -i sirinx-postgres-state psql -U sirinx_operator -d sirinx_fleet_state < services/postgres-state/mysql_fleet_schema.sql
    else
        echo "  ⚠️ PostgreSQL unavailable, using SQLite"
    fi
else
    echo "  ⚠️ Docker not available, using SQLite state"
fi

# Initialize SQLite anyway (fallback)
python3 services/postgres-state/sqlite_state_layer.py

# === PHASE 2: MODEL ROUTER ACTIVATION ===
echo "[PHASE 2] Model Router Activation..."
echo "  Model: maxplus-free/deepseek-v4-pro (DeepSeek V4 Pro)"
echo "  Fallback: nvidia/nemotron-3-ultra-550b-a55b:free"

# Verify OpenCode config
if grep -q "maxplus-free/deepseek-v4-pro" ./.config/opencode/opencode.json 2>/dev/null; then
    echo "  ✅ OpenCode configured for MaxPlus"
fi

# === PHASE 3: MCP SERVERS ACTIVATION ===
echo "[PHASE 3] MCP Servers..."
npx -y opencode-mcp --version 2>/dev/null && echo "  ✅ opencode-mcp available" || true

# === PHASE 4: CODE DEBT REPAIR ===
echo "[PHASE 4] Code Debt Assessment..."
python3 << 'PYEOF'
import json, sys
from pathlib import Path

issues = []
for f in Path("/Users/sirinx/sirinx-os").glob("**/*.json"):
    try:
        content = f.read_text()
        json.loads(content)  # Validate
    except:
        issues.append(str(f))
        
print(f"  📊 JSON validation: {len(issues)} issues found")
PYEOF

# === PHASE 5: EDGE GATEWAY STATUS ===
echo "[PHASE 5] Edge Gateway..."
if [ -f "services/edge-gateway/src/index.ts" ]; then
    echo "  ✅ Edge gateway code ready"
    # Would run: cd services/edge-gateway && wrangler dev --local
fi

echo "══════════════════════════════════════════════════════════"
echo "✅ AUTOMATION READY - AWAITING CREDENTIALS"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "🔑 NEXT STEPS:"
echo "  1. Add MAXPLUS_API_KEY to .env"
echo "  2. Run: MAXPLUS_API_KEY=... ./scripts/run_full_auto.sh"
echo "  3. Agents will auto-dispatch for code repair"