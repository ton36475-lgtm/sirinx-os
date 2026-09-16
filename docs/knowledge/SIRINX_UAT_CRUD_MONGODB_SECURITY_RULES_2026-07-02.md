# SIRINX UAT CRUD MongoDB Security Rules

Date: 2026-07-02
Repo: `/Users/sirinx/sirinx-os`
Mode: local-only security refactor. No deploy, push, provider call, package install, public tunnel, real `.env` read, MongoDB connection, database write, customer data, or production mutation.

## Task Card

Goal:
Create and harden the `skills/uat-crud-mongodb` skill directory and refactor the local coding engine so CRUD MongoDB UAT actions are security-classified before execution.

Constraints:
- Keep the lane local-only and dry-run by default.
- Do not read real `.env` files or secret values.
- Do not connect to MongoDB.
- Do not run create/read/update/delete against a database.
- Do not install packages, start public tunnels, call providers, or use customer data.
- Do not deploy or push.

File Scope:
- `skills/uat-crud-mongodb/`
- `services/dev-control-api/src/vibe-coding-agent.mjs`
- `services/dev-control-api/src/vibe-coding-agent.test.mjs`
- `packages/policy-core/src/index.mjs`
- `packages/policy-core/src/index.test.mjs`
- `_A2A_QUEUE/outbox/packet_030_sirinx_coding_engine_security_rules_refactor.json`
- `WORKSPACE_SCAFFOLD/tests/test_coding_engine_security_rules_refactor_packet.py`

Expected Result:
- The skill exists and reports dry-run discovery only.
- Policy core treats MongoDB CRUD UAT writes, dependency installs, public tunnels, real MCP execution, and remote mutation as gated or blocked action types.
- The vibe coding agent exposes coding-engine security rules from policy-core and a UAT CRUD MongoDB security profile.
- Real `.env`, customer data, and provider calls are blocked in the coding-engine evaluator.
- Object-shaped targets such as `{ path: ".env.production" }` are normalized and blocked even for read-only coding-engine actions.
- Schema-like MCP filesystem requests are mapped to local Codex filesystem work only; real MCP execution stays blocked.

Verification:
- `node --check` passed for all touched JS/MJS files.
- `./node_modules/.bin/vitest run packages/policy-core/src/index.test.mjs services/dev-control-api/src/vibe-coding-agent.test.mjs skills/uat-crud-mongodb/run.test.mjs`
  - Result: passed, 3 files / 20 tests.
- `node skills/uat-crud-mongodb/run.mjs --project . --json`
  - Result: dry-run report produced; `realEnvInspected=false`; MongoDB write, dependency install, and public tunnel decisions are `approval_required`.
- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_coding_engine_security_rules_refactor_packet -v`
  - Result: packet guardrail tests pass for review-only Hermes handoff.

Report Format:
- Summary
- Files changed
- Tests
- Risks
- Next task

## Security Rules Added

- `no-secret-env-read`: real `.env` and secret values are blocked, including object-shaped action targets.
- `mongodb-crud-write-gate`: MongoDB CRUD verifier writes require exact approval and synthetic data.
- `no-production-customer-data`: production data, customer data, and PII are blocked.
- `no-implicit-runtime-start`: app/browser/Stagehand/Playwright execution requires a separate exact gate.
- `no-implicit-install-or-tunnel`: dependency installs and public tunnels require separate exact gates.
- `mcp-filesystem-local-only`: schema-like MCP filesystem requests are mapped to local Codex work only; real MCP execution or remote mutation is blocked.

## Approval Gates Still Closed

- `APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>`
- `APPROVE_DEPENDENCY_INSTALL_<package-or-scope>_<date>`
- `APPROVE_LOCAL_BROWSER_UAT_<target>_<date>`
- `APPROVE_PUBLIC_TUNNEL_<tool>_<date>`
- `APPROVE_CUSTOMER_DATA_UAT_<scope>_<date>`

## Next Safe Action

Review the dry-run discovery report and choose one exact future gate only if MongoDB CRUD UAT execution is needed. Until then, the skill remains discovery/report-only.
