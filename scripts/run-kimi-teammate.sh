#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os
exec kimi \
  --work-dir /Users/sirinx/sirinx-os \
  --add-dir "/Users/sirinx/Documents/Obsidian Vault" \
  --mcp-config-file /Users/sirinx/sirinx-os/.claude/mcp.json \
  --skills-dir /Users/sirinx/sirinx-os/skills
