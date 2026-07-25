#!/bin/bash
# Local dry-run handshake. Creates no authenticated session and reads no secret.
set -euo pipefail

# Parse arguments
AGENT_ARG="${1:-}"
AGENT_ID="${2:-}"
CAPABILITIES="${3:-}"

# Validate
if [ -z "$AGENT_ARG" ] || [ -z "$AGENT_ID" ]; then
    echo "ERROR: Missing arguments"
    echo "Usage: $0 agent:codex 'Codex worker' coding,rust-build"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: curl and jq are required" >&2
    exit 1
fi

CONTROL_URL="${CONTROL:-http://127.0.0.1:8711}"
PAYLOAD=$(jq -cn \
    --arg agent_reference "$AGENT_ARG" \
    --arg agent_id "$AGENT_ID" \
    --arg capabilities "$CAPABILITIES" \
    '{agent_reference:$agent_reference,agent_id:$agent_id,capabilities:$capabilities,dry_run_only:true}')

# Make request to Control API
RESPONSE=$(curl --fail-with-body --silent --show-error \
    --connect-timeout 2 --max-time 10 \
    -X POST "${CONTROL_URL%/}/api/handshake/dry-run" \
    -H "Content-Type: application/json" \
    --data-binary "$PAYLOAD")

# Output response
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Check if dry-run
echo "$RESPONSE" | jq -e '
  .status == "a2a-handshake-dry-run-ready" and
  .dryRunOnly == true and
  .authenticatedSessionCreated == false and
  .providerCalled == false and
  .externalWrites == false and
  .queueMutated == false
' >/dev/null
echo ""
echo "✓ Handshake contract OK (local dry-run; no session or queue mutation)"
