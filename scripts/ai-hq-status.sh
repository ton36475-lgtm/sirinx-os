#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os

echo "[ai-hq] project: /Users/sirinx/sirinx-os"
echo "[ai-hq] thClaws:"
thclaws --version | sed -n '1,3p'
echo "[ai-hq] Hermes:"
hermes --version
echo "[ai-hq] Kimi:"
kimi --version || true
echo "[ai-hq] Ollama models:"
ollama list | sed -n '1,12p'
echo "[ai-hq] Hermes MCP:"
hermes mcp list
echo "[ai-hq] thClaws MCP allowlist:"
cat /Users/sirinx/.config/thclaws/mcp_allowlist.json
echo "[ai-hq] bridge apps:"
test -d /Applications/Copilot.app && echo "Copilot.app: installed" || echo "Copilot.app: not found"
test -d /Applications/Perplexity.app && echo "Perplexity.app: installed" || echo "Perplexity.app: not found"
