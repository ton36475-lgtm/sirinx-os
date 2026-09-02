# Security incident — exposed TokenRouter-compatible API key

Incident ID: `SEC-TOKENROUTER-KEY-EXPOSED-20260902`  
State: `ROTATION_REQUIRED / PROVIDER_CALLS_BLOCKED`

## Observed

A credential-like value was included in operator chat together with the TokenRouter API endpoint. The value is intentionally omitted from this repository, logs, receipts, examples, comments, and tests.

## Required owner action

1. Revoke the exposed key at the issuing service.
2. Review usage, model calls, cost, IP/device, team-member, and audit metadata from the exposure time onward.
3. Create a new key with an environment-specific name, low spend/rate ceiling, and the minimum available scope.
4. Store it in the approved secret facility under `TOKENROUTER_API_KEY_ROTATED`.
5. Verify that the old key is rejected without printing either credential.
6. Run one public-data, one-use, digest-bound canary.
7. Rotate again if any unauthorized usage is observed.

## Blocks

Until a secret-free rotation receipt exists:

- TokenRouter model discovery is blocked.
- Free and paid TokenRouter calls are blocked.
- TokenRouter cannot be selected by LiteLLM, OmniRoute, OpenRouter, 9Router, DSH, jcode, AutoClaw, OpenClaude, Codex, or Hermes.
- The credential cannot be copied into `.env`, JSON, YAML, PowerShell history, shell history, screenshots, issue comments, or chat.
- Broad approval text does not waive the incident.

## Receipt fields

```text
incident_id
issuer
old_key_identifier_hash
revoked_at
usage_review_window
unauthorized_usage_detected
new_key_identifier_hash
scope_summary
spend_limit_summary
secret_store_reference
negative_auth_test
operator
checker
```

Only hashes, identifiers, and policy metadata belong in the receipt.
