#!/usr/bin/env bash
set -euo pipefail

brain="/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md"
stamp="$(date '+%Y-%m-%d %H:%M:%S %Z')"

mkdir -p "$(dirname "$brain")"

{
  echo ""
  echo "## $stamp"
  echo ""
  echo "- Checked local HQ status sources from /Users/sirinx/sirinx-os/config/ai-hq.sources.json."
  echo "- Next safe action: review one official source, then add only a short note and link."
  echo "- Guardrail: no installs, SaaS writes, token changes, or transcript copying without approval."
} >> "$brain"

echo "$brain"
