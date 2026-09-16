# A2A2A Active Focus Commit Bundle Manifest - 2026-07-03

## Status

PASS_COMMIT_BUNDLE_MANIFEST_READY

## Purpose

Local-safe path and hash inventory for the explicit-path commit gate. This packet does not stage, commit, push, deploy, send Telegram, call providers, or mutate Cloudflare/R2.

## Scope

- Active: sirinx.co, AGM AutoFlow
- Paused / out-of-focus: Kusala, กุศลา, Final Farewell, Phitsanulok News, Phitsanulok United News

## Bundle Summary

| Metric | Value |
|---|---:|
| Candidate pathspecs | 65 |
| Changed files | 130 |
| Deleted files | 0 |
| Total bytes hashed | 9794731 |
| Failures | 0 |

## Artifacts

- Evidence: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json`
- JSON manifest alias: `.ghostclaw_runtime/a2a2a/evidence/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json`
- Home receipt: `~/.ghostclaw/receipts/p076a_active_focus_commit_bundle_manifest_20260703.json`
- Source manifest: `reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json`
- Source final review: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json`

## Guardrails

- live_send: false
- provider_call: false
- external_message_send: false
- payload_executed: false
- stage: false
- commit: false
- push: false
- deploy: false
- cloudflare_r2_mutation: false
- secret_read: false
- install: false

## Verification

- pnpm_active_focus_final_local_review: passed
- pnpm_active_focus_final_local_review_test: passed
- secret_scan: passed_no_findings
- active_focus_git_diff_check: passed_scoped_active_focus
- full_repo_git_diff_check: full_repo_git_diff_check_not_rerun_for_P076B; scoped_candidate_diff_check_passed_after_whitespace_cleanup
- receipts_parsed: P075, P057, P058

## Failures

- None

## Next Safe Action

Route this manifest to OpenCode review-only, then wait for P076B human local commit decision.

## P076B Gate

- P076B_HUMAN_LOCAL_COMMIT_DECISION: WAITING_AFTER_P076A
- Human reviews manifest before choosing local commit or defer.
