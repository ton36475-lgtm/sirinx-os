# A2A2A P076A OpenCode Review Task

Status: READY_FOR_OPENCODE_READ_ONLY_REVIEW

## Scope

Review the P076A active-focus commit-bundle manifest before any human local commit decision.

Active focus:

- sirinx.co
- AGM AutoFlow

Paused/out of scope:

- Kusala
- กุศลา
- Final Farewell
- Phitsanulok News
- Phitsanulok United News

## Inputs

- `.ghostclaw_runtime/a2a2a/evidence/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.json`
- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json`
- `reports/mission/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.md`
- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json`
- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json`
- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json`

## OpenCode Prompt

```text
Do a read-only OpenCode review of P076A.

Repository: /Users/sirinx/sirinx-os

Mission:
Review the P076A active-focus commit-bundle manifest before any local commit decision.

Rules:
- Do not modify source files.
- Do not stage, commit, push, deploy, install, or mutate cloud resources.
- Do not read or print secrets, .env values, private keys, tokens, browser cookies, or customer data.
- Do not call external providers or route repo/customer content outside the local machine.
- Prefer chat-only review. If a local review file is explicitly allowed, write only:
  .ghostclaw_runtime/a2a2a/reviews/A2A2A-P076A-OPENCODE-ACTIVE-FOCUS-COMMIT-BUNDLE-REVIEW-20260703.json

Read these files only:
- .ghostclaw_runtime/a2a2a/evidence/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.json
- .ghostclaw_runtime/a2a2a/evidence/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json
- reports/mission/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.md
- .ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json
- .ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json
- .ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json

Checks:
1. Confirm the manifest candidate files are scoped to sirinx.co and AGM AutoFlow only.
2. Confirm the manifest excludes Kusala, กุศลา, Final Farewell, Phitsanulok News, and Phitsanulok United News.
3. Confirm each candidate has relative_path, git_status, sha256, bytes, lane_or_scope, and review_required metadata.
4. Confirm no candidate is a real .env file, secret store, browser cookie store, customer-data dump, or external credential file.
5. Confirm guardrails report false for live Telegram send, provider call, repo/customer-data external routing, stage, commit, push, deploy, install, and Cloudflare/R2 mutation.
6. Confirm active-focus scoped git diff check passed.
7. Treat the full-repo README.md:3 trailing-whitespace diff-check failure as out of scope for this packet. Do not fix it.

Return one of:
- REVIEW_PASS_READY_FOR_HUMAN_LOCAL_COMMIT_DECISION
- REVIEW_BLOCKED_WITH_FINDINGS

Include evidence paths and concise findings.
```

## Local Bus Packet

Packet path:

`.ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P076A-OPENCODE-ACTIVE-FOCUS-COMMIT-BUNDLE-REVIEW-20260703.json`

Expected local bus behavior:

- Bus acknowledgement proves only that the local A2A2A file-bus saw the packet.
- It does not prove OpenCode executed the review or called a model.
- No provider call is required for this packet.
