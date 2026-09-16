#!/usr/bin/env python3
"""PreToolUse guard for GhostClaw layered local work.

The guard blocks high-risk commands, secret reads, and unleased file mutation.
It writes receipts with hashes and redacted previews only.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import pathlib
import re
import sys
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[2]
RECEIPT_DIR = ROOT / ".ghostclaw_runtime" / "receipts"

BLOCKED_COMMAND_PATTERNS = [
    (r"(^|\s)git\s+push(\s|$)", "git push is blocked"),
    (r"(^|\s)git\s+merge(\s|$)", "git merge is blocked"),
    (r"(^|\s)git\s+rebase(\s|$)", "git rebase is blocked"),
    (r"(^|\s)(curl|wget|ssh|scp|rsync)(\s|$)", "network shell command is blocked"),
    (r"(^|\s)npx(\s|$)", "npx execution is blocked"),
    (r"(^|\s)(npm|pnpm|yarn|bun)\s+(install|add|dlx|create)(\s|$)", "dependency install is blocked"),
    (r"(^|\s)(prisma|drizzle|sequelize|knex)\s+.*migrat", "migration command is blocked"),
    (r"(^|\s)rm\s+-rf(\s|$)", "destructive rm -rf is blocked"),
    (r"(^|\s)(vercel|wrangler|netlify|firebase|edgeone)\s+.*(deploy|publish)", "deploy command is blocked"),
]

SECRET_PATH_PATTERNS = [
    r"(^|/)\.env(\.|$)",
    r"(^|/)secrets?(/|$)",
    r"\.pem$",
    r"\.p12$",
    r"\.pfx$",
    r"\.key$",
]

TOKEN_LIKE = re.compile(
    r"(sk-[A-Za-z0-9_-]+|ghp_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|AKIA[0-9A-Z]{16})"
)


def _utc_now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _redact(text: str) -> str:
    redacted = TOKEN_LIKE.sub("[REDACTED_TOKEN]", text)
    for key in ("MAXPLUS_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"):
        value = os.environ.get(key)
        if value:
            redacted = redacted.replace(value, "[REDACTED_ENV_VALUE]")
    return redacted[:220]


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _read_payload() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"_raw": raw}


def _tool_name(payload: dict[str, Any]) -> str:
    return str(payload.get("tool_name") or payload.get("toolName") or payload.get("tool") or "")


def _tool_input(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("tool_input") or payload.get("toolInput") or payload.get("input") or {}
    return data if isinstance(data, dict) else {}


def _candidate_paths(tool_input: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    for key in ("file_path", "path", "notebook_path"):
        value = tool_input.get(key)
        if isinstance(value, str):
            paths.append(value)
    edits = tool_input.get("edits")
    if isinstance(edits, list):
        for edit in edits:
            if isinstance(edit, dict) and isinstance(edit.get("file_path"), str):
                paths.append(edit["file_path"])
    return paths


def _is_secret_path(path: str) -> bool:
    normalized = path.replace("\\", "/")
    return any(re.search(pattern, normalized) for pattern in SECRET_PATH_PATTERNS)


def _lease_allows(path: str) -> bool:
    active = os.environ.get("GHOSTCLAW_ACTIVE_FILE_LEASE", "")
    if not active:
        return False
    target = pathlib.Path(path)
    if not target.is_absolute():
        target = ROOT / target
    target_text = str(target.resolve())
    allowed = [item.strip() for item in active.split(os.pathsep) if item.strip()]
    return any(target_text == str((ROOT / item).resolve()) or target_text == str(pathlib.Path(item).resolve()) for item in allowed)


def _mutation_requires_lease(tool: str) -> bool:
    return tool in {"Write", "Edit", "MultiEdit", "NotebookEdit"}


def _runtime_write_allowed_without_lease(path: str) -> bool:
    if os.environ.get("GHOSTCLAW_ALLOW_UNLEASED_RUNTIME_WRITES") != "1":
        return False
    target = pathlib.Path(path)
    if not target.is_absolute():
        target = ROOT / target
    try:
        rel = target.resolve().relative_to(ROOT)
    except ValueError:
        return False
    rel_text = str(rel)
    return rel_text.startswith(
        (
            ".ghostclaw_runtime/a2a2a/receipts/",
            ".ghostclaw_runtime/a2a2a/status/",
            ".ghostclaw_runtime/a2a2a/evidence/",
            ".ghostclaw_runtime/receipts/",
        )
    )


def _decision(payload: dict[str, Any]) -> tuple[bool, list[str], dict[str, Any]]:
    tool = _tool_name(payload)
    tool_input = _tool_input(payload)
    reasons: list[str] = []
    evidence: dict[str, Any] = {"tool": tool}

    if tool == "Bash":
        command = str(tool_input.get("command") or "")
        evidence["command_sha256"] = _hash(command)
        evidence["command_preview_redacted"] = _redact(command)
        for pattern, reason in BLOCKED_COMMAND_PATTERNS:
            if re.search(pattern, command, flags=re.IGNORECASE):
                reasons.append(reason)
        if re.search(r"(^|\s)(cat|sed|awk|grep|rg|less|more)\s+.*(^|/)\.env(\.|$)", command):
            reasons.append("reading .env-like files is blocked")

    paths = _candidate_paths(tool_input)
    if paths:
        evidence["path_count"] = len(paths)
        evidence["path_hashes"] = [_hash(path) for path in paths]
    for path in paths:
        if _is_secret_path(path):
            reasons.append("secret-like file path is blocked")
        if _mutation_requires_lease(tool) and not _lease_allows(path) and not _runtime_write_allowed_without_lease(path):
            reasons.append(f"{tool} requires active Hermes file lease")

    return (not reasons, reasons, evidence)


def _write_receipt(allowed: bool, reasons: list[str], evidence: dict[str, Any]) -> pathlib.Path:
    receipt = {
        "schema": "ghostclaw.claude.pretool_guard_receipt.v1",
        "mission_id": "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
        "created_at": _utc_now(),
        "allowed": allowed,
        "blocked_reasons": reasons,
        "evidence": evidence,
        "raw_secret_values_recorded": False,
    }
    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    path = RECEIPT_DIR / f"ghostclaw_pretool_guard_{stamp}.json"
    latest = RECEIPT_DIR / "ghostclaw_pretool_guard_latest.json"
    encoded = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
    path.write_text(encoded, encoding="utf-8")
    latest.write_text(encoded, encoding="utf-8")
    return path


def main() -> int:
    payload = _read_payload()
    allowed, reasons, evidence = _decision(payload)
    receipt_path = _write_receipt(allowed, reasons, evidence)
    if allowed:
        print(json.dumps({"decision": "allow", "receipt_path": str(receipt_path)}, sort_keys=True))
        return 0
    reason = "; ".join(sorted(set(reasons)))
    print(
        json.dumps(
            {
                "decision": "block",
                "reason": reason,
                "receipt_path": str(receipt_path),
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                },
            },
            sort_keys=True,
        )
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
