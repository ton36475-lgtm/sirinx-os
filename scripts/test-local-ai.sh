#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os

echo "[test] Ollama tags"
curl -fsS http://127.0.0.1:11434/api/tags >/dev/null

echo "[test] hermes-prime-lite chat"
hermes_response="$(curl -fsS http://127.0.0.1:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"hermes-prime-lite","messages":[{"role":"user","content":"Reply with exactly: SIRINX_LOCAL_OK"}],"max_tokens":16}')"
[[ "$hermes_response" == *"SIRINX_LOCAL_OK"* ]]

echo "[test] deepseek-r1-lite chat"
deepseek_response="$(curl -fsS http://127.0.0.1:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-r1-lite","messages":[{"role":"user","content":"Reply with exactly: SIRINX_BRAIN_OK"}],"max_tokens":32}')"
[[ "$deepseek_response" == *"SIRINX_BRAIN_OK"* ]]

echo "[test] thClaws version"
thclaws --version >/dev/null

echo "[test] Hermes config"
hermes config check >/dev/null

echo "[test] all local AI checks passed"
