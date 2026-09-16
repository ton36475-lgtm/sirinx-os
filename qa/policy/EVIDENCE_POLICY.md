# Evidence Policy

Every evidence item must include:

- Evidence ID
- Requirement or finding IDs
- Source path or command
- Observation time
- Observer identity
- Environment and build identity
- SHA-256 digest
- Redaction status
- Result state
- Limitations

Evidence must be append-only after receipt. Plans, dispatch intents, agent
summaries, screenshots without target identity, and stale historical reports
cannot independently prove current behavior.

Retention candidate: `90 days`.

Integrity requirements:

- SHA-256 required
- Artifact manifest required
- PII scan required
- Immutable after final receipt
- Receipt chain bound to packet, plan, scope, principal, lane, and prior hash
