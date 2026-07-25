# Kimi Moonshot AI Integration

## Overview

Kimi (Moonshot AI) provider stub for GhostClaw OS with OAuth support.

## Files

- `/Users/sirinx/sirinx-os/crates/ghostclaw-providers/src/kimi.rs` - Kimi provider implementation
- `/Users/sirinx/sirinx-os/crates/ghostclaw-providers/src/lib.rs` - Export added
- `/Users/sirinx/sirinx-os/.mcp.json` - MCP server config
- `/Users/sirinx/sirinx-os/.env.example` - Environment variable template

## Setup

1. **Get OAuth Token** from Moonshot AI
2. **Set Environment Variable**:
   ```bash
   export KIMI_OAUTH_TOKEN="your_token_here"
   ```
3. **Add to .env**:
   ```
   KIMI_OAUTH_TOKEN=your_actual_token
   ```

## Usage (Rust)

```rust
use ghostclaw_providers::KimiProvider;

// Basic provider
let provider = KimiProvider::new();

// With OAuth token
let provider = KimiProvider::with_token("your_token".into());

// Check OAuth status
if provider.has_oauth() {
    println!("OAuth enabled");
}

// Get endpoints
let endpoint = provider.endpoint();  // https://api.moonshot.cn/v1/chat/completions
let oauth_url = provider.oauth_url(); // https://api.moonshot.cn/oauth/authorize
```

## Tests

```bash
cargo test --package ghostclaw-providers
```

All 7 tests pass:
- test_kimi_provider_name
- test_kimi_endpoint
- test_kimi_oauth_url
- test_kimi_with_token
- test_kimi_no_oauth_default
- test_glm_provider_name
- test_glm_endpoint

## Status

✅ Provider stub created
✅ Tests passing
✅ MCP server configured
✅ Environment template updated
⏳ Real API calls (requires OAuth token)
