#!/usr/bin/env bash
# Setup MCP servers for all coding agents
# Usage: ./setup-mcp-agents.sh [--claude-only | --opencode-only | --codex-only | --all]

set -e

ROOT="${SIRINX_OS_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SIRINX_FILES="$ROOT/scripts/mcp-sirinx-files.sh"
SLAYER="/Users/sirinx/SIRINXDev/_external_repos/slayer/.venv/bin/slayer"
SLAYER_STORAGE="/Users/sirinx/project-hermes/data/slayer"

# MCP config JSON path
MCP_CONFIG="$HOME/.mcp-servers-sirinx.json"

add_claude_mcp() {
    echo "=== Configuring Claude Code ==="
    
    # Check if claude is available
    if ! command -v claude &>/dev/null; then
        echo "Claude Code not installed, skipping..."
        return
    fi
    
    # Add stdio servers
    claude mcp add sirinx-files "$SIRINX_FILES" "$ROOT" --scope project 2>/dev/null || \
        echo "Note: sirinx-files may already exist or script not found"
    
    claude mcp add slayer-demo "$SLAYER" -- mcp --demo --storage "$SLAYER_STORAGE" --scope project 2>/dev/null || \
        echo "Note: slayer-demo may already exist or binary not found"
    
    # Add HTTP servers
    claude mcp add supabase "https://mcp.supabase.com/mcp?project_ref=bygvsfungvzjhnrxufmn" --transport http --scope project 2>/dev/null || true
    claude mcp add unreal-engine "http://127.0.0.1:8000/mcp" --transport http --scope project 2>/dev/null || true
    claude mcp add linear "https://mcp.linear.app/mcp" --transport http --scope project 2>/dev/null || true
    
    echo "Claude MCP servers:"
    claude mcp list 2>/dev/null || echo "Could not list (may require auth)"
}

add_opencode_mcp() {
    echo "=== Configuring OpenCode ==="
    
    # Check if opencode is available
    if ! command -v opencode &>/dev/null; then
        echo "OpenCode not installed, skipping..."
        return
    fi
    
    # OpenCode uses mcp.json config file
    opencode mcp add sirinx-files "$SIRINX_FILES" --scope project 2>/dev/null || true
    opencode mcp add slayer-demo "$SLAYER" --scope project 2>/dev/null || true
    
    echo "OpenCode MCP servers:"
    opencode mcp list 2>/dev/null || echo "Could not list"
}

add_codex_mcp() {
    echo "=== Configuring Codex ==="
    
    # Check if codex is available
    if ! command -v codex &>/dev/null; then
        echo "Codex not installed, skipping..."
        return
    fi
    
    # Codex uses its own MCP management
    codex mcp add sirinx-files "$SIRINX_FILES" 2>/dev/null || true
    codex mcp add slayer-demo "$SLAYER" -- mcp --demo --storage "$SLAYER_STORAGE" 2>/dev/null || true
    
    echo "Codex MCP servers:"
    codex mcp list 2>/dev/null || echo "Could not list"
}

create_unified_config() {
    echo "=== Creating unified MCP config ==="
    
    cat > "$MCP_CONFIG" << EOF
{
  "mcpServers": {
    "sirinx-files": {
      "command": "$SIRINX_FILES",
      "args": [],
      "env": {}
    },
    "slayer-demo": {
      "command": "$SLAYER",
      "args": ["mcp", "--demo", "--storage", "$SLAYER_STORAGE"],
      "env": {}
    },
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=bygvsfungvzjhnrxufmn"
    },
    "unreal-engine": {
      "url": "http://127.0.0.1:8000/mcp"
    },
    "linear": {
      "url": "https://mcp.linear.app/mcp"
    }
  }
}
EOF

    echo "Created $MCP_CONFIG"
    echo ""
    echo "Use this config:"
    echo "# For OpenCode: --mcp-config $MCP_CONFIG"
    echo "# For Claude Code: --mcp-config $MCP_CONFIG (via .claude/mcp.json)"
}

# Main
MODE="${1---all}"
case "$MODE" in
    --claude-only) add_claude_mcp ;;
    --opencode-only) add_opencode_mcp ;;
    --codex-only) add_codex_mcp ;;
    --all|*)
        create_unified_config
        add_claude_mcp
        add_opencode_mcp  
        add_codex_mcp
        ;;
esac

echo ""
echo "=== Setup Complete ==="
echo "Unified config at: $MCP_CONFIG"