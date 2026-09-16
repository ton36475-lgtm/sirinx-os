# Provider Policy

## Allowed

- Use official API keys.
- Use local models.
- Use OpenRouter models within stated limits.
- Use provider routing and fallback for reliability.
- Use budget gates for paid models.
- Use receipts for every model run that mutates repo files.

## Blocked

- Bypassing rate limits.
- Rotating accounts to avoid limits.
- Sharing credentials.
- Printing secrets.
- Hiding usage from provider/account owner.
- Proxy evasion.
- Using production customer data in prompts without approval.
- Sending private repo content to non-approved providers.

## Data Handling

Before sending code/context to a remote model:
1. Check the task tier.
2. Check provider approval.
3. Minimize files.
4. Remove secrets.
5. Prefer patches/diffs over full repo upload.
6. Log model, task ID, and prompt hash in receipt.
