# Authorized Browser UAT Review Runbook

Applies to high-risk browser automation tools, including
`vibheksoni/stealth-browser-mcp`.

## Allowed Review

1. Confirm the target is owned or contractually authorized.
2. Record target allowlist and test objective.
3. Confirm no credentials, cookies, or customer data are included.
4. Run policy review before any tool execution.
5. Record a receipt for every approved run.

## Blocked

- Cloudflare or anti-bot bypass against third-party sites
- CAPTCHA evasion
- scraping non-public content
- credential abuse
- live execution without Red-gate approval

## Output

Use a report-only result unless an explicit Red gate exists.
