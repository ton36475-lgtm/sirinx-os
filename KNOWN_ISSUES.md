# KNOWN_ISSUES

Date: 2026-05-20
Mode: current known issues

## Approval-Gated

| Issue | Status | Required next action |
| --- | --- | --- |
| Codex Mobile QR/MFA pairing | blocked manual | Pair Mac host and phone through official UI. |
| Telegram/LINE recipient/token setup | blocked credential/recipient | Rotate/store token safely, confirm allowed recipient, then run approved smoke send. |
| Solis API consent/credential/read-only telemetry | blocked consent/secret storage | Collect consent, store credentials safely, map station/site IDs. |
| Cloudflare Bot Management dashboard review | optional | Only needed if replacing CSP mitigation with dashboard rules. |
| GitHub push/PR for `sirinx-os` branch | blocked external write | Requires exact push/PR approval and target branch. |

## Operational Notes

- `pnpm external-gates:check` currently reports hard failures `0`, with expected warnings for the manual gates above.
- Public website worktree is separate and protected.
- Command Center is local-only and dry-run by default.
- Cloudflare challenge-platform script injection is observed in live HTML, but current CSP blocks challenge-platform script execution.

## Not Bugs

- External write endpoints returning blocked/approval-required is intentional.
- Command Center avoiding production lead POST is intentional.
- Obsidian digest excludes raw chat logs and secrets by design.
