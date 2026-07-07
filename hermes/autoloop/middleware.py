"""Central fail-closed gate policy for GhostClaw Hermes Autoloop V2."""

from __future__ import annotations

import posixpath
from collections.abc import Iterable
from typing import Any


BLOCK_ALWAYS = {
    "deploy",
    "git_push",
    "dns_mutation",
    "cloudflare_mutation",
    "r2_write",
    "d1_write",
    "kv_write",
    "webhook_activation",
    "crm_write",
    "live_send_line",
    "live_send_telegram",
    "live_send_email",
    "secret_read",
    "secret_print",
    "rollback_execution",
    "production_db_migration",
    "governance_db_restore",
}

SAFE_ACTIONS = {
    "read_repo",
    "read_http",
    "write_reports",
    "plan_only",
    "review_only",
    "test_sandbox",
    "diff_summary",
    "write_leased_paths",
    "commit_local_after_human_decision",
}

GATE_ACTIONS = {
    "file_lease_approval",
    "human_decision",
    "push_deploy_manual",
    "governance_db_restore_manual",
}


class PolicyError(Exception):
    """Raised when an action violates non-negotiable policy."""


class GateRequired(Exception):
    """Raised when an action is allowed only after a human gate."""


def normalize_rel_path(path: str) -> str:
    """Normalize a repo-relative path and reject traversal."""

    if not isinstance(path, str) or not path.strip():
        raise ValueError("path must be a non-empty string")

    raw = path.replace("\\", "/").strip()
    raw = raw.removeprefix("./").lstrip("/")
    normalized = posixpath.normpath(raw)

    if normalized in {"", "."} or normalized.startswith("../") or normalized == "..":
        raise ValueError(f"path is not repo-relative: {path}")

    return normalized


def path_inside_lease(path: str, lease_paths: Iterable[str]) -> bool:
    """Return true only when a requested path is inside an approved lease."""

    try:
        normalized = normalize_rel_path(path)
    except ValueError:
        return False

    for raw_base in lease_paths:
        try:
            base = normalize_rel_path(raw_base)
        except ValueError:
            continue

        if normalized == base or normalized.startswith(base.rstrip("/") + "/"):
            return True

    return False


def _lease_expired(lease: dict[str, Any]) -> bool:
    return bool(lease.get("expired"))


def assert_allowed(
    action: str,
    *,
    requested_paths: Iterable[str] | None = None,
    lease: dict[str, Any] | None = None,
    human_approved: bool = False,
) -> bool:
    """Fail closed for unknown, blocked, unleased, or ungated actions."""

    if action in BLOCK_ALWAYS:
        raise PolicyError(f"blocked_by_gate_policy:{action}")

    if action not in SAFE_ACTIONS and action not in GATE_ACTIONS:
        raise PolicyError(f"unknown_action_denied:{action}")

    if action == "write_leased_paths":
        if lease is None or lease.get("status") != "ACTIVE":
            raise GateRequired("missing_active_lease")
        if _lease_expired(lease):
            raise GateRequired("lease_expired")
        lease_paths = lease.get("paths") or []
        for path in requested_paths or []:
            if not path_inside_lease(path, lease_paths):
                raise PolicyError(f"path_outside_lease:{path}")

    if action == "commit_local_after_human_decision" and not human_approved:
        raise GateRequired("human_decision_required")

    return True


def inject_constraints(envelope: dict[str, Any]) -> dict[str, Any]:
    """Attach policy hints to an A2A envelope without making prompts authoritative."""

    envelope["constraints"] = {
        "allow": sorted(SAFE_ACTIONS),
        "deny": sorted(BLOCK_ALWAYS),
    }
    return envelope

