# MaxPlus OpenCode URL Intake - 2026-06-30

## Source

- User supplied URL: `https://maxplus-ai.cc/getterstart/opencode`
- Intake mode: `read_only_quarantine`
- Checked at: `2026-06-30T13:13:14+07:00`

## Observed Evidence

- `curl -I -L --proto '=https' https://maxplus-ai.cc/getterstart/opencode` returned `HTTP/2 200`.
- The page is a Next.js app behind Cloudflare.
- The unauthenticated page redirects to `/login` with `NEXT_REDIRECT;replace;/login;307`.
- Metadata identifies the site as `MaxPlus AI`.
- Metadata describes it as an API proxy/pay-as-you-go service for Claude Code and Codex, with PromptPay/TrueMoney top-up.
- The static HTML includes a UI label for `คำสั่งติดตั้งด่วน`, but the actual authenticated setup instructions were not visible in the unauthenticated read.
- User-provided screenshot and Chrome read-only inspection confirmed the logged-in setup page includes OpenCode custom provider configuration guidance.
- Visible config signals:
  - global config path: `~/.config/opencode/opencode.json`
  - provider name: `maxplus`
  - provider npm package: `@ai-sdk/anthropic`
  - base URL: `https://api.maxplus-ai.cc/v1`
  - API key reference: `{env:MAXPLUS_API_KEY}`
  - model example: `maxplus/claude-opus-4-8`
- Chrome read-only inspection found sensitive account/key surfaces. Key previews, account email, credit balance, and any full key surfaces were intentionally not copied into this repo.
- Operator later supplied install recommendations:
  - `npm install -g opencode-ai`
  - `curl -fsSL https://opencode.ai/install | bash`
  - `opencode --version`
- Read-only local verification found an existing `opencode` binary at `/Users/sirinx/.local/bin/opencode`.
- `opencode --version` returned `1.17.11`.
- No install command was executed.
- No login was attempted.
- No token, key, `.env`, or account data was read or submitted.

## Risk Classification

Status: `untrusted_until_authenticated_review_and_owner_gate`

Risk reasons:

- The page requires login before the real setup instructions can be verified.
- It appears to involve API proxy/provider routing and payment/top-up flows.
- The logged-in page references API key creation/selection and one-command installer behavior.
- The objective hard-blocks paid provider/model live calls, API key reads, secret reads, global installs, curl-pipe-bash, and unknown external install execution.
- The proposed `npm install -g opencode-ai` is a global install and remains blocked in this lane.
- The proposed `curl -fsSL https://opencode.ai/install | bash` is a curl-pipe-bash installer and remains blocked in this lane.
- Any OpenCode/provider setup must be reviewed as a configuration proposal first, not run directly.

## Allowed Next Step

- Create a redacted setup review packet after the operator supplies the visible instructions or screenshots from the logged-in page.
- Compare proposed commands against official OpenCode documentation before execution.
- Keep provider calls disabled and store any future keys only in approved environment files after explicit owner gate.

## Blocked Actions

- Do not run quick install commands from this page.
- Do not pipe remote scripts into shell.
- Do not use the one-command installer until it is copied as text, reviewed, and separately approved.
- Do not run `npm install -g opencode-ai` without an explicit install gate.
- Do not run `curl -fsSL https://opencode.ai/install | bash` without an explicit install gate.
- Do not create or paste API keys.
- Do not write `MAXPLUS_API_KEY` to shell profiles or `.env` during this local-safe lane.
- Do not connect MaxPlus, OpenCode, Codex, Claude Code, or provider accounts automatically.
- Do not install packages globally.
- Do not enable paid model/provider calls.
- Do not push, deploy, broadcast, or mutate external services.

## Reference Baseline

Official OpenCode sources should be used as the comparison baseline before any setup:

- `https://opencode.ai/`
- `https://github.com/anomalyco/opencode`

The official OpenCode install paths are still gated in this repo because installation and provider configuration are outside the current local-safe scope.
