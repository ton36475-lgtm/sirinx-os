"""Hermes Commander Autoloop V2 local-safe state machine."""

from __future__ import annotations

import json
import sqlite3
from typing import Any

from .cost_guard import check_budget_before_dispatch
from .dispatch import build_a2a_envelope, dispatch_supervised_child, insert_task
from .evidence_chain import verify_evidence_chain, write_evidence
from .heartbeat import sweep_stalled_tasks
from .leases import active_lease_for_spec, sweep_expired_leases
from .middleware import GateRequired, PolicyError, assert_allowed
from .middleware_selftest import run_middleware_self_tests
from .notifications import enqueue_notification, flush_notification_digest


AUTO_STATES = {
    "SPEC_INTAKE",
    "CONTRACT_EXTRACT",
    "STRATEGY_DESIGN",
    "IMPLEMENT",
    "VALIDATE",
    "REVIEW",
    "COMMIT_LOCAL",
}

ROUTING = {
    "SPEC_INTAKE": "opencode",
    "CONTRACT_EXTRACT": "opencode",
    "STRATEGY_DESIGN": "codex",
    "IMPLEMENT": "codex",
    "VALIDATE": "opencode",
    "REVIEW": "opencode",
    "COMMIT_LOCAL": "codex",
}

STATE_ACTION = {
    "SPEC_INTAKE": "read_repo",
    "CONTRACT_EXTRACT": "read_repo",
    "STRATEGY_DESIGN": "plan_only",
    "IMPLEMENT": "write_leased_paths",
    "VALIDATE": "test_sandbox",
    "REVIEW": "review_only",
    "COMMIT_LOCAL": "commit_local_after_human_decision",
}


def hermes_boot(conn: sqlite3.Connection) -> bool:
    run_middleware_self_tests()
    verify_evidence_chain(conn)
    sweep_expired_leases(conn)
    sweep_stalled_tasks(conn)
    return True


def _requested_paths(spec: sqlite3.Row) -> list[str]:
    value = spec["requested_paths_json"] if "requested_paths_json" in spec.keys() else "[]"
    return json.loads(value or "[]")


def fetch_auto_eligible_specs(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT *
        FROM spec_queue
        WHERE status IN ('QUEUED','RUNNING')
          AND current_state IN (
            'SPEC_INTAKE','CONTRACT_EXTRACT','STRATEGY_DESIGN',
            'IMPLEMENT','VALIDATE','REVIEW','COMMIT_LOCAL'
          )
        ORDER BY priority ASC, created_at ASC
        """
    ).fetchall()

    specs: list[dict[str, Any]] = []
    for row in rows:
        spec = dict(row)
        spec["requested_paths"] = _requested_paths(row)
        specs.append(spec)
    return specs


def pause_at_gate(conn: sqlite3.Connection, spec: dict[str, Any], reason: str) -> None:
    with conn:
        conn.execute(
            """
            UPDATE spec_queue
            SET status = 'PAUSED_AT_GATE', blocked_reason = ?, updated_at = datetime('now')
            WHERE spec_id = ?
            """,
            (reason, spec["spec_id"]),
        )


def block_spec(conn: sqlite3.Connection, spec: dict[str, Any], reason: str) -> None:
    with conn:
        conn.execute(
            """
            UPDATE spec_queue
            SET status = 'BLOCKED', blocked_reason = ?, updated_at = datetime('now')
            WHERE spec_id = ?
            """,
            (reason, spec["spec_id"]),
        )


def has_human_decision_approval(conn: sqlite3.Connection, spec_id: str) -> bool:
    row = conn.execute(
        """
        SELECT 1
        FROM gate_approvals
        WHERE spec_id = ?
          AND gate_type = 'HUMAN_DECISION'
          AND decision = 'APPROVED'
        LIMIT 1
        """,
        (spec_id,),
    ).fetchone()
    return row is not None


def hermes_tick(conn: sqlite3.Connection) -> list[str]:
    sweep_expired_leases(conn)
    sweep_stalled_tasks(conn)

    dispatched: list[str] = []
    for spec in fetch_auto_eligible_specs(conn):
        state = spec["current_state"]
        action = STATE_ACTION[state]
        lease = active_lease_for_spec(conn, spec["spec_id"])
        human_approved = has_human_decision_approval(conn, spec["spec_id"])

        try:
            assert_allowed(
                action,
                requested_paths=spec.get("requested_paths", []),
                lease=lease,
                human_approved=human_approved,
            )
            check_budget_before_dispatch(conn, spec)
        except GateRequired as exc:
            pause_at_gate(conn, spec, str(exc))
            enqueue_notification(conn, spec, "URGENT", "gate.waiting", str(exc), urgent=True)
            continue
        except PolicyError as exc:
            block_spec(conn, spec, str(exc))
            write_evidence(conn, spec, state, "policy_stop", str(exc), "BLOCK")
            enqueue_notification(conn, spec, "URGENT", "spec.blocked", str(exc), urgent=True)
            continue

        target_agent = ROUTING[state]
        envelope = build_a2a_envelope(spec, target_agent, action)
        task_id = insert_task(conn, envelope)
        dispatch_supervised_child(conn, task_id, target_agent, envelope, start_process=False)
        enqueue_notification(
            conn,
            spec,
            "INFO",
            "task.dispatched",
            f"{state} dispatched to {target_agent}",
            urgent=False,
        )
        dispatched.append(task_id)

    flush_notification_digest(conn)
    return dispatched

