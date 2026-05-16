#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os

echo "[test] Ollama tags"
curl -fsS http://127.0.0.1:11434/api/tags >/dev/null

echo "[test] hermes-prime-lite chat"
hermes_response="$(curl -fsS http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"hermes-prime-lite","prompt":"Return the token OK only.","stream":false,"options":{"num_predict":16}}')"
node -e 'const data = JSON.parse(process.argv[1]); if (!data.done || !String(data.response || "").trim()) process.exit(1);' "$hermes_response"

echo "[test] deepseek-r1-lite chat"
deepseek_response="$(curl -fsS http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-r1-lite","prompt":"Return concise local risk support for SIRINX.","stream":false,"think":true,"options":{"num_predict":64}}')"
node -e 'const data = JSON.parse(process.argv[1]); const output = `${data.response || ""}${data.thinking || ""}`.trim(); if (!data.done || !output) process.exit(1);' "$deepseek_response"

echo "[test] thClaws version"
thclaws --version >/dev/null

echo "[test] Hermes config"
hermes config check >/dev/null

echo "[test] all local AI checks passed"
