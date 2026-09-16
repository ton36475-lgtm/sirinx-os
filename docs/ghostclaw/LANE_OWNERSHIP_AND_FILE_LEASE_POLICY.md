# Lane Ownership And File Lease Policy

Mission: `GC-PARALLEL-3LANE-BE-API-FE-20260630-001`

## Ownership

Hermes owns coordination files:

- `.ghostclaw_runtime/a2a2a/status/**`
- `.ghostclaw_runtime/a2a2a/queue/**`
- `.ghostclaw_runtime/a2a2a/locks/**`

Codex owns source work only after Hermes grants a lease:

- `src/server/**`, `server/**`, `backend/**`
- `src/db/**`, `db/**`, `schemas/**`, `types/**`
- `src/api/**`, `src/app/api/**`, `app/api/**`, `pages/api/**`
- `src/lib/api/**`, `src/hooks/**`, `src/store/**`, `src/state/**`
- `src/components/**`, `components/**`
- `src/app/**`, `app/**`, `src/pages/**`, `pages/**`
- `docs/**`

OpenCode owns only review files after an explicit Hermes unlock:

- `.ghostclaw_runtime/a2a2a/reviews/**`

Validator owns evidence and validation reports:

- `.ghostclaw_runtime/a2a2a/evidence/**`
- `.ghostclaw_runtime/a2a2a/receipts/**`
- `VALIDATION_REPORT_*.md`

## Lease Record

Every source mutation lease must include:

- `lease_id`
- `mission_id`
- `packet_id`
- `layer`
- `owner`
- `files`
- `page_lock` when applicable
- `created_at`
- `expires_at`
- `receipt_required`

The lease must be written under `.ghostclaw_runtime/a2a2a/locks/**` before the
source file is edited.

## Collision Rules

- Codex and OpenCode may never write the same file.
- Codex and Validator may never both mutate source files.
- Backend and frontend source may not be edited in the same packet.
- Two page files may not be edited in one packet.
- API contract changes must be frozen before frontend wiring begins.

## No-Overwrite Policy

Before editing:

1. read target file
2. inspect git diff for target file
3. acquire file lease
4. confirm layer lock
5. confirm page lock if page file

Write rules:

- patch minimal scope only
- do not replace an existing file wholesale unless creating a new file
- do not truncate existing files
- do not reformat unrelated sections
- preserve exports
- preserve architecture comments

Conflict behavior:

1. stop current file edit
2. create conflict receipt
3. release unsafe lease
4. requeue through Hermes

## Blocked Actions

- git push
- deploy
- cloud mutation
- EdgeOne live deploy
- Hostinger VPS mutation
- curl pipe bash
- install dependencies
- global install
- real API calls
- provider batch calls
- model download
- GPU-heavy job
- read or print secrets
- edit real `.env`
- delete files
- mutate two pages in one packet
- mutate backend and frontend in same packet
- OpenCode source mutation without Hermes lease
