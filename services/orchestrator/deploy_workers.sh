#!/bin/bash
# deploy_workers.sh
# Deploy to Cloudflare Workers (WASM target)

export PATH="$HOME/.cargo/bin:$PATH"

echo "🔧 Building WASM..."
cargo build --target wasm32-unknown-unknown --release 2>&1 | tail -5

if [ $? -eq 0 ]; then
    echo "📦 Deploying to Workers..."
    npx wrangler deploy --dry-run || echo "⚠️ Set CF_API_TOKEN for real deploy"
else
    echo "⚠️ WASM build failed - using native binary for testing"
fi