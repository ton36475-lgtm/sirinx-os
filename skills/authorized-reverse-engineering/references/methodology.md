# Authorized Source-to-Handoff Methodology

This is a portable distillation of the tracked SIRINX artifacts under
`docs/reverse_engineering/` and
`docs/ghostclaw/GHOSTCLAW_SENIOR_FULLSTACK_REVERSE_ENGINEERING_OS_V1.md`.

## Canonical Flow

| Phase | Required result | Completion evidence |
|---|---|---|
| Source | Authorized, versioned source inventory | Rights basis, revision/date, integrity evidence |
| Verify | Claim-status ledger | Confirmed/inferred/contradicted/unknown classifications |
| Reverse Engineer | Component, flow, contract, state, job, storage, auth, failure maps | Source locations and observation method |
| Spec | Requirements, invariants, non-goals, acceptance criteria | Traceability from evidence to requirement |
| Architecture | Decision and alternatives | ADR with tradeoffs and validation |
| Knowledge Vault | Distilled, non-secret knowledge candidate | Source links and retention decision |
| Build Packet | Exact one-layer work packet | Allowed/forbidden files, owner, dependencies |
| Validate | Existing-tool checks | Exact commands, expected result, coverage statement |
| Receipt | Reproducible outcome | Evidence paths, hashes, exits, limitations |
| Handoff | One next owner/action | Status, gate, receipt, rollback idea |

## Minimum Reverse-Engineering Coverage

- components and ownership;
- control and data flows;
- API/event/file protocols and schemas;
- state machine and UI states;
- runtime jobs and scheduling;
- storage, retention, and consistency;
- authentication, authorization, tenancy, and trust boundaries;
- retries, timeouts, idempotency, duplicates, and failure recovery;
- observability, evidence, kill switch, and rollback;
- policy, licensing, privacy, and data-classification risks.

## Hard Stops

- ownership/authorization is missing;
- credentials, secret material, customer data, or protected access are required;
- method requires access-control or license circumvention;
- request materially enables stealth, exploitation, malware, or impersonation;
- source requires untrusted execution for basic inspection;
- analysis is being used as implied install, build, push, deploy, or live-send approval.
