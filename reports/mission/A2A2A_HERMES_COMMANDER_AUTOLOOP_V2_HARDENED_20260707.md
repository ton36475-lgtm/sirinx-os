# Hermes Commander Autoloop V2 Hardened - 2026-07-07

Status: `LOCAL_SAFE_IMPLEMENTATION_READY_FOR_REVIEW`

Source objective:

`/Users/sirinx/.codex/attachments/efcb3515-4bc8-4df2-ad50-70fafa5112a4/goal-objective.md`

## Scope Implemented

This packet adds the local-safe foundation for `GHOSTCLAW Hermes Commander Autoloop V2 Hardened`.

Implemented:

- Central fail-closed middleware deny-list.
- Middleware boot self-test.
- SQLite governance schema and idempotent migration.
- File lease grant/release/sweep with active overlap guard.
- Hash-chained evidence receipts.
- Token/cost pre-dispatch guard.
- Local notification queue and digest helper with no live Telegram send.
- Heartbeat/stall detection that pauses specs for human review and releases leases.
- A2A envelope/task insertion and dry-run supervised dispatch boundary.
- Commander tick skeleton for safe state routing.
- Telegram gate callback state mutation for file lease and human-decision gates.
- Static gate policy and P081/P087B/P091S spec files.
- Local governance DB backup script.
- Focused unittest coverage for policy, lease conflicts, evidence chain, and stall detection.

## Files Created

```text
hermes/autoloop/__init__.py
hermes/autoloop/commander.py
hermes/autoloop/cost_guard.py
hermes/autoloop/dispatch.py
hermes/autoloop/evidence_chain.py
hermes/autoloop/heartbeat.py
hermes/autoloop/leases.py
hermes/autoloop/middleware.py
hermes/autoloop/middleware_selftest.py
hermes/autoloop/notifications.py
hermes/autoloop/telegram_callbacks.py
hermes/db/schema_v2.sql
hermes/db/migrations/20260707_autoloop_v2.sql
hermes/policies/GATE_POLICY.yaml
hermes/scripts/backup_governance_db.sh
hermes/specs/P081_RUST_MIGRATION.yaml
hermes/specs/P087B_AUTO_VISUAL_BOT_CHECK.yaml
hermes/specs/P091S_G_MONITORING.yaml
hermes/tests/test_evidence_chain.py
hermes/tests/test_lease_conflicts.py
hermes/tests/test_middleware_policy.py
hermes/tests/test_stall_detection.py
reports/mission/A2A2A_HERMES_COMMANDER_AUTOLOOP_V2_HARDENED_20260707.md
```

## Validation

Commands run:

```bash
python3 -m unittest discover -s hermes/tests -p 'test_*.py'
python3 -m py_compile hermes/autoloop/*.py
python3 - <<'PY'
import sqlite3
from pathlib import Path
for path in [Path('hermes/db/schema_v2.sql'), Path('hermes/db/migrations/20260707_autoloop_v2.sql')]:
    conn = sqlite3.connect(':memory:')
    conn.executescript(path.read_text())
    tables = conn.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
    print(f'{path}: ok tables={tables}')
PY
git diff --check -- hermes/autoloop hermes/db hermes/policies hermes/scripts hermes/specs hermes/tests
```

Results:

```text
unittest: 13 tests passed
py_compile: passed
schema_v2.sql: ok tables=13
20260707_autoloop_v2.sql: ok tables=13
scoped git diff --check: passed
```

## Safety Boundary Confirmed

Not performed:

- No git push.
- No deploy.
- No DNS mutation.
- No Cloudflare/R2/D1/KV mutation.
- No webhook activation.
- No CRM/customer storage write.
- No live Telegram/LINE/email/customer send.
- No provider/model call.
- No secret read or print.
- No governance DB restore.
- No runtime subprocess execution from the new dispatch layer.

## Review Notes

The implementation intentionally keeps child-process execution disabled by default. `dispatch_supervised_child(..., start_process=False)` records a supervised run boundary and task dispatch preview, but it does not launch Codex/OpenCode or any live adapter.

The migration is a full SQL copy of `schema_v2.sql` so programmatic migration runners can execute it directly with `sqlite3.Connection.executescript`.

## Next Safe Gate

Recommended next gate:

`P_AUTOLOOP_V2_OPENCODE_REVIEW_ONLY`

Review should verify:

- Deny-list is central and code-enforced.
- Unknown actions fail closed.
- Writes require active non-overlapping leases.
- Evidence tampering is detected.
- Stalled tasks pause to human review.
- Commander loop does not push, deploy, live-send, call providers, or read secrets.
- P081/P087B/P091S spec mappings remain local-safe and gate-aware.

