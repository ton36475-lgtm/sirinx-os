#!/usr/bin/env bash
# HERMES A2A MCP SYNC CONTROL SYSTEM
# Manages MCP connections for Claude Code / Codex / OpenCode on Mac Mini M2
# Part of SIRINX OS Developer Command Center

set -e

HERMES_PROFILE="${HERMES_PROFILE:-solis}"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes/profiles/$HERMES_PROFILE}"
WORKSPACE_BASE="$HERMES_HOME/workspaces"
SHARED_MCP="$HOME/.mcp-servers-sirinx.json"

timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
    echo "[$(timestamp)] $1"
}

echo "========================================"
echo "HERMES A2A MCP SYNC CONTROL SYSTEM v1.0"
echo "Profile: $HERMES_PROFILE | Host: $(hostname)"
echo "========================================"
echo ""

case "${1---status}" in
    --status)
        log "=== MCP SERVER STATUS ==="
        hermes mcp list 2>/dev/null | sed 's/^/  /' || echo "  (Hermes MCP list unavailable)"
        
        echo ""
        log "=== AGENT WORKSPACE STATUS ==="
        for agent in claude opencode codex; do
            mcp_json="$WORKSPACE_BASE/$agent/.mcp.json"
            if command -v jq &>/dev/null && [ -f "$mcp_json" ]; then
                server_count=$(jq '.mcpServers | keys | length' "$mcp_json" 2>/dev/null)
                echo "  ✓ $agent: $server_count MCP servers configured"
            elif [ -f "$mcp_json" ]; then
                echo "  ✓ $agent: .mcp.json exists"
            else
                echo "  ✗ $agent: No workspace config"
            fi
        done
        ;;
        
    --connect-claude)
        log "Connecting Claude Code to MCP..."
        tmux send-keys -t claude-worker "export WORKSPACE_MCP_CONFIG='$WORKSPACE_BASE/claude/.mcp.json'" Enter
        tmux send-keys -t claude-worker "claude --mcp-config '$WORKSPACE_BASE/claude/.mcp.json' --scope workspace 2>&1 | head -5 || echo 'Connected (Claude may show UI)'" Enter
        ;;
        
    --connect-opencode)
        log "Connecting OpenCode to MCP..."
        tmux send-keys -t opencode-worker "export OPENCODE_MCP_CONFIG='$WORKSPACE_BASE/opencode/.mcp.json'" Enter
        tmux send-keys -t opencode-worker "opencode mcp add sirinx-files '$SHARED_MCP 2>&1 | head -3 || echo 'Connected'" Enter
        ;;
        
    --connect-codex)
        log "Connecting Codex to MCP..."
        tmux send-keys -t codex-worker "export CODEX_MCP_CONFIG='$WORKSPACE_BASE/codex/.mcp.json'" Enter
        tmux send-keys -t codex-worker "codex mcp list 2>&1 | head -10 || echo 'Connected'" Enter
        ;;
        
    --sync)
        log "Syncing shared MCP config to all workspaces..."
        [ -f "$SHARED_MCP" ] || { echo "Shared config not found: $SHARED_MCP"; exit 1; }
        for agent in claude opencode codex; do
            cp "$SHARED_MCP" "$WORKSPACE_BASE/$agent/.mcp.json"
            log "✓ Synced to $agent workspace"
        done
        ;;
        
    --verify)
        log "Verifying agent MCP connections..."
        
        echo ""
        echo "Checking processes..."
        ps aux | grep -E "(claude|opencode|codex)" | grep -v grep || echo "No agent processes running"
        
        echo ""
        echo "Checking workspaces..."
        for agent in claude opencode codex; do
            mcp_json="$WORKSPACE_BASE/$agent/.mcp.json"
            if [ -f "$mcp_json" ]; then
                echo "  ✓ $agent workspace configured"
            else
                echo "  ✗ $agent workspace missing"
            fi
        done
        ;;
        
    --help|*)
        echo "Usage: hermes-a2a-mcp-sync.sh [command]"
        echo ""
        echo "Commands:"
        echo "  --status         Show MCP connection status"
        echo "  --connect-claude Connect Claude Code to MCP"
        echo "  --connect-opencode Connect OpenCode to MCP"
        echo "  --connect-codex   Connect Codex to MCP"
        echo "  --sync            Sync shared MCP config to workspaces"
        echo "  --verify          Verify all connections"
        echo "  --help            Show this help"
        ;;
esac