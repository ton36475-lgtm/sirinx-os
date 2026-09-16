# SIRINX LINE OA Full Webhook Dry-Run Review Result

PACKET_ID: P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN
PARENT: P_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_GATE
STATUS: REVIEW_PASS_READY_FOR_LINE_OA_PRELIVE_APPROVAL_PACKET
REVIEW_MODE: review_only_no_mutation
REVIEWED_AT: 2026-07-07 23:00:47 +0700

## Verdict

`REVIEW_PASS_READY_FOR_LINE_OA_PRELIVE_APPROVAL_PACKET`

No blocking findings were found in the scoped LINE OA bot dry-run bundle.
This review does not approve live LINE webhook activation, live-send, deploy,
push, provider calls, installs, secret access, or Cloudflare/DNS mutation.

## Scope Reviewed

Hermes agent repo:

- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/adapter.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/`
- `/Users/sirinx/.hermes/hermes-agent/tests/gateway/test_sirinx_line_bot.py`
- `/Users/sirinx/.hermes/hermes-agent/tests/gateway/test_sirinx_line_webhook_dry_run.py`

Evidence repo:

- `/Users/sirinx/sirinx-os/reports/review/SIRINX_LINE_OA_FULL_WEBHOOK_DRY_RUN_OPENCODE_REVIEW_PACKET_20260707.md`
- `/Users/sirinx/sirinx-os/docs/receipts/SIRINX_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_20260707.md`
- `/Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a/outbox/opencode/P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN_20260707.json`

## Required Checks

| Check | Status | Evidence |
|---|---|---|
| No live LINE API call in dry-run | PASS | Test patches `line._LineClient` to `FakeLineClient` and posts only to `127.0.0.1:<ephemeral>/line/webhook`. |
| No live send, broadcast, webhook activation, provider call, deploy, push, Cloudflare mutation, install, or secret read/print introduced | PASS | Scope only adds local bot package, adapter interception, tests, receipt, and review packets. No execution of blocked commands occurred. |
| Fake client covers real adapter webhook path | PASS | `test_signed_webhook_routes_to_sirinx_bot_with_mock_reply_only` starts `LineAdapter.connect()`, signs the webhook body, posts to the actual aiohttp route, and asserts HTTP 200. |
| Signature verification covered | PASS | Test generates `X-Line-Signature` via HMAC-SHA256 using synthetic local secret before posting. |
| Event dispatch and SIRINX interception covered | PASS | Test asserts fake client receives one `reply` from the SIRINX bot route for Solar/ROI/carport inquiry. |
| Reply token is not reused in a loop | PASS | Adapter batches `bot_messages[:LINE_MAX_MESSAGES_PER_CALL]` into one `reply` call; unit test asserts no `for m in bot_messages` remains in the interception block. |
| `SIRINX_BOT_ENABLED` disabled by default | PASS | Regression test verifies no env gate means `bot.enabled == False` and `process_message(...) is None`. |
| Flex payload shape covered | PASS | Unit tests assert generated welcome/input/ROI/project Flex payloads include `type`, `altText`, `contents`, and bubble/carousel shape. |
| Governance blocks risky claims and disabled auto-send by default | PASS | Unit tests verify risky claim detection and `LINE_AUTO_SEND_ENABLED=false` blocks auto-send. |
| Handoff receipt scoped in tests | PASS | Handoff test injects temporary `RiskGate(receipts_dir=tmp)` and verifies only a local temp receipt is written. |
| Receipt evidence matches current validation | PASS | Fresh validation passed 10 unit tests, compileall, scoped diff-check, JSON parse, and scoped secret-pattern scans. |

## Fresh Verification

Run from `/Users/sirinx/.hermes/hermes-agent`:

```bash
venv/bin/python -m compileall plugins/platforms/line/sirinx plugins/platforms/line/adapter.py tests/gateway/test_sirinx_line_bot.py tests/gateway/test_sirinx_line_webhook_dry_run.py
```

Result: PASS

```bash
venv/bin/python -m unittest tests.gateway.test_sirinx_line_bot tests.gateway.test_sirinx_line_webhook_dry_run
```

Result: PASS, 10 tests

```bash
git diff --check -- plugins/platforms/line/adapter.py plugins/platforms/line/sirinx/__init__.py plugins/platforms/line/sirinx/flex_templates.py plugins/platforms/line/sirinx/roi_calculator.py plugins/platforms/line/sirinx/intent_classifier.py plugins/platforms/line/sirinx/governance.py plugins/platforms/line/sirinx/errors.py tests/gateway/test_sirinx_line_bot.py tests/gateway/test_sirinx_line_webhook_dry_run.py
```

Result: PASS

Run from `/Users/sirinx/sirinx-os`:

```bash
python3 -m json.tool .ghostclaw_runtime/a2a2a/outbox/opencode/P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN_20260707.json >/dev/null
git diff --check -- docs/receipts/SIRINX_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_20260707.md reports/review/SIRINX_LINE_OA_FULL_WEBHOOK_DRY_RUN_OPENCODE_REVIEW_PACKET_20260707.md .ghostclaw_runtime/a2a2a/outbox/opencode/P_LINE_OA_BOT_OPENCODE_REVIEW_FULL_WEBHOOK_DRY_RUN_20260707.json
```

Result: PASS

Scoped secret-pattern scans:

- PASS: no OpenAI/OpenRouter-style keys, GitHub tokens, Slack tokens, AWS access keys, or private key blocks found in reviewed code/evidence scope.

## Non-Blocking Watchpoints For Next Gate

1. The base LINE adapter still starts a LINE loading indicator task for DM messages before SIRINX bot interception. In this dry-run it is handled by `FakeLineClient`, but any real webhook activation packet must explicitly classify loading indicators as live LINE API behavior.
2. `LineAdapter.sirinx_bot` fail-closes to the normal Hermes message path if the optional SIRINX package cannot initialize. The current dry-run test proves the package loads now, but the pre-live packet should keep this as an observability item.
3. Live LINE webhook activation and any real reply/push remain separate high-risk gates and are not authorized by this review.

## Blocked Actions Confirmed

Not performed:

- live LINE send
- LINE broadcast
- real LINE webhook activation
- Telegram/email/customer live send
- deploy
- Cloudflare/R2/D1/KV/DNS mutation
- git push
- git commit
- provider/model API call
- secret read/print
- package install

## Next Gate

`P_LINE_OA_BOT_PRELIVE_APPROVAL_PACKET`

The next packet should define exact pre-live scope before any real LINE webhook
activation, including whether loading indicators are allowed, what target chat
or channel is in scope, rollback/disable procedure, and receipt expectations.
