# Safety and External-Write Policy

## Default

`deny_by_default: true`

Production and customer-facing systems are read-only unless an exact,
digest-bound, one-use approval authorizes one bounded action.

## Always Blocked In AUDIT_ONLY

- Source or production configuration mutation
- Build or test execution
- Browser or service startup
- Provider/model calls
- MCP activation or remote connection
- Form, LINE, Telegram, email, analytics, CRM, or accounting writes
- Git stage, commit, push, merge, publish, or deploy
- Secret, token, cookie, private key, `.env`, or credential-store reads
- DNS, Cloudflare, database, queue, or object-storage mutation

## Test Data

- Classification: `SYNTHETIC_ONLY`
- PII allowed: `false`
- Real recipients: `none`
- Screenshot and log redaction: `required`
- Default retention: `14 days`

## Future Safe Execution Adapter

When separately approved, form and API tests must use one of:

- `INTERCEPT`
- `MOCK`
- `SANDBOX`

Real submission and real recipients remain denied.

## Network Guard Contract

An execution packet must bind an enforceable network guard. Prompt text alone
is insufficient. Until a guard is verified, mutating methods and production
hosts remain blocked.

## Local Artifact Writes

Local report, trace, screenshot, video, baseline, PID, log, and test-result
writes are mutations even when a tool calls its mode read-only. A future test
packet must list exact output paths, retention, cleanup, and ownership before
the command is authorized. Local artifact permission never implies permission
for source, baseline, external, or production mutation.
