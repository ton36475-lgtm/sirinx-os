# ADR: 9router Model Router Gateway Candidate

Status: `Accepted for policy registry only`
Date: `2026-07-01`

## Context

GhostClaw needs a model/provider routing research lane without accidentally
creating credential sprawl, ToS bypass, quota abuse, or unapproved paid calls.

## Decision

Register `decolua/9router` as a Model Router Gateway candidate under a
Yellow/Red gate. Use it for architecture and policy research only until
provider allowlists, model allowlists, cost ceilings, terms review, credential
isolation, and no-secret-logging controls exist.

## Consequences

- No runtime connection in this packet.
- No provider keys in repo.
- No public router exposure.
- No paid calls.
- Future runtime testing requires explicit gate and receipt.
