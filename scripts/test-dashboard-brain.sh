#!/usr/bin/env bash
set -euo pipefail

api="${DEV_CONTROL_API_URL:-http://127.0.0.1:8711}"
dashboard="${DEV_DASHBOARD_URL:-http://127.0.0.1:8710}"

echo "[test] dashboard health"
health="$(curl -fsS "$api/health")"
[[ "$health" == *"sirinx-dev-control-api"* ]]

echo "[test] Obsidian brain index"
brain="$(curl -fsS "$api/api/brain")"
[[ "$brain" == *"AI HQ DNA Brain"* ]]
[[ "$brain" == *"SIRINX AI Team Kanban"* ]]
[[ "$brain" == *"SIRINX Skill Hub"* ]]

echo "[test] Obsidian DNA note"
dna="$(curl -fsS "$api/api/brain/ai-hq-dna-brain")"
[[ "$dna" == *"Current DNA"* ]]
[[ "$dna" == *"obsidian://open"* ]]

echo "[test] dashboard HTML"
html="$(curl -fsS "$dashboard/")"
[[ "$html" == *'aria-label="Obsidian brain"'* ]]
[[ "$html" == *"AI HQ DNA Dashboard"* ]]

echo "[test] dashboard brain checks passed"
