# SIRINX LINE OA Bot Full Webhook Dry-Run Receipt

PACKET_ID: P_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_GATE
STATUS: PASS_LOCAL_WEBHOOK_DRY_RUN_READY_FOR_REVIEW
RUN_AT: 2026-07-07 20:02:00 +0700
MODE: local_loopback_mock_only

## Scope

Code root:

- `/Users/sirinx/.hermes/hermes-agent`

Receipt root:

- `/Users/sirinx/sirinx-os/docs/receipts`

Validated files:

- `plugins/platforms/line/adapter.py`
- `plugins/platforms/line/sirinx/__init__.py`
- `plugins/platforms/line/sirinx/flex_templates.py`
- `plugins/platforms/line/sirinx/roi_calculator.py`
- `plugins/platforms/line/sirinx/intent_classifier.py`
- `plugins/platforms/line/sirinx/governance.py`
- `plugins/platforms/line/sirinx/errors.py`
- `tests/gateway/test_sirinx_line_bot.py`
- `tests/gateway/test_sirinx_line_webhook_dry_run.py`

## Runtime Proof

Hermes venv used:

- `/Users/sirinx/.hermes/hermes-agent/venv`

Dependency proof:

- Python: 3.11.15
- PyYAML: 6.0.3
- aiohttp: 3.14.1

Observed warning:

- `HERMES_HOME` fallback warning appeared during `gateway.config` import.
- No live LINE, deploy, push, provider, or secret operation was performed.

## Dry-Run Proof

The full adapter/webhook dry-run used a signed LINE-compatible webhook POST to a local loopback server:

- Target: `127.0.0.1:<ephemeral>/line/webhook`
- Signature: HMAC-SHA256 generated from synthetic local channel secret
- Event type: `message`
- Message text: Solar/ROI/carport inquiry
- LINE client: in-memory fake client
- Result: HTTP 200 `ok`
- Reply behavior: one fake `reply` call recorded
- Push behavior: zero fake `push` calls recorded
- Live LINE API calls: none

The test also validates that the adapter routes through the SIRINX bot interception path and returns a LINE Flex message without falling back to Hermes agent round-trip for the covered business intent.

## Fixes Confirmed

1. The LINE adapter now imports the SIRINX bot when loaded through the isolated plugin test loader.
2. The SIRINX bot webhook path uses one reply call with up to 5 messages instead of reusing the single-use LINE reply token in a loop.
3. Intent routing handles the Thai/English ROI, quote, handoff, BESS, EV, AI EMS, and Solar Carport keyword shortcuts before regex fallback.
4. `SIRINX_BOT_ENABLED` is disabled by default; the SIRINX bot only intercepts and replies when the environment gate is explicitly set to true.

## Validation Commands

Run from `/Users/sirinx/.hermes/hermes-agent`:

```bash
venv/bin/python -m compileall plugins/platforms/line/sirinx plugins/platforms/line/adapter.py tests/gateway/test_sirinx_line_bot.py tests/gateway/test_sirinx_line_webhook_dry_run.py
```

Result:

- PASS

```bash
venv/bin/python -m unittest tests.gateway.test_sirinx_line_bot tests.gateway.test_sirinx_line_webhook_dry_run
```

Result:

- PASS: 10 tests

```bash
git diff --check -- plugins/platforms/line/adapter.py plugins/platforms/line/sirinx/intent_classifier.py tests/gateway/test_sirinx_line_bot.py tests/gateway/test_sirinx_line_webhook_dry_run.py
```

Result:

- PASS

Scoped secret-pattern scan:

- PASS: no matches for OpenAI/OpenRouter-style keys, GitHub tokens, Slack tokens, AWS access keys, or private key blocks in the validated scope.

## Blocked Actions Confirmed

Not performed:

- live LINE send
- LINE broadcast
- real LINE webhook activation
- Telegram/LINE/email/customer live send
- deploy
- Cloudflare/R2/D1/KV/DNS mutation
- git push
- provider/model API call
- secret read/print
- package install

## Next Safe Gate

Recommended next gate:

- `P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN`

Review packet prepared:

- `/Users/sirinx/sirinx-os/reports/review/SIRINX_LINE_OA_FULL_WEBHOOK_DRY_RUN_OPENCODE_REVIEW_PACKET_20260707.md`
- `/Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a/outbox/opencode/P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN_20260707.json`

Still requires separate human approval before:

- live LINE webhook activation
- production deploy
- live send or broadcast
- customer-data storage
- Cloudflare/DNS mutation
