"""A2A envelope insertion and supervised dispatch boundaries."""

from __future__ import annotations

import json
import sqlite3
import subprocess
import threading
import uuid
from typing import Any, Callable

from .heartbeat import heartbeat_loop
from .leases import now_iso
from .middleware import inject_constraints


def build_a2a_envelope(
    spec: dict[str, Any],
    target_agent: str,
    action_requested: str,
    *,
    agent_instance_id: str | None = None,
) -> dict[str, Any]:
    envelope = {
        "task_id": str(uuid.uuid4()),
        "spec_id": spec["spec_id"],
        "mission_id": spec["mission_id"],
        "from_agent": "hermes",
        "to_agent": target_agent,
        "agent_instance_id": agent_instance_id or f"{target_agent}-{spec['spec_id']}-{uuid.uuid4().hex[:8]}",
        "state": spec["current_state"],
        "action_requested": action_requested,
        "worktree_path": spec.get("worktree_path"),
        "lease_id": spec.get("lease_id"),
        "payload": {
            "requested_paths": spec.get("requested_paths", []),
            "contract_ref": spec.get("contract_ref"),
            "strategy_ref": spec.get("strategy_ref"),
        },
        "reply_to": "hermes.callback",
        "created_at": now_iso(),
    }
    return inject_constraints(envelope)


def insert_task(conn: sqlite3.Connection, envelope: dict[str, Any]) -> str:
    with conn:
        conn.execute(
            """
            INSERT INTO a2a_tasks (
              task_id, spec_id, from_agent, to_agent, agent_instance_id,
              state, action_requested, envelope_json, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?)
            """,
            (
                envelope["task_id"],
                envelope["spec_id"],
                envelope["from_agent"],
                envelope["to_agent"],
                envelope["agent_instance_id"],
                envelope["state"],
                envelope["action_requested"],
                json.dumps(envelope, ensure_ascii=True, sort_keys=True),
                envelope["created_at"],
            ),
        )
    return envelope["task_id"]


def build_agent_command(target_agent: str, envelope: dict[str, Any]) -> list[str]:
    """Return a dry-run command preview; live adapters are a future gate."""

    payload = {
        "target_agent": target_agent,
        "task_id": envelope["task_id"],
        "spec_id": envelope["spec_id"],
        "mode": "dry_run_supervised_dispatch_preview",
    }
    return [
        "python3",
        "-c",
        "import json,sys; print(json.dumps(json.loads(sys.argv[1]), sort_keys=True))",
        json.dumps(payload, ensure_ascii=True, sort_keys=True),
    ]


def dispatch_supervised_child(
    conn: sqlite3.Connection,
    task_id: str,
    target_agent: str,
    envelope: dict[str, Any],
    *,
    conn_factory: Callable[[], sqlite3.Connection] | None = None,
    start_process: bool = False,
) -> str:
    """Record a supervised run and optionally start a dry-run child process.

    `start_process` is false by default to keep Autoloop V2 implementation safe
    until a separate runtime execution gate approves a live adapter.
    """

    run_id = str(uuid.uuid4())
    agent_instance_id = envelope["agent_instance_id"]

    with conn:
        conn.execute(
            """
            INSERT INTO agent_log (
              run_id, task_id, spec_id, agent, agent_instance_id, started_at,
              last_heartbeat_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING')
            """,
            (
                run_id,
                task_id,
                envelope["spec_id"],
                target_agent,
                agent_instance_id,
                now_iso(),
                now_iso(),
            ),
        )
        conn.execute(
            "UPDATE a2a_tasks SET status = 'DISPATCHED', dispatched_at = ? WHERE task_id = ?",
            (now_iso(), task_id),
        )

    if not start_process:
        return run_id

    if conn_factory is None:
        raise ValueError("conn_factory required when start_process=True")

    stop_event = threading.Event()
    hb_thread = threading.Thread(
        target=heartbeat_loop,
        args=(conn_factory, run_id, stop_event),
        daemon=True,
    )
    hb_thread.start()

    command = build_agent_command(target_agent, envelope)
    proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    with conn:
        conn.execute("UPDATE agent_log SET process_id = ? WHERE run_id = ?", (proc.pid, run_id))
    return run_id

