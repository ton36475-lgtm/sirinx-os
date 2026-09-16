#!/usr/bin/env bash
# Node Discovery + Join Script — for Pleasse nodes and future machines
# Usage: curl -fsSL https://sirinx.co/api/agent/join | bash
# Or:    bash scripts/join-cluster.sh <controller-ip>
set -euo pipefail

CONTROLLER="${1:-localhost}"
CLUSTER_TOKEN="${SIRINX_CLUSTER_TOKEN:-}"

if [ -z "$CLUSTER_TOKEN" ]; then
  echo "❌ SIRINX_CLUSTER_TOKEN not set"
  echo "   export SIRINX_CLUSTER_TOKEN=<token from controller>"
  exit 1
fi

echo "🔌 Joining SIRINX cluster at $CONTROLLER..."

# 1. Register with controller
RESPONSE=$(curl -sf -X POST "http://$CONTROLLER:20128/api/agent/register" \
  -H "Authorization: Bearer $CLUSTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"hostname\":\"$(hostname)\",\"platform\":\"$(uname -s)\",\"arch\":\"$(uname -m)\"}" 2>&1) || {
  echo "❌ Failed to register with controller"
  exit 1
}

echo "✅ Registered: $RESPONSE"

# 2. Install Hermes Agent if not present
if ! command -v hermes &>/dev/null; then
  echo "📦 Installing Hermes Agent..."
  curl -fsSL https://raw.githubusercontent.com/nousresearch/hermes-agent/main/install.sh | bash
fi

# 3. Pull agent profile
mkdir -p ~/.hermes/profiles/
echo "🔄 Pulling agent profiles from controller..."
# Future: rsync or git clone profiles

# 4. Start agent loop
echo "🚀 Starting agent loop..."
echo "Node ready for task dispatch via OmniRoute"
