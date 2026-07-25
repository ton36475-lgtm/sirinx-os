#!/usr/bin/env bash
# apiKeyHelper for the maxplus lane (P098 Rev D / M5).
#
# Prints the gateway credential to stdout. Claude Code sends the value in both
# the Authorization and x-api-key headers, so it works whichever the gateway reads.
#
# The credential lives in exactly one place — <repo>/.env, mode 600, git-ignored.
# It is deliberately NOT duplicated into any settings file: .claude/settings.json
# is committed, and the Claude Code docs warn against putting a credential there.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$repo_root/.env"

[[ -f "$env_file" ]] || { echo "missing $env_file" >&2; exit 1; }

# Read only the one variable; never print anything else from the file.
key="$(grep -m1 '^MAXPLUS_API_KEY=' "$env_file" | cut -d= -f2-)"

[[ -n "$key" ]] || { echo "MAXPLUS_API_KEY is empty in $env_file" >&2; exit 1; }

printf '%s' "$key"
