#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os

echo "[sirinx] checking Ollama"
curl -fsS http://127.0.0.1:11434/api/tags >/dev/null

echo "[sirinx] ensuring local models exist"
ollama list | grep -q '^hermes-prime-lite' || ollama create hermes-prime-lite -f /Users/sirinx/sirinx-os/ollama/Modelfile.hermes-prime-lite
ollama list | grep -q '^deepseek-r1-lite' || ollama create deepseek-r1-lite -f /Users/sirinx/sirinx-os/ollama/Modelfile.deepseek-r1-lite

echo "[sirinx] local models"
ollama list

echo "[sirinx] start commands"
echo "  thclaws: cd /Users/sirinx/sirinx-os && thclaws --cli"
echo "  hermes:  cd /Users/sirinx/sirinx-os && hermes --provider custom --model hermes-prime-lite"
echo "  api:     npm run dev:api"
echo "  ui:      npm run dev:dashboard"
