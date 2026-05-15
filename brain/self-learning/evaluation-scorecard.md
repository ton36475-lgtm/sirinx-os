# Evaluation Scorecard

Status: Level 2 memory candidate
Runtime impact: none

## Scoring Scale

- 5: strong, verified, reusable
- 4: good, minor warning remains
- 3: usable, needs follow-up
- 2: risky, do not reuse without review
- 1: failed, needs redesign

## Current Scores

| Pattern | Score | Reuse Decision |
| --- | --- | --- |
| Read protocol first | 5 | Reuse |
| Baseline before feature work | 5 | Reuse |
| Safe degraded dashboard mode | 4 | Reuse with optional-service tests |
| Kill switch before adapter | 5 | Reuse |
| Approval queue before customer action | 5 | Reuse |
| Solar claim guard | 5 | Reuse |
| Connector read-only default | 5 | Reuse |
| Broad generated-file handling | 4 | Reuse with explicit ignore review |

## Required Evidence For Future Scores

- Changed files.
- Commands run.
- Test output summary.
- Secret scan result.
- Runtime/config impact.
- External action status.
- Remaining risk.

## Do Not Store

- Raw chat logs.
- `.env` values.
- Credentials, tokens, private keys, cookies, or passwords.
- Customer private data.
- Unsanitized screenshots or logs.
