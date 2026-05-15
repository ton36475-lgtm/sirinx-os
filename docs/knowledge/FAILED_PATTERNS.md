# Failed Patterns

Status: Level 2 documentation artifact
Date: 2026-05-16
Runtime impact: none

## FP-001: Running Feature Work Before Git Baseline

Failure:

- Existing untracked files hide the difference between old scaffold and new work.

Risk:

- Review quality drops.
- Generated files or local state can be staged accidentally.

Prevention:

- Establish baseline first.
- Never use broad `git add .` until classification is complete.

## FP-002: Tests Require Optional Services As Mandatory

Failure:

- E2E expected optional Hermes dashboard/gateway to be live during core dashboard verification.

Risk:

- Baseline fails even when core local stack is healthy.

Prevention:

- Test optional services as explicit online/offline states.
- Keep safe degraded mode visible.

## FP-003: UI Text Implies Risky Runtime Activity

Failure:

- Gateway helper copy could imply dispatcher activity while the gateway was stopped.

Risk:

- Operator misunderstands runtime state.

Prevention:

- State stopped/inactive conditions directly.

## FP-004: Mobile Grid Children Keep Min-Content Width

Failure:

- Brain panel content created horizontal overflow on mobile.

Risk:

- Mobile review becomes difficult.

Prevention:

- Set `min-width: 0` on responsive grid children.
- Add wrapping to long metadata fields.

## FP-005: Commercial Estimates Read Like Claims

Failure:

- ROI/payback/compliance language can sound definitive if not guarded.

Risk:

- Customer-facing materials overstate certainty.

Prevention:

- Use claim guard status, required verifications, and non-guarantee language.
