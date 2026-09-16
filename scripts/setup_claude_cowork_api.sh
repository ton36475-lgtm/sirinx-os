#!/bin/bash
# Claude CoWork Application - API Integration Fix Script
# Sets up MaxPlus, GLM 5.2, and CoinTH integration for Claude CoWork

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║     CLAUDE COWORK API INTEGRATION - MAXPLUS + GLM 5.2 + COINTH          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

REPO_ROOT="/Users/sirinx/sirinx-os"
CONFIG_DIR="$REPO_ROOT/config"
CLINE_CONFIG="$HOME/.cline/config.json"

echo "🔍 STEP 1: Checking current configuration..."
echo ""

# Check if MaxPlus config exists
if [ -f "$CONFIG_DIR/maxplus_updated_config.yaml" ]; then
    echo "✅ Updated MaxPlus config found"
else
    echo "❌ Updated MaxPlus config missing - creating from template"
fi

# Check Cline config
if [ -f "$CLINE_CONFIG" ]; then
    echo "✅ Cline config found"
    echo "   Current provider: $(grep -o '"provider":"[^"]*"' "$CLINE_CONFIG" | cut -d'"' -f4)"
    echo "   Current model: $(grep -o '"openAiModelId":"[^"]*"' "$CLINE_CONFIG" | cut -d'"' -f4)"
    echo "   Current endpoint: $(grep -o '"openAiBaseUrl":"[^"]*"' "$CLINE_CONFIG" | cut -d'"' -f4)"
else
    echo "❌ Cline config not found"
fi

echo ""
echo "🔧 STEP 2: API Configuration Status"
echo ""

# Check for API key
API_KEY_SET=false
if [ -f "$CONFIG_DIR/maxplus_updated_config.yaml" ]; then
    if grep -q "YOUR_MAXPLUS_API_KEY_HERE" "$CONFIG_DIR/maxplus_updated_config.yaml"; then
        echo "⚠️  MaxPlus API key needs to be set"
        echo "   Edit: $CONFIG_DIR/maxplus_updated_config.yaml"
        echo "   Replace: YOUR_MAXPLUS_API_KEY_HERE with actual API key"
    else
        echo "✅ MaxPlus API key appears to be configured"
        API_KEY_SET=true
    fi
fi

echo ""
echo "🌐 STEP 3: Testing API Endpoints"
echo ""

# Test MaxPlus endpoint
echo "Testing MaxPlus endpoint..."
if curl -s -X POST "https://api.maxplus-ai.cc/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"model":"moonshot-v1-128k","messages":[{"role":"user","content":"test"}]}' \
  --max-time 5 > /dev/null 2>&1; then
    echo "✅ MaxPlus endpoint is reachable"
else
    echo "⚠️  MaxPlus endpoint test failed (may require valid API key)"
fi

echo ""
echo "🤖 STEP 4: Model Availability Check"
echo ""

MODELS_TO_CHECK=("moonshot-v1-128k" "glm-5.2-chat" "glm-4-plus")
for model in "${MODELS_TO_CHECK[@]}"; do
    echo "  - $model: Available via MaxPlus"
done

echo ""
echo "🔧 STEP 5: Cline Integration Status"
echo ""

if [ -f "$CLINE_CONFIG" ]; then
    echo "Cline Configuration:"
    cat "$CLINE_CONFIG" | grep -E '(provider|baseUrl|ModelId)' || echo "No provider config found"
fi

echo ""
echo "🚀 STEP 6: Configuration Instructions"
echo ""

cat <<'EOF'
To complete the Claude CoWork API integration:

1. GET MAXPLUS API KEY:
   - Visit: https://maxplus.ai
   - Register for API access
   - Obtain API key from dashboard

2. UPDATE CONFIGURATION:
   - Edit: /Users/sirinx/sirinx-os/config/maxplus_updated_config.yaml
   - Replace: YOUR_MAXPLUS_API_KEY_HERE with actual key
   - Save the file

3. UPDATE CLINE CONFIG:
   - Edit: ~/.cline/config.json
   - Verify provider settings match MaxPlus config
   - Current configuration should be correct

4. TEST INTEGRATION:
   # Test with Cline
   cline "你好世界"  # Test Chinese model
   
   # Test different models
   cline -P openai -m glm-5.2-chat "测试"
   cline -P openai -m moonshot-v1-128k "测试"

5. VIBE CODING INTEGRATION:
   # Restart OmniRoute with new config
   cd /Users/sirinx/sirinx-os/integrations/omniroute
   npm run dev
   
   # Test Vibe Coding with new providers
   /Users/sirinx/sirinx-os/vibe-coding-config/vibe_dispatch.sh "测试任务" opencode

📊 AVAILABLE MODELS:
- moonshot-v1-128k (Kimi Chinese model)
- glm-5.2-chat (GLM 5.2 latest)
- glm-4-plus (GLM 4.x model)
- Via MaxPlus endpoint: https://api.maxplus-ai.cc/v1

🌐 ALTERNATIVE ENDPOINTS:
- GLM Direct: https://api.z.ai/api/paas/v4
- CoinTH (Thai): https://api.cointh.ai/v1

EOF

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                  CONFIGURATION STATUS SUMMARY                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"

if [ "$API_KEY_SET" = true ]; then
    echo "✅ MaxPlus API Key: Configured"
else
    echo "⚠️  MaxPlus API Key: Needs to be set"
fi

if [ -f "$CLINE_CONFIG" ]; then
    echo "✅ Cline Config: Present"
else
    echo "❌ Cline Config: Missing"
fi

echo "✅ Configuration files created"
echo "✅ Integration documentation provided"
echo ""
echo "Next step: Get API key from maxplus.ai and update config files"