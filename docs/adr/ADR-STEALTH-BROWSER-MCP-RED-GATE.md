# ADR: Stealth Browser MCP Red Gate

Status: `Accepted as Red-gated docs-only reference`
Date: `2026-07-01`

## Context

The referenced MCP advertises stealth browser and anti-bot bypass capabilities.
That creates legal, platform-policy, abuse, privacy, and account-risk concerns.

## Decision

GhostClaw may document and classify the tool, but must not install, run, or
route it to live browser tasks without a Red-gate authorization for an owned or
contractually authorized test target.

## Consequences

- No Cloudflare or CAPTCHA bypass execution.
- No third-party stealth browsing.
- No live credentials or customer data.
- Any future use must be an authorized browser QA packet with receipt evidence.
