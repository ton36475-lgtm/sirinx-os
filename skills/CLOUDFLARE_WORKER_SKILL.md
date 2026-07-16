# skills/CLOUDFLARE_WORKER_SKILL.md
## Cloudflare Worker Optimization Skill

Goal: Optimize WASM builds for edge deployment
Constraints: 
- Target: wasm32-unknown-unknown
- Bundle size: < 1MB
- Cold start: < 50ms

File Scope:
- services/orchestrator/crates/**
- services/orchestrator/wrangler.toml

Expected Result:
- Optimized worker.js
- KV binding configured
- Deployment ready

Verification:
- cargo check --target wasm32-unknown-unknown
- wrangler dev succeeds

Report Format:
- Bundle size metrics
- Cold start timing
- Deployment notes