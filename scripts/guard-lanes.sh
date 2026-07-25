#!/usr/bin/env bash
# Lane Guard — prevents agents from writing outside their assigned lanes
# Exit 0 = OK, Exit 1 = REJECT
set -euo pipefail

SCHEMA="SYSTEM_SCHEMA.yaml"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# Determine which agent we are based on branch
case "$BRANCH" in
  vibe/codex)    AGENT="codex";    ALLOWED=("services/" "crates/" "GHOSTCLAW/workers/" "GHOSTCLAW/agents/" "GHOSTCLAW/protocols/" "GHOSTCLAW/models/" "ghostclaw-os/" "packages/database/" "packages/security/" "packages/agent-sdk/") ;;
  vibe/opencode) AGENT="opencode"; ALLOWED=("apps/" "tests/" "infra/" "infrastructure/" "security/" "packages/ui/" "packages/types/" "packages/logger/" "devtools/" "playwright-report/") ;;
  vibe/claude)   AGENT="claude";   ALLOWED=("docs/" "prompts/" "kms/" "schemas/" "packages/config/" "packages/provider-adapters/" "WORKSPACE_SCAFFOLD/" "openwiki/" "examples/") ;;
  migration/v5-rebase) exit 0 ;; # Hermes main, allowed everything
  *) exit 0 ;; # Unknown branch, allow
esac

# Get staged files
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

if [ -z "$STAGED" ]; then
  exit 0
fi

# Check each staged file against allowed prefixes
VIOLATIONS=""
for file in $STAGED; do
  OK=false
  for prefix in "${ALLOWED[@]}"; do
    if [[ "$file" == "$prefix"* ]]; then
      OK=true
      break
    fi
  done
  if [ "$OK" = false ]; then
    VIOLATIONS="$VIOLATIONS\n  ✗ $file"
  fi
done

if [ -n "$VIOLATIONS" ]; then
  echo ""
  echo "🚫 LANE GUARD REJECTED ($AGENT on $BRANCH)"
  echo "═══════════════════════════════════════════"
  echo -e "Files outside your lane:$VIOLATIONS"
  echo ""
  echo "Your lane owns: ${ALLOWED[*]}"
  echo "See SYSTEM_SCHEMA.yaml for full lane assignments"
  echo "═══════════════════════════════════════════"
  exit 1
fi

exit 0
