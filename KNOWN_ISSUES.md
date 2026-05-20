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
| GitHub push/PR for `sirinx-os` branch | blocked external write | Requires exact remote/owner/repo/branch/PR approval in `docs/knowledge/external-gates/evidence/sirinx-os-github-publish.md`; current `git remote -v` prints no configured remote. |

## Operational Notes

- `pnpm external-gates:check` currently reports hard failures `0`, with expected warnings for the manual gates above.
- `docs/knowledge/SIRINX_EXTERNAL_GATE_ACTION_PACKETS.md` is the current execution queue and supersedes the older 2026-05-19 public website release packets.
- Evidence working files exist under `docs/knowledge/external-gates/evidence/`; they are intentionally unchecked until real operator evidence is supplied.
- Command Center now surfaces evidence readiness from local files through `/api/external-gate-evidence`; this endpoint is read-only and reports `externalWrites=false`.
- Command Center now surfaces local runner readiness through `/api/external-gate-runner`; it lists local checks and blocked external actions, but always reports `canExecuteNow=false`.
- Command Center now surfaces the strict current backlog through `/api/pending-work`; it reports `hiddenBacklog=false`, orders the 5 remaining gates, and keeps `externalWrites=false`.
- Public website worktree is separate and protected.
- Command Center is local-only and dry-run by default.
- Cloudflare challenge-platform script injection is observed in live HTML, but current CSP blocks challenge-platform script execution.

## Not Bugs

- External write endpoints returning blocked/approval-required is intentional.
- Command Center avoiding production lead POST is intentional.
- Obsidian digest excludes raw chat logs and secrets by design.
