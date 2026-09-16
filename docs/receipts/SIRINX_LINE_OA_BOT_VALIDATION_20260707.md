# SIRINX_LINE_OA_BOT_VALIDATION_20260707

Status: PASS_LOCAL_VALIDATION_WITH_FULL_WEBHOOK_STILL_BLOCKED
Mode: local-only validation, no live LINE send, no deploy, no push

## Scope

Code package:

- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/__init__.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/flex_templates.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/roi_calculator.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/intent_classifier.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/governance.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/sirinx/errors.py`
- `/Users/sirinx/.hermes/hermes-agent/plugins/platforms/line/adapter.py`
- `/Users/sirinx/.hermes/hermes-agent/tests/gateway/test_sirinx_line_bot.py`

A2A mission packets:

- `_A2A_QUEUE/inbox/packet_030_sirinx_line_webhook_flex.json`
- `_A2A_QUEUE/inbox/packet_031_sirinx_line_intent_classifier.json`
- `_A2A_QUEUE/inbox/packet_032_sirinx_line_integration_test.json`
- `_A2A_QUEUE/inbox/packet_033_sirinx_line_governance.json`

## Fixes Applied During Validation

1. `intent_classifier.py`
   - Fixed `_INTENT_PATTERNS` handling so 2-field pattern tuples without
     exclude lists do not crash classification.
   - Added deterministic keyword shortcuts for Thai/English core intents so
     high-priority text such as ROI, quote, handoff, BESS, EV, and AI EMS
     routes correctly before broad Solar Carport regex matches.

2. `adapter.py`
   - Fixed SIRINX bot interception to send LINE bot messages as one message
     array per reply/push call instead of reusing one reply token in a loop.

3. `tests/gateway/test_sirinx_line_bot.py`
   - Added isolated stdlib `unittest` coverage that validates the SIRINX LINE
     package without importing the full gateway dependency graph.

## Validation Commands

Run from `/Users/sirinx/.hermes/hermes-agent`:

```bash
python3 -m compileall plugins/platforms/line/sirinx plugins/platforms/line/adapter.py
python3 -m unittest tests.gateway.test_sirinx_line_bot
git diff --check -- plugins/platforms/line/adapter.py plugins/platforms/line/sirinx/intent_classifier.py tests/gateway/test_sirinx_line_bot.py
```

Result:

- `compileall`: PASS
- `unittest`: PASS, 8 tests
- scoped `git diff --check`: PASS

Run from `/Users/sirinx/sirinx-os`:

```bash
for f in packet_030_sirinx_line_webhook_flex.json packet_031_sirinx_line_intent_classifier.json packet_032_sirinx_line_integration_test.json packet_033_sirinx_line_governance.json; do
  python3 -m json.tool "_A2A_QUEUE/inbox/$f" >/dev/null
done
```

Result:

- all 4 mission packets parse as valid JSON

## Test Coverage Added

- intent classifier routes:
  - ROI
  - quote
  - Solar Carport
  - BESS
  - EV Charger
  - AI EMS
  - unknown text
- ROI state machine:
  - start flow
  - monthly bill input
  - area input
  - daytime-use input
  - electricity-rate input
  - completion result with non-guarantee disclaimer
  - invalid monthly bill handling
- governance:
  - claim denylist detects risky hard claims
  - auto-send gate is blocked by default
  - handoff writes receipt to a configured local temp receipt directory
- LINE Flex JSON shape:
  - welcome bubble
  - input request bubble
  - ROI result bubble
  - project carousel
  - quick reply action shape
- mock LINE message dry-run:
  - text event can be routed through `SirinxBot.process_message`
  - no live send occurs
- adapter source regression:
  - SIRINX bot messages are batched into one reply/push call
  - no `for m in bot_messages` reply-token reuse loop remains

## Known Limits

- Full aiohttp webhook server dry-run was not executed in this pass.
- Full `LineAdapter` runtime import was not executed because the active system
  Python lacks the Hermes gateway dependency set (`pyyaml` was missing during
  a direct import probe), and no install/remediation gate was opened.
- No real LINE API call, reply, push, broadcast, webhook activation, or live
  message send was performed.

## Blocked Actions Confirmed

- no production deploy
- no LINE live-send
- no LINE broadcast
- no webhook activation
- no provider/model API call
- no Cloudflare/DNS mutation
- no git push
- no sensitive environment value read/print

## Next Gate

Recommended next packet:

`P_LINE_OA_BOT_FULL_WEBHOOK_DRY_RUN_GATE`

Required before production:

- run full adapter/webhook dry-run in a Hermes environment with pinned
  dependencies available
- validate Flex payloads against LINE limits with the runtime adapter path
- verify receipt writing location and redaction policy
- run integration test with a mock `_LineClient`
- open a separate human gate before any live LINE send or webhook activation
