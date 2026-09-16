#!/usr/bin/env bash
# ==============================================================================
# GC-MAKER-GATE.SH — Maker Quality Gate (Kiro)
# ==============================================================================
# Runs BEFORE code is dispatched to the MAKER phase.
# Checks:
#   1. Agent has a valid PRODUCT.md assigned
#   2. Git branch is correct (not main)
#   3. No .env files are staged for commit
#   4. No secrets (KEY=, SECRET=, TOKEN=, PASSWORD) in staged files
#
# Usage: bash gc-maker-gate.sh [agent_name]
#   agent_name defaults to "kiro" (the MAKER agent)
#
# Exit 0 = PASS, Exit 1 = FAIL
# ==============================================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
SIRINX_ROOT="${SIRINX_PROJECT_ROOT:-/Users/sirinx/sirinx-os}"
AGENT_NAME="${1:-kiro}"
PRODUCT_DIR="${SIRINX_ROOT}/.ghostclaw_runtime/PRODUCT"

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── State ────────────────────────────────────────────────────────────────────
failures=0

pass() {
  echo -e "${GREEN}[PASS]${NC} $*"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

fail() {
  echo -e "${RED}[FAIL]${NC} $*"
  failures=$((failures + 1))
}

header() {
  echo ""
  echo -e "${CYAN}━━━ $* ━━━${NC}"
}

# ── Prelude ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔍 GC Maker Quality Gate — Agent: ${AGENT_NAME}${NC}"
echo -e "${BOLD}   $(date -u +'%Y-%m-%dT%H:%M:%SZ')${NC}"
echo ""

# ── Check 1: PRODUCT.md ─────────────────────────────────────────────────────
header "Check 1: PRODUCT.md Assignment"

PRODUCT_FILE="${PRODUCT_DIR}/PRODUCT.${AGENT_NAME}.md"

if [ ! -d "$PRODUCT_DIR" ]; then
  fail "PRODUCT directory not found at ${PRODUCT_DIR}"
elif [ ! -f "$PRODUCT_FILE" ]; then
  fail "PRODUCT.md not found for agent '${AGENT_NAME}' — expected at: ${PRODUCT_FILE}"
else
  # Verify it's non-empty and has required fields
  if [ ! -s "$PRODUCT_FILE" ]; then
    fail "PRODUCT.md for '${AGENT_NAME}' exists but is empty"
  elif ! grep -qi "^# PRODUCT" "$PRODUCT_FILE" 2>/dev/null; then
    warn "PRODUCT.md for '${AGENT_NAME}' may be malformed (no PRODUCT heading)"
    pass "PRODUCT.md file exists (but check formatting)"
  else
    pass "Valid PRODUCT.md found for agent '${AGENT_NAME}'"
  fi
fi

# ── Check 2: Git Branch ─────────────────────────────────────────────────────
header "Check 2: Git Branch"

if ! git -C "$SIRINX_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  fail "Not a git repository at ${SIRINX_ROOT}"
else
  CURRENT_BRANCH="$(git -C "$SIRINX_ROOT" branch --show-current 2>/dev/null || echo '')"
  if [ -z "$CURRENT_BRANCH" ]; then
    fail "Could not determine current git branch (detached HEAD?)"
  elif [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    fail "On protected branch '${CURRENT_BRANCH}' — switch to a feature branch before dispatching to MAKER"
  else
    pass "On feature branch '${CURRENT_BRANCH}' (not main/master)"
  fi
fi

# ── Check 3: No .env files staged ───────────────────────────────────────────
header "Check 3: Staged .env Files"

STAGED_ENV="$(
  git -C "$SIRINX_ROOT" diff --cached --name-only 2>/dev/null \
    | grep -i '\.env$' \
    || true
)"

if [ -n "$STAGED_ENV" ]; then
  fail ".env files are staged for commit — refusing MAKER dispatch:"
  echo "$STAGED_ENV" | while IFS= read -r line; do
    echo "       🔒 $line"
  done
else
  pass "No .env files staged"
fi

# ── Check 4: Secrets in staged files ────────────────────────────────────────
header "Check 4: Secrets Scan (KEY=, SECRET=, TOKEN=, PASSWORD)"

SECRET_PATTERNS="(KEY=|SECRET=|TOKEN=|PASSWORD=)"

# Get staged files (excluding deleted files)
STAGED_FILES="$(
  git -C "$SIRINX_ROOT" diff --cached --name-only --diff-filter=ACMR 2>/dev/null \
    || true
)"

if [ -z "$STAGED_FILES" ]; then
  pass "No staged files to scan for secrets"
else
  found_secrets=false
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    # Only scan files that actually exist (not deleted)
    [ ! -f "${SIRINX_ROOT}/${file}" ] && continue

    # Scan for secret patterns (suppress false positives from comments/docs)
    matches="$(
      git -C "$SIRINX_ROOT" diff --cached "$file" 2>/dev/null \
        | grep '^+' \
        | grep -v '^+++' \
        | grep -iE "$SECRET_PATTERNS" \
        | grep -vE '(EXAMPLE_|PLACEHOLDER_|DUMMY_|sample|example|your-)' \
        || true
    )"
    if [ -n "$matches" ]; then
      echo "       ⚠️  ${file}:"
      echo "$matches" | while IFS= read -r line; do
        # Mask the value portion for safety in output
        masked="$(echo "$line" | sed -E 's/(KEY=|SECRET=|TOKEN=|PASSWORD=)[^"]+/\1***MASKED***/g' | sed 's/^+//')"
        echo "          ${masked}"
      done
      found_secrets=true
    fi
  done <<< "$STAGED_FILES"

  if [ "$found_secrets" = true ]; then
    fail "Potential secrets detected in staged changes — review and remove before MAKER dispatch"
  else
    pass "No secrets detected in staged changes"
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [ "$failures" -gt 0 ]; then
  echo -e "${RED}${BOLD}❌ MAKER QUALITY GATE FAILED — ${failures} check(s) failed${NC}"
  echo -e "${RED}   Fix the issues above before dispatching to MAKER phase.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}✅ MAKER QUALITY GATE PASSED — All checks clear${NC}"
  exit 0
fi
