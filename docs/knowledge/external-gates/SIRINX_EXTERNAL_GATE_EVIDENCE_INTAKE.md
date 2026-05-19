# SIRINX External Gate Evidence Intake

Status: active evidence intake for the four remaining external gates

## Purpose

This folder lets the team turn blocked external gates into verifiable local evidence without exposing secrets or performing external writes.

Rules:

- Do not paste raw secrets.
- Do not paste `.env` values.
- Do not paste customer passwords, SolisCloud secrets, Telegram bot tokens, LINE access tokens, or Cloudflare API tokens.
- Record only decisions, evidence labels, masked identifiers, approved storage paths, and verification results.
- The validator checks evidence completeness and blocks if secret-like values are present.

## Files

Templates live in:

- `docs/knowledge/external-gates/templates/`

Operator-filled evidence should be copied into:

- `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md`
- `docs/knowledge/external-gates/evidence/telegram-line-recipient-token.md`
- `docs/knowledge/external-gates/evidence/solis-readonly-telemetry.md`
- `docs/knowledge/external-gates/evidence/cloudflare-bot-management-review.md`

## Commands

```bash
cd /Users/sirinx/sirinx-os
pnpm external-gates:check
pnpm external-gates:evidence-check
pnpm external-gates:write
```

Expected behavior:

- Missing evidence is reported as blocked, not as a runtime failure.
- Secret-like content exits non-zero.
- No external writes are performed.

