# GhostClaw Migration Core

Local-safe Rust core for P085: command parsing, policy gating, route intent, redaction, and append-only receipts.

This crate is intentionally isolated from live Telegram, Codex execution, provider calls, Git push, deploy, and Cloudflare/R2 mutation.

## Validate

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

## Smoke

```bash
cargo run -- '/status'
cargo run -- '/route backend_core scan repository safely'
cargo run -- '/route backend_core git push origin main'
```
