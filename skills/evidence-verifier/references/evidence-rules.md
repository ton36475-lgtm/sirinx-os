# Evidence Sufficiency Rules

## Claim-to-Evidence Matrix

| Claim | Minimum sufficient evidence | Common insufficient evidence |
|---|---|---|
| Source change | Current diff/file plus relevant validation | Chat summary or intended patch |
| Unit behavior | Test demonstrably exercising named behavior, exact exit | Unrelated green suite |
| End-to-end behavior | Real entrypoint through required boundaries to observable result | Mock-only unit test |
| Job submitted | Durable board/queue record with task ID and timestamp | Sender chat claim |
| Job executed | Worker ownership/start plus terminal result/receipt tied to task ID | Submission receipt |
| Service healthy | Current process and endpoint response at actual bound address | Config or stale log |
| Integration live | End-to-end delivery/acknowledgment at current target | Adapter configured |
| Local proof | Current local test/smoke evidence | Generated report only |
| Preview deploy | Target-specific deployment/version plus preview verification | Git push or local build |
| Production deploy | Production version/route plus live verification and rollback ID | Preview success |
| Safety/no external action | Audit trail/config and bounded observation | “I did not do it” assertion |

## Evidence Qualities

Evidence should be current, direct, scoped, reproducible, integrity-bound, and
independent where risk warrants. Record observation time and revision/target.

## Verdict Rules

- `VERIFIED`: minimum evidence exists and directly matches claim scope.
- `FAILED`: authoritative current evidence contradicts the requirement.
- `BLOCKED`: a named prerequisite prevents the required check.
- `UNVERIFIED`: evidence is absent, stale, indirect, ambiguous, or too narrow.

Do not average required rows. Any required `FAILED`, `BLOCKED`, or `UNVERIFIED`
row prevents an overall verified-complete verdict.

## Gate Sufficiency

An executed `install`, `provider_call`, `live_send`, `push`, or `deploy` action
needs an unexpired gate whose task ID, action, target, scope, and exact operation
match the evidence. Secret reads are prohibited by this bundle and cannot be
made valid by a gate.
