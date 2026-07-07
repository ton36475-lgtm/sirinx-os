# Defensive OSINT Report-Only Runbook

Applies to: `apurvsinghgautam/robin`

## Purpose

Use Robin only as a report and policy reference until lawful authorization,
scope, analyst approval, redaction, and retention controls exist.

## Allowed Steps

1. Create a synthetic case template.
2. Define required authorization fields.
3. Define redacted finding structure.
4. Map findings to a threat-intel dashboard schema.
5. Record analyst review receipt.

## Blocked Steps

- Tor or dark-web execution
- crawling or scraping non-public content
- credential collection
- leaked data handling
- de-anonymization
- storing raw sensitive content in memory
- sharing sensitive investigation queries with external LLMs

## Exit Criteria

Execution remains disabled. Report-only artifacts are acceptable when they are
redacted, synthetic, or public-source safe.
