# VALIDATION_MATRIX

Date: 2026-06-28
Mode: local validation matrix
External writes: false

## Pocket Hatchery Validation

| Change type | Required checks |
| --- | --- |
| Pocket Hatchery schema/spec | `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_pocket_hatchery_v4` |
| Pause/unpause | `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_pause_unpause` |
| Public signer exposure | `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_public_signer_exposure` |
| Queue packet shape | `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_queue_packet_shape` |
| Risk classifier | `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_risk_classifier` |
| Config integrity | `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_config_integrity` |
| Full suite | `python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v` |
| Status report | `python3 WORKSPACE_SCAFFOLD/scripts/status_report.py --root .` |
| Queue router | `python3 WORKSPACE_SCAFFOLD/scripts/queue_router.py --root .` |

## Purpose

Use this matrix to pick the minimum correct validation set for each SIRINX OS task. Run broader checks when a change touches shared APIs, Command Center, policy gates, or public-safety boundaries.

## Matrix

| Change type | Required checks |
| --- | --- |
| Root operating docs | `pnpm project-os:check`, `pnpm verify`, `git diff --check` |
| Policy engine | `pnpm policy-core:test`, `pnpm policy-core:api-test`, `pnpm verify` |
| Hermes inbox | `pnpm hermes-inbox:test`, `pnpm verify`, API smoke |
| Approval evidence | `pnpm approval-evidence:test`, `pnpm approval-evidence:dry-run`, `pnpm verify` |
| Lead qualification/audit | `pnpm lead-event-audit:test`, `pnpm lead-crm-contract:test`, API smoke |
| Solar ops contract | `pnpm solar-ops-contract:test`, API smoke |
| Command Center UI | `pnpm dashboard:e2e`, mobile and desktop projects |
| Cloudflare main router | `pnpm cloudflare:main-router:check`, `pnpm cloudflare:main-router:test`, external approval before deploy |
| Public website | public repo build/test/PageSpeed only under exact public-site task |
| External connectors | `pnpm external-gates:check`, approval packet, dry-run where available |

## Final Local Pre-Commit Set

```bash
pnpm verify
pnpm dashboard:e2e
pnpm external-gates:check
python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v
python3 WORKSPACE_SCAFFOLD/scripts/status_report.py --root .
python3 WORKSPACE_SCAFFOLD/scripts/queue_router.py --root .
git diff --check
```

Use staged secret scan before every commit that touches code, docs, policy, tests, or API routes.
