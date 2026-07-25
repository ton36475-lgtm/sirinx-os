# Domain Schema Plan - Master Build Path

Mission: `GC-SF-RE-OS-V1-20260701-001`

## Status

Planning draft only. No migration, schema write, database connection, or cloud
mutation is approved by this packet.

## Domain Schema Rules

- Define domain entities before service logic.
- Separate canonical domain types from API request/response DTOs.
- Keep auth/RBAC boundaries explicit before sensitive data storage.
- Use local fixtures or dry-run data until a migration gate exists.
- Do not touch production databases.

## Candidate Domains Observed In Repo Shape

- command center / developer dashboard
- Hermes inbox and approval gates
- agent/worker registry
- policy core and validation receipts
- content/automation lanes
- public site/lead or CRM-adjacent flows

## Next Step

`P000B_SOURCE_VERIFICATION` should choose one build target and produce a domain
schema proposal before `P004_BUILD_PACKET_BACKEND_CORE`.
