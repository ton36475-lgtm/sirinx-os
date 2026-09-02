# Security Incident — Provider API Credential Exposed in Chat (2026-09-02)

**Incident ID:** `SEC-PROVIDER-KEY-EXPOSED-20260902-02`  
**State:** `ROTATION_REQUIRED / PROVIDER_ACTIVATION_BLOCKED`

**Scope correction:** this record supersedes the provider-name assumption in `docs/SECURITY_INCIDENT_TOKENROUTER_KEY_20260902.md`; a credential prefix alone does not prove whether the issuer is TokenRouter or B.AI. Both integrations remain blocked until the owner identifies the issuer in the account console.

A credential-shaped provider API value was included in an operator message. The
literal value and all partial fingerprints are intentionally excluded from this
repository, commits, receipts, prompts, logs, and screenshots.

The issuing service cannot be proven from the prefix alone. Until the owner
identifies and revokes the credential, both TokenRouter and B.AI integrations
remain blocked.

## Required owner actions

1. Identify the issuer from the account consoles without pasting the credential
   into chat, tickets, source code, or screenshots.
2. Revoke or delete the exposed credential.
3. Inspect account usage, model calls, IP/device records, credits, and billing
   since the credential was created.
4. Create a replacement key with a unique environment name, the lowest workable
   budget/quota, and the minimum required permissions.
5. Store the replacement only in the approved secret facility.
6. Prove the old credential is rejected with a negative authentication test.
7. Run one public, synthetic, zero-outer-retry canary using an action-bound
   approval.
8. Persist only status, latency, model/provider identity, token counts, cost, and
   a response digest. Discard provider error bodies and generated content.

## Blocks

- TokenRouter enrollment and canary
- B.AI enrollment and canary
- DSH/jcode/AutoClaw/OpenClaw provider profile generation
- provider-backed MCP or A2A execution
- any claim that the free model pool is available

## Non-events

This incident record does not prove compromise. No provider request was made by
this change, no credential was read from a secret store, and no literal secret
was committed.
