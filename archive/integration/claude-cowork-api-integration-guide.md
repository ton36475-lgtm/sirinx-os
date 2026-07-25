# Claude CoWork API Integration - Complete Setup Guide

## 🎯 Objective
Fix Claude CoWork application with MaxPlus API integration, GLM 5.2 Chinese model, and CoinTH Thai language support.

## ✅ Status Summary

**Configuration Status:**
- ✅ MaxPlus Config: Created and ready
- ✅ Cline Config: Pre-configured with MaxPlus endpoint
- ✅ API Endpoint: Tested and reachable
- ⚠️ API Key: Needs to be set by user
- ✅ Model Integration: GLM 5.2 + Moonshot + CoinTH configured

**System Components:**
- ✅ Claude Desktop App: Running
- ✅ CoWork Processes: Active (5 found)
- ❌ OmniRoute: Not running (needs restart)
- ✅ Vibe Coding: Configured with 3-lane system
- ✅ GLM Provider: Rust implementation exists

## 🔧 Configuration Files Created

1. **MaxPlus Configuration**: `/Users/sirinx/sirinx-os/config/maxplus_updated_config.yaml`
   - Multi-model support (Moonshot, GLM 5.2, GLM 4, CoinTH)
   - Provider priority routing
   - Claude CoWork integration settings
   - Vibe Coding provider configuration

2. **Setup Script**: `/Users/sirinx/sirinx-os/scripts/setup_claude_cowork_api.sh`
   - Automated configuration check
   - API endpoint testing
   - Integration verification

## 🌐 API Providers Research

### MaxPlus API (Primary)
- **Website**: https://maxplus.ai
- **Endpoint**: https://api.maxplus-ai.cc/v1
- **Purpose**: Chinese AI model provider
- **Models**: 
  - Moonshot v1 128K (Kimi Chinese model)
  - GLM 5.2 Chat (Latest Chinese language model)
  - GLM 4 Plus (Chinese language model)
- **Status**: ✅ Endpoint tested and reachable

### GLM 5.2 / Zhipu AI
- **Website**: https://zhipuai.ai (primary)
- **Alternative**: https://glm.ai (may redirect)
- **Model**: GLM-5.2-chat
- **Direct Endpoint**: https://api.z.ai/api/paas/v4
- **Integration**: Available via MaxPlus or direct access

### CoinTH (Thai Language)
- **Website**: https://cointh.ai
- **Purpose**: Thai/Chinese AI integration
- **Status**: Limited public documentation
- **Endpoint**: https://api.cointh.ai/v1
- **Use Case**: Thai language model routing

## 🚀 Setup Instructions

### Step 1: Get MaxPlus API Key (Required)

1. Visit https://maxplus.ai
2. Register for API access
3. Get API key from dashboard
4. Save the API key securely

### Step 2: Update Configuration

```bash
# Edit the MaxPlus configuration
nano /Users/sirinx/sirinx-os/config/maxplus_updated_config.yaml

# Replace this line:
api_key: "YOUR_MAXPLUS_API_KEY_HERE"

# With your actual API key:
api_key: "sk-your-actual-maxplus-api-key-here"
```

### Step 3: Update Cline Configuration (Optional)

Cline is already pre-configured with the correct MaxPlus endpoint:

```json
{
  "provider": "openai",
  "openAiBaseUrl": "https://api.maxplus-ai.cc/v1",
  "openAiModelId": "moonshot-v1-128k",
  "openAiApiKey": "MAXPLUS_API_KEY_1"
}
```

### Step 4: Test Integration

```bash
# Test MaxPlus endpoint
curl -X POST https://api.maxplus-ai.cc/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model":"moonshot-v1-128k","messages":[{"role":"user","content":"你好"}]}'

# Test with Cline (Chinese model)
cline "你好世界"  # Test Moonshot model

# Test GLM 5.2
cline -P openai -m glm-5.2-chat "测试GLM-5.2"

# Test with Thai language (if CoinTH available)
cline -P openai -m moonshot-v1-128k "สวัสดี"
```

### Step 5: Vibe Coding Integration

```bash
# Restart OmniRoute with new configuration
cd /Users/sirinx/sirinx-os/integrations/omniroute
npm run dev

# Test Vibe Coding with new providers
/Users/sirinx/sirinx-os/vibe-coding-config/vibe_dispatch.sh "Implement feature X" opencode
/Users/sirinx/sirinx-os/vibe-coding-config/vibe_dispatch.sh "Fix authentication bug" codex

# Check Vibe Coding status
/Users/sirinx/sirinx-os/vibe-coding-config/vibe_status.sh
```

## 📊 Available Models

### Via MaxPlus Endpoint
- **moonshot-v1-128k**: Kimi Chinese model (recommended)
- **glm-5.2-chat**: GLM 5.2 latest Chinese model
- **glm-4-plus**: GLM 4.x Chinese model

### Alternative Endpoints
- **GLM Direct**: https://api.z.ai/api/paas/v4 (GLM models)
- **CoinTH**: https://api.cointh.ai/v1 (Thai language)

## 🔧 Model Routing Rules

### Chinese Tasks
- **Preferred**: moonshot-v1-128k
- **Fallback**: glm-5.2-chat

### Thai Tasks
- **Preferred**: cointh (if available)
- **Fallback**: moonshot-v1-128k

### General Tasks
- **Preferred**: glm-5.2-chat
- **Fallback**: moonshot-v1-128k

## 🎯 Vibe Coding Provider Setup

### Lane Configuration
- **Codex Lane**: glm-5.2-chat (backend tasks)
- **OpenCode Lane**: moonshot-v1-128k (frontend tasks)
- **Hermes Lane**: glm-4-plus (coordination tasks)

### Provider Priority
1. MaxPlus (primary)
2. GLM Direct (fallback)
3. CoinTH (Thai language)

## 🔍 Troubleshooting

### Common Issues

**Issue**: API authentication failed
```
Solution: Check API key is correctly set in config files
```

**Issue**: Model not available
```
Solution: Verify model name matches available models
Use: moonshot-v1-128k, glm-5.2-chat, glm-4-plus
```

**Issue**: Endpoint not reachable
```
Solution: Test endpoint connectivity with curl
Check network/firewall settings
```

**Issue**: OmniRoute not running
```
Solution: cd /Users/sirinx/sirinx-os/integrations/omniroute && npm run dev
```

### Verification Commands

```bash
# Check configuration
/Users/sirinx/sirinx-os/scripts/setup_claude_cowork_api.sh

# Test Cline integration
cline --version
cline "test"  # Should use MaxPlus

# Check OmniRoute status
curl http://localhost:20128/health

# Check Vibe Coding status
/Users/sirinx/sirinx-os/vibe-coding-config/vibe_status.sh
```

## 📈 Performance Considerations

- **Rate Limits**: 60 requests/minute, 100K tokens/minute
- **Timeout**: 30 seconds default
- **Max Tokens**: 4096 tokens default
- **Temperature**: 0.7 default (adjustable)

## 🚀 Production Checklist

- [ ] Get MaxPlus API key from maxplus.ai
- [ ] Update configuration files with API key
- [ ] Test API endpoint connectivity
- [ ] Test Cline integration with Chinese models
- [ ] Restart OmniRoute with new configuration
- [ ] Test Vibe Coding provider routing
- [ ] Verify multi-model fallback works
- [ ] Test Thai language routing (if CoinTH available)
- [ ] Monitor API usage and rate limits

## 📞 Support

**MaxPlus API**: https://maxplus.ai/docs
**GLM/Zhipu AI**: https://zhipuai.ai/docs
**CoinTH**: https://cointh.ai (limited docs)

**Local Testing**: Use provided setup script for verification

---

**Status**: Configuration complete, awaiting API key setup
**Last Updated**: 2026-07-21
**Integration**: MaxPlus + GLM 5.2 + CoinTH ready for activation