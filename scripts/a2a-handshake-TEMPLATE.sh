# A2A Handshake Script (Safe Version)
# Uses environment variables instead of inline tokens

```bash
#!/bin/bash
# scripts/a2a-handshake.sh - Agent-to-Agent handshake

# Read from .env or environment (never hardcode)
source .env 2>/dev/null || true

# Validate inputs
if [ -z "$CONTROL_API_TOKEN" ]; then
    echo "ERROR: CONTROL_API_TOKEN not set"
    exit 1
fi

# Handshake to Control API
curl -s -X POST "$CONTROL/handshake" \
  -H "Authorization: Bearer $CONTROL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "'"$2"'",
    "capabilities": "'"$3"'"
  }' | jq .
```

## Usage (Safe):
```bash
# Set env vars in .env or shell
export CONTROL=http://127.0.0.1:8711
export CONTROL_API_TOKEN=$(cat .secrets/control_token)

# Run handshake
./scripts/a2a-handshake.sh agent:codex "Codex worker" "coding,rust-build"
```

## Security Notes:
- Never put tokens in command line
- Use `.secrets/` directory (gitignored)
- Pre-commit hook should block token leaks
- Receipt generated on successful handshake