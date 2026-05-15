#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os

echo "[test] thClaws v0.8.8"
thclaws --version | grep -q "0.8.8"

echo "[test] thClaws MCP allowlist"
grep -q "/Users/sirinx/sirinx-os/scripts/mcp-sirinx-files.sh" /Users/sirinx/.config/thclaws/mcp_allowlist.json

echo "[test] Hermes config"
hermes config check >/dev/null

echo "[test] Hermes MCP"
hermes mcp test sirinx-files >/dev/null

echo "[test] Ollama local AI"
/Users/sirinx/sirinx-os/scripts/test-local-ai.sh >/dev/null

echo "[test] Kimi CLI"
kimi info >/dev/null

echo "[test] Node workspace"
npm run verify >/dev/null

echo "[test] AI HQ checks passed"
