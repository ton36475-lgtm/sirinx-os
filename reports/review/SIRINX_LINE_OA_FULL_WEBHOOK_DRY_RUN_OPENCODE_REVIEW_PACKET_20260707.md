# SIRINX LINE OA Full Webhook Dry-Run OpenCode Review Packet

PACKET_ID: P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN
PARENT: P_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_GATE
STATUS: READY_FOR_REVIEW_ONLY
MODE: review_only_no_mutation
CREATED_AT: 2026-07-07 20:03:00 +0700

## Review Objective

Review the SIRINX LINE OA Bot local dry-run bundle after the full adapter/webhook
path passed in the Hermes venv. This review must verify that the implementation
is safe to discuss as the next pre-live LINE gate, not approve live webhook
activation or live sends.

## Code Scope

Hermes agent repo:

- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/adapter.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/__init__.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/flex_templates.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/roi_calculator.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/intent_classifier.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/governance.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/errors.py`
- `/Users/sirinx/.hermes/hermes-agent/tests/gateway/test_sirinx_line_bot.py`
- `/Users/sirinx/.hermes/hermes-agent/tests/gateway/test_sirinx_line_webhook_dry_run.py`

Evidence repo:

- `/Users/sirinx/sirinx-os/docs/receipts/SIRINX_LINE_OA_BOT_VALIDATION_20260707.md`
- `/Users/sirinx/sirinx-os/docs/receipts/SIRINX_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_20260707.md`

## Current Evidence

- Hermes venv: Python 3.11.15, PyYAML 6.0.3, aiohttp 3.14.1.
- `compileall` passed for LINE adapter, SIRINX bot package, and tests.
- `venv/bin/python -m unittest tests.gateway.test_sirinx_line_bot tests.gateway.test_sirinx_line_webhook_dry_run` passed 10 tests.
- Full dry-run used signed local loopback POST to `127.0.0.1:<ephemeral>/line/webhook`.
- Test fake LINE client observed one `reply` call and zero `push` calls.
- Scoped diff-check passed.
- Scoped secret-pattern scan found no OpenAI/OpenRouter-style keys, GitHub tokens, Slack tokens, AWS access keys, or private key blocks.

## Important Changes To Review

1. `LineAdapter.sirinx_bot` lazy-loads the SIRINX bot package through relative import, with fallback for isolated plugin loading.
2. The SIRINX bot intercepts known business intents before Hermes agent round-trip.
3. The adapter replies with one message batch, capped by `LINE_MAX_MESSAGES_PER_CALL`, and does not reuse the single-use LINE reply token in a loop.
4. `SIRINX_BOT_ENABLED` is disabled by default and must be explicitly set to `true` before the SIRINX bot intercepts messages.
5. Intent routing uses deterministic local rules and keyword shortcuts; it does not call an LLM/provider.
6. ROI, quote, project, handoff, and FAQ responses remain local Flex/text payload generation.

## Required Review Checks

OpenCode should verify:

1. No live LINE API call is made by the dry-run test.
2. No live send, broadcast, webhook activation, provider call, deploy, push, Cloudflare mutation, install, or secret read/print is introduced.
3. The fake client test covers the real adapter webhook path, signature verification, event dispatch, SIRINX bot interception, and reply-token consumption.
4. The SIRINX bot stays disabled by default unless `SIRINX_BOT_ENABLED=true`.
5. The adapter cannot silently reuse a LINE reply token across multiple reply calls.
6. The fallback import does not mask unrelated runtime errors as a pass.
7. Generated LINE Flex payloads keep the required LINE shape.
8. Governance checks still block risky claims and disabled auto-send by default.
9. Handoff receipt writing remains local and scoped to the configured test directory in tests.
10. The receipt evidence matches actual validation commands and current behavior.

## Forbidden During Review

- Edit files
- Stage or commit
- Push
- Deploy
- Activate LINE webhook
- Send LINE/Telegram/email/customer messages
- Run provider/model calls
- Read or print secrets
- Install dependencies
- Mutate Cloudflare/R2/D1/KV/DNS

## Expected Review Output

Return one of:

- `REVIEW_PASS_READY_FOR_LINE_OA_PRELIVE_APPROVAL_PACKET`
- `REVIEW_BLOCKED_WITH_FINDINGS`

If blocked, include:

- finding id
- severity
- file path
- exact line or behavior
- recommended scoped fix

## Next Gate If Review Passes

Prepare a separate human approval packet for pre-live LINE webhook activation
or staging-only webhook test. Do not activate or send live messages from this
review packet.
