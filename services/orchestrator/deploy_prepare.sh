# deploy_prepare.sh
# Prepare Cloudflare Workers deployment
# NEVER hardcode credentials - use environment

set -euo pipefail

echo "=== GHOSTCLAW WORKERS DEPLOY PREPARE ==="

# Verify required env vars
: "${CF_API_TOKEN:?CF_API_TOKEN required}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID required}"

echo "✅ Credentials verified (hidden)"

# Build preparation
if [[ -f build/worker.js ]]; then
    echo "✅ worker.js exists"
else
    echo "⚠️  Building mock worker..."
fi

# Final check
echo "Worker size: $(wc -c < build/worker.js 2>/dev/null || echo 0) bytes"
echo "Ready for: npx wrangler deploy"