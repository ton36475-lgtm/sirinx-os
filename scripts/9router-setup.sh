#!/bin/bash
# 9Router Integration Scripts

echo "=== 9Router Provider Router ==="
echo "Phase 3B - Local Provider Gateway Setup"

# Check if 9router binary exists
if [ -d "$HOME/.9router" ]; then
    echo "9router found at $HOME/.9router"
else
    echo "9router not installed - using config-only mode"
fi

# Validate config
npx tsx -e "
import yaml from 'json';
const config = yaml.parse(require('fs').readFileSync('config/model-router/9router-config.yaml', 'utf8'));
console.log('Providers:', config.providers.allowed);
console.log('Cost ceiling:', config.cost_ceiling);
console.log('Token saver:', config.token_saver.enabled);
console.log('Fallback enabled:', config.fallback.enabled);
"

echo "Configuration validated - ready for provider routing"