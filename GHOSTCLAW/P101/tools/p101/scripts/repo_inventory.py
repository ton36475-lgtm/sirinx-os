#!/usr/bin/env python3
"""Build a bounded, read-only inventory for the P101 baseline."""

from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess
import tomllib
from typing import Any, Iterable


IGNORED_DIRECTORIES = frozenset(
    {
        ".git",
        ".ghostclaw_runtime",
        ".next",
        ".pnpm-store",
        ".venv",
        "node_modules",
        "target",
        "vendor",
    }
)


def _run_read_only(command: list[str], cwd: Path) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        command,
        cwd=cwd,
        check=False,
        capture_output=True,
        timeout=10,
    )


def discover_manifests(repo_root: Path) -> dict[str, list[dict[str, str]]]:
    """Find source manifests without descending into generated/dependency trees."""

    cargo: list[dict[str, str]] = []
    packages: list[dict[str, str]] = []
    for current, directories, filenames in os.walk(repo_root):
        directories[:] = sorted(
            directory
            for directory in directories
            if directory not in IGNORED_DIRECTORIES
        )
        current_path = Path(current)
        if "Cargo.toml" in filenames:
            manifest = current_path / "Cargo.toml"
            name = current_path.name
            try:
                parsed = tomllib.loads(manifest.read_text(encoding="utf-8"))
                package = parsed.get("package", {})
                if isinstance(package, dict) and isinstance(package.get("name"), str):
                    name = package["name"]
            except (OSError, tomllib.TOMLDecodeError):
                pass
            cargo.append(
                {"name": name, "path": str(manifest.relative_to(repo_root))}
            )
        if "package.json" in filenames:
            manifest = current_path / "package.json"
            name = current_path.name
            try:
                parsed_json = json.loads(manifest.read_text(encoding="utf-8"))
                if isinstance(parsed_json, dict) and isinstance(parsed_json.get("name"), str):
                    name = parsed_json["name"]
            except (OSError, json.JSONDecodeError):
                pass
            packages.append(
                {"name": name, "path": str(manifest.relative_to(repo_root))}
            )
    return {
        "cargo": sorted(cargo, key=lambda item: item["path"]),
        "packages": sorted(packages, key=lambda item: item["path"]),
    }


def git_summary(repo_root: Path) -> dict[str, Any]:
    """Return counts and a digest, not raw dirty paths or file contents."""

    status = _run_read_only(["git", "status", "--porcelain=v1", "-z"], repo_root)
    if status.returncode != 0:
        return {"available": False, "reason": "git_status_failed"}

    staged = 0
    unstaged = 0
    untracked = 0
    entries = 0
    for raw_entry in status.stdout.split(b"\0"):
        if len(raw_entry) < 4 or raw_entry[2:3] != b" ":
            continue
        entries += 1
        state = raw_entry[:2]
        if state == b"??":
            untracked += 1
            continue
        if state[:1] != b" ":
            staged += 1
        if state[1:2] != b" ":
            unstaged += 1

    branch_result = _run_read_only(["git", "branch", "--show-current"], repo_root)
    head_result = _run_read_only(["git", "rev-parse", "HEAD"], repo_root)
    return {
        "available": True,
        "branch": branch_result.stdout.decode("utf-8", "replace").strip() or None,
        "head": head_result.stdout.decode("ascii", "replace").strip() or None,
        "clean": entries == 0,
        "entries": entries,
        "staged": staged,
        "unstaged": unstaged,
        "untracked": untracked,
        "status_sha256": sha256(status.stdout).hexdigest(),
    }


def parse_tmux_sessions(lines: Iterable[str]) -> list[str]:
    sessions = []
    for line in lines:
        name = line.strip().split(":", 1)[0]
        if name and name.replace("-", "").replace("_", "").isalnum():
            sessions.append(name)
    return sorted(set(sessions))


def tmux_sessions(snapshot: str | None = None) -> dict[str, Any]:
    """Observe session names only; never send keys or inspect pane contents."""

    if snapshot is not None:
        return {"available": True, "sessions": parse_tmux_sessions(snapshot.splitlines())}
    result = subprocess.run(
        ["tmux", "list-sessions", "-F", "#{session_name}"],
        check=False,
        capture_output=True,
        text=True,
        timeout=5,
    )
    if result.returncode != 0:
        return {"available": False, "sessions": []}
    return {"available": True, "sessions": parse_tmux_sessions(result.stdout.splitlines())}


def build_repo_inventory(repo_root: Path, tmux_snapshot: str | None = None) -> dict[str, Any]:
    root = repo_root.resolve()
    if not (root / ".git").exists():
        raise ValueError(f"not a Git repository: {root}")
    return {
        "schema": "sirinx.p101.repo-inventory.v2",
        "repo_root": str(root),
        "manifests": discover_manifests(root),
        "git": git_summary(root),
        "tmux": tmux_sessions(tmux_snapshot),
        "claims": {
            "tmux_session_presence_is_execution_proof": False,
            "mcp_servers_active": None,
            "langgraph_connected": None,
            "distributed_mutex_established": False,
        },
    }
