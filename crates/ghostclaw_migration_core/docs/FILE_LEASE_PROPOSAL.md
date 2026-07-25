# P085 File Lease Proposal

## Lease Scope

Allowed paths:

- `crates/ghostclaw_migration_core/**`
- `reports/mission/A2A2A_P085_GHOSTCLAW_RUST_MIGRATION_CORE_20260704.md`

Blocked paths:

- `.env`
- `.env.*`
- `secrets/**`
- `.git/**`
- production deploy scripts
- Cloudflare/R2 production config
- Telegram live runtime files unless a later adapter packet opens them

## Mutation Boundary

This packet adds an isolated Rust crate and docs only. It must not rewrite Python Hermes runtime, start Telegram, execute Codex, push, deploy, or mutate cloud resources.
