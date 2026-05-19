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

Operator-filled evidence now lives in these working files:

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

- Missing evidence or incomplete evidence is reported as blocked, not as a runtime failure.
- Secret-like content exits non-zero.
- No external writes are performed.

Current operator flow:

1. Fill only non-secret evidence labels in the matching working file.
2. Check only items that are actually complete.
3. Run `pnpm external-gates:evidence-check`.
4. Continue to the related external gate only when that gate reports `ready-for-human-review`.
