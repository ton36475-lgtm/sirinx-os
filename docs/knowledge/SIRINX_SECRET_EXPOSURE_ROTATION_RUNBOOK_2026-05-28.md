# SIRINX Secret Exposure Rotation Runbook - 2026-05-28

Generated: 2026-05-28 02:38 +0700
Status: human-action-required

## Incident

Raw provider tokens were pasted into chat. Their values are intentionally omitted from this repository and from all reports.

Treat every exposed token as compromised.

## Affected Provider Classes

- xAI token
- OpenAI project/API token
- Anthropic API token
- Cloudflare token
- Hugging Face token
- GitHub personal access token
- Other provider-style tokens in the same message

## Immediate Human Actions

1. Revoke each exposed token in the provider dashboard.
2. Create new least-privilege replacements only if the integration is still needed.
3. Store replacements only in local ignored secret storage, not chat or docs.
4. Confirm token ownership and scopes in non-secret evidence files only.
5. Re-run local secret scans before any implementation or push.

## Local Storage Contract

Allowed local paths after rotation:

- `.hermes/secrets/*.env`
- provider-native secure storage
- system keychain or equivalent local secret store

Forbidden:

- chat
- screenshots
- Obsidian notes
- committed docs
- `.env.example`
- GitHub issues, PRs, comments, or commits
- Telegram/LINE messages

## Rotation Evidence Template

Use only non-secret facts:

```text
Provider:
Old token revoked: yes/no
New token created: yes/no/not needed
Scope:
Storage path:
Owner:
Rotation timestamp:
Smoke test approved: yes/no
```

Do not include token values.

## Re-enable Conditions

No provider lane may be used until:

1. Token is revoked and replaced or explicitly decommissioned.
2. Non-secret scope evidence is recorded.
3. Secret scan passes.
4. Exact gate-specific approval exists.

## Current Local Check

`pnpm audit:secrets` was run after the exposure and passed with no findings in the configured scanned roots. This does not prove provider dashboards are safe; it only proves the configured local repo scan did not find stored secrets.

