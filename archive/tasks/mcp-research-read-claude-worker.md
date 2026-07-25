# Claude Code Migration Task - Read Research Files

## Task Description
Claude worker: อ่านไฟล์ reverse engineering ที่ให้ไว้จาก Kimi_Agent_QA archive และสรุปสถานะ Rust monorepo migration

## Files to Review (from extracted archive)
- `/tmp/kimi-qa-extract/brainstorm-k3-swarm-reverse-engineering.md`
- `/tmp/kimi-qa-extract/production.md`  
- `/tmp/kimi-qa-extract/agents-md-update-pack.md`
- `/tmp/kimi-qa-extract/qa-engineering-swarm-prompt-pattern.md`

## Action Required
1. Read all 4 files above
2. Generate status report on:
   - Migration phase currently
   - Security findings (android keystore, secrets/, node_modules/)
   - Model routing recommendations
   - QA Swarm Pattern integration

## Constraints (Per AGENTS.md)
- ✅ Dry-run mode (read-only)
- ✅ No file writes without approval
- ✅ Evidence required for all claims
- ✅ Tier: A (safe)