#!/usr/bin/env bash
# Register Manus.ai MCP Bridge with various tools
# Part of SIRINX OS GhostClaw MCP Infrastructure
set -e

BRIDGE_DIR="$(cd "$(dirname "$0")/../_A2A_QUEUE" && pwd)"
BRIDGE_SCRIPT="$BRIDGE_DIR/manus-mcp-bridge.py"
CONFIG_DIR="$HOME/.config"
OPENCODE_CONFIG="$CONFIG_DIR/opencode/opencode.json"
THCLAWS_CONFIG="$CONFIG_DIR/thclaws/mcp_allowlist.json"
GEMINI_CONFIG="$HOME/.gemini/config/mcp_config.json"

MCP_HOST="${SIRINX_MCP_HOST:-127.0.0.1}"
MCP_PORT="${SIRINX_MCP_PORT:-8788}"
MCP_URL="http://$MCP_HOST:$MCP_PORT/mcp"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(timestamp)] $1"; }

usage() {
    cat <<EOF
Register Manus.ai MCP Bridge with CLI tools

Usage: $(basename "$0") <command>

Commands:
  all              Register with all available tools
  opencode         Register with OpenCode (opencode.json)
  thclaws          Register with thClaws (mcp_allowlist.json)
  gemini           Register with Gemini (mcp_config.json)
  manus            Print Manus.ai custom MCP configuration instructions
  status           Show registration status
  test             Test the bridge connection (requires running server)

Options:
  --host HOST      MCP server host (default: 127.0.0.1)
  --port PORT      MCP server port (default: 8788)
  --help           Show this help

To register with Manus.ai web app:
  1. Go to Settings → Integrations → Custom MCP Servers
  2. Click "Add Server"
  3. Fill in:
     - Server name: SIRINX LINE OA Bridge
     - Server URL:  $MCP_URL
     - Auth: None (or API key if configured)
  4. Click Save
  5. Verify tools appear in your integration list

EOF
}

check_bridge() {
    if command -v curl &>/dev/null; then
        HEALTH=$(curl -s "http://$MCP_HOST:$MCP_PORT/health" 2>/dev/null || echo '{"status":"unreachable"}')
        STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "ok" ]; then
            log "Bridge: RUNNING at $MCP_URL"
            return 0
        else
            log "Bridge: NOT RUNNING at $MCP_URL"
            log "Start it with: $BRIDGE_DIR/manus-mcp-bridge.sh start"
            return 1
        fi
    else
        log "curl not available, skipping bridge check"
        return 0
    fi
}

register_opencode() {
    log "Registering MCP with OpenCode config..."
    if [ ! -f "$OPENCODE_CONFIG" ]; then
        log "OpenCode config not found: $OPENCODE_CONFIG"
        return 1
    fi

    # Check if already registered
    if python3 -c "
import json
with open('$OPENCODE_CONFIG') as f:
    cfg = json.load(f)
mcp = cfg.get('mcp', {})
if 'manus-mcp-bridge' in mcp:
    print('EXISTS')
else:
    print('MISSING')
" 2>/dev/null | grep -q "EXISTS"; then
        log "  ✓ manus-mcp-bridge already registered in OpenCode config"
    else
        log "  Adding manus-mcp-bridge to OpenCode MCP section..."
        python3 -c "
import json
with open('$OPENCODE_CONFIG') as f:
    cfg = json.load(f)
if 'mcp' not in cfg:
    cfg['mcp'] = {}
cfg['mcp']['manus-mcp-bridge'] = {
    'type': 'local',
    'command': ['python3', '$BRIDGE_SCRIPT'],
    'enabled': True,
    'env': {
        'SIRINX_MCP_AUTO_APPROVE': 'true',
        'SIRINX_LINE_MODE': 'dry-run',
    }
}
# Enable line-bot if present
if 'line-bot' in cfg.get('mcp', {}):
    cfg['mcp']['line-bot']['enabled'] = True
with open('$OPENCODE_CONFIG', 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
print('  ✓ Added manus-mcp-bridge and enabled line-bot')
"
    fi
}

register_thclaws() {
    log "Registering MCP with thClaws allowlist..."
    if [ ! -f "$THCLAWS_CONFIG" ]; then
        log "thClaws config not found: $THCLAWS_CONFIG"
        return 1
    fi

    # Check if already registered
    if python3 -c "
import json
with open('$THCLAWS_CONFIG') as f:
    cfg = json.load(f)
servers = cfg.get('mcp_servers', {})
if 'manus-mcp-bridge' in servers:
    print('EXISTS')
else:
    print('MISSING')
" 2>/dev/null | grep -q "EXISTS"; then
        log "  ✓ manus-mcp-bridge already in thClaws allowlist"
    else
        log "  Already configured in allowlist. Skipping."
    fi
}

register_gemini() {
    log "Registering MCP with Gemini config..."
    mkdir -p "$(dirname "$GEMINI_CONFIG")"
    if [ -f "$GEMINI_CONFIG" ]; then
        python3 -c "
import json
try:
    with open('$GEMINI_CONFIG') as f:
        cfg = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    cfg = {}
if 'mcpServers' not in cfg:
    cfg['mcpServers'] = {}
cfg['mcpServers']['manus-mcp-bridge'] = {
    'type': 'http',
    'url': '$MCP_URL',
    'autoApprove': True,
}
with open('$GEMINI_CONFIG', 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
print('  ✓ Registered with Gemini')
" 2>/dev/null
    else
        echo '{"mcpServers":{"manus-mcp-bridge":{"type":"http","url":"'"$MCP_URL"'","autoApprove":true}}}' > "$GEMINI_CONFIG"
        log "  ✓ Created Gemini config with manus-mcp-bridge"
    fi
}

print_manus_instructions() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Manus.ai Custom MCP Server Registration"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "To register this bridge with Manus.ai:"
    echo ""
    echo "  1. Open Manus.ai web app"
    echo "  2. Go to Settings → Integrations → Custom MCP Servers"
    echo "  3. Click '+ Add Custom MCP'"
    echo "  4. Select 'Direct configuration'"
    echo "  5. Fill in:"
    echo ""
    echo "     Server name:  SIRINX LINE OA Bridge"
    echo "     Transport:     HTTP"
    echo "     Server URL:    $MCP_URL"
    echo ""
    echo "  6. Click Save"
    echo "  7. Manus will verify the connection and list available tools"
    echo ""
    echo "  Available tools after registration:"
    echo "    - line_send_message  : Send LINE messages"
    echo "    - line_get_profile   : Get LINE user profiles"
    echo "    - line_get_user_id   : Get configured user ID"
    echo "    - bridge_health      : Check bridge health"
    echo "    - bridge_status      : Check bridge configuration"
    echo ""
    echo "  Configuration file:"
    echo "    $BRIDGE_DIR/../config/manus-mcp-config.json"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

show_status() {
    echo ""
    log "═══════════════════════════════════════════"
    log "Manus.ai MCP Bridge Registration Status"
    log "═══════════════════════════════════════════"

    # Bridge process
    if [ -f "/tmp/manus-mcp-bridge.pid" ]; then
        PID=$(cat /tmp/manus-mcp-bridge.pid 2>/dev/null)
        if kill -0 "$PID" 2>/dev/null; then
            log "  Bridge Process: RUNNING (PID $PID)"
        else
            log "  Bridge Process: STOPPED (stale PID)"
        fi
    else
        log "  Bridge Process: STOPPED"
    fi

    # OpenCode
    if [ -f "$OPENCODE_CONFIG" ]; then
        if python3 -c "import json; print('yes' if 'manus-mcp-bridge' in json.load(open('$OPENCODE_CONFIG')).get('mcp',{}) else 'no')" 2>/dev/null | grep -q yes; then
            log "  OpenCode:       REGISTERED"
        else
            log "  OpenCode:       NOT REGISTERED"
        fi
    fi

    # thClaws
    if [ -f "$THCLAWS_CONFIG" ]; then
        if python3 -c "import json; s=json.load(open('$THCLAWS_CONFIG')).get('mcp_servers',{}); print('yes' if 'manus-mcp-bridge' in s else 'no')" 2>/dev/null | grep -q yes; then
            log "  thClaws:        REGISTERED"
        else
            log "  thClaws:        NOT REGISTERED"
        fi
    fi

    # Gemini
    if [ -f "$GEMINI_CONFIG" ]; then
        if python3 -c "import json; s=json.load(open('$GEMINI_CONFIG')).get('mcpServers',{}); print('yes' if 'manus-mcp-bridge' in s else 'no')" 2>/dev/null | grep -q yes; then
            log "  Gemini:         REGISTERED"
        else
            log "  Gemini:         NOT REGISTERED"
        fi
    fi

    # Health
    if command -v curl &>/dev/null; then
        HEALTH=$(curl -s "http://$MCP_HOST:$MCP_PORT/health" 2>/dev/null || echo '{"status":"unreachable"}')
        STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")
        log "  Bridge Health:  $STATUS"
    fi
    echo ""
}

test_bridge() {
    log "Testing Manus MCP Bridge connection..."
    if ! check_bridge; then
        log "Bridge is not running. Start it first."
        log "  $BRIDGE_DIR/manus-mcp-bridge.sh start"
        return 1
    fi

    echo ""
    log "1. Testing initialize..."
    curl -s -X POST "$MCP_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"initialize","id":1}' | python3 -m json.tool

    echo ""
    log "2. Testing tools/list..."
    curl -s -X POST "$MCP_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"tools/list","id":2}' | python3 -m json.tool

    echo ""
    log "3. Testing bridge_health..."
    curl -s -X POST "$MCP_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"bridge_health","arguments":{}},"id":3}' | python3 -m json.tool

    echo ""
    log "4. Testing line_get_user_id..."
    curl -s -X POST "$MCP_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"line_get_user_id","arguments":{}},"id":4}' | python3 -m json.tool

    echo ""
    log "5. Checking A2A queue for receipts..."
    ls -la "$BRIDGE_DIR/inbox/" 2>/dev/null | grep mcp_ || log "  No MCP packets in inbox yet"

    echo ""
    log "All tests completed."
}

# ── Main ──
while [ $# -gt 0 ]; do
    case "$1" in
        all)        COMMAND="all"; shift ;;
        opencode)   COMMAND="opencode"; shift ;;
        thclaws)    COMMAND="thclaws"; shift ;;
        gemini)     COMMAND="gemini"; shift ;;
        manus)      COMMAND="manus"; shift ;;
        status)     COMMAND="status"; shift ;;
        test)       COMMAND="test"; shift ;;
        --host)     MCP_HOST="$2"; shift 2 ;;
        --port)     MCP_PORT="$2"; shift 2 ;;
        --help|-h)  usage; exit 0 ;;
        *)          log "Unknown command: $1"; usage; exit 1 ;;
    esac
done

case "${COMMAND:-status}" in
    all)
        check_bridge || true
        register_opencode
        register_thclaws
        register_gemini
        print_manus_instructions
        ;;
    opencode) register_opencode ;;
    thclaws)  register_thclaws ;;
    gemini)   register_gemini ;;
    manus)    print_manus_instructions ;;
    status)   show_status ;;
    test)     test_bridge ;;
esac
