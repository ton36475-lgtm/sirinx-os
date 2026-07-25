# Stealth Browser MCP Security Assessment

Tool: `vibheksoni/stealth-browser-mcp`
Lane: `AUTHORIZED_BROWSER_QA`
Default Gate: `RED`
Execution Default: `disabled`

## Source Snapshot

The upstream repository describes a browser MCP focused on stealth/anti-detect
automation and includes claims about bypassing anti-bot systems. This makes it a
high-risk external tool for GhostClaw.

## Allowed GhostClaw Use

- document capability and risk
- create defensive browser QA policy
- design local-only test harness requirements
- create authorized-testing checklist
- review whether a future use case is lawful and owned

## Blocked Use

- bypassing Cloudflare or other anti-bot systems
- CAPTCHA evasion
- stealth browsing against third-party sites
- credential stuffing, scraping, or account abuse
- running the MCP server without a Red-gate approval
- connecting it to live customer workflows

## Required Controls Before Any Future Execution

- written authorization for the target property
- target allowlist owned by the operator or client
- no customer or credential data in prompts
- local-only dry-run first
- no anti-bot bypass against third-party services
- full receipt and audit trail

## Verdict

Register as Red-gated security-sensitive tooling. Keep docs-only until an
authorized browser QA use case is explicitly approved.
