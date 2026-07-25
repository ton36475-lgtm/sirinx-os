#!/usr/bin/env python3
"""Local-safe deploy pipeline extracted from GitHub PR #1.

Read-only commands never write repository or runtime state.  GitHub push can
validate a short-lived approval plus an independent prerequisite receipt, but
execution remains delegated to a separately approved executor with a durable
nonce consumer.  Cloudflare deploy remains structurally blocked until a
separate, reviewed target manifest is added in a future change.

This module intentionally uses only the Python standard library and never
invokes a shell.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
TASK_ID = "SIRINX-PR1-DEPLOY-PIPELINE-SAFE-20260719"
APPROVAL_SCHEMA = "sirinx.deploy_pipeline.approval.v1"
PREREQUISITE_RECEIPT_SCHEMA = "sirinx.deploy_pipeline.prerequisite_receipt.v1"
MAX_EVIDENCE_BYTES = 64 * 1024
MAX_APPROVAL_LIFETIME = timedelta(minutes=10)
MAX_RECEIPT_LIFETIME = timedelta(minutes=15)
CLOCK_SKEW = timedelta(seconds=30)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
SAFE_REF_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
SAFE_REMOTE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
PUSH_REPOSITORY_ID = "github.com/ton36475-lgtm/sirinx-os"
PUSH_REPOSITORY_URL = "https://github.com/ton36475-lgtm/sirinx-os.git"
SECRET_LIKE_PATH_RE = re.compile(
    r"(?:^|/)(?:\.env(?:\.|$)|secrets?(?:/|$)|credentials?(?:/|$))"
    r"|(?:token|password|private[_-]?key|api[_-]?key)"
    r"|\.(?:pem|key|p12|pfx|keystore)$",
    re.IGNORECASE,
)
REQUIRED_RECEIPT_CHECKS = {
    "focused_tests": "PASS",
    "diff_check": "PASS",
    "review": "PASS",
}


class PipelineError(RuntimeError):
    """A redacted, stable failure suitable for CLI output."""

    def __init__(
        self,
        code: str,
        message: str,
        exit_code: int = 4,
        *,
        external_action_performed: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.exit_code = exit_code
        self.external_action_performed = external_action_performed


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    stdout: str = ""
    stderr: str = ""


Runner = Callable[[Sequence[str], Path, int, bool], CommandResult]


def _git_read_argv(args: Sequence[str]) -> List[str]:
    return ["git", "--no-optional-locks", "-c", "core.fsmonitor=false", *args]


def subprocess_runner(
    argv: Sequence[str], cwd: Path, timeout: int, capture_output: bool
) -> CommandResult:
    """Run an argv vector without a shell.

    External execution uses ``capture_output=False`` so credential-bearing
    remote output cannot be copied into logs or receipts.
    """

    try:
        completed = subprocess.run(
            list(argv),
            cwd=str(cwd),
            shell=False,
            check=False,
            text=True,
            timeout=timeout,
            stdout=subprocess.PIPE if capture_output else subprocess.DEVNULL,
            stderr=subprocess.PIPE if capture_output else subprocess.DEVNULL,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PipelineError(
            "subprocess_start_failed",
            f"Command could not start ({type(exc).__name__}); output was not retained.",
            exit_code=5,
        ) from None
    return CommandResult(
        completed.returncode,
        completed.stdout or "",
        completed.stderr or "",
    )


def _git(
    repo: Path,
    args: Sequence[str],
    runner: Runner,
    *,
    timeout: int = 30,
) -> str:
    result = runner(_git_read_argv(args), repo, timeout, True)
    if result.returncode != 0:
        command_name = next((arg for arg in args if not arg.startswith("-")), "read")
        raise PipelineError(
            "git_read_failed",
            f"Read-only git command failed: {command_name}.",
            exit_code=5,
        )
    return result.stdout


def _valid_ref(value: str) -> bool:
    return bool(
        value
        and SAFE_REF_RE.fullmatch(value)
        and ".." not in value
        and "//" not in value
        and "@{" not in value
        and not value.endswith("/")
        and not value.endswith(".")
        and not value.startswith("-")
    )


def _current_context(repo: Path, runner: Runner) -> Tuple[str, str]:
    branch = _git(repo, ["branch", "--show-current"], runner).strip()
    head_sha = _git(repo, ["rev-parse", "HEAD"], runner).strip().lower()
    if not _valid_ref(branch):
        raise PipelineError("unsafe_branch", "Current branch is not a safe named ref.")
    if not GIT_SHA_RE.fullmatch(head_sha):
        raise PipelineError("invalid_head", "Git did not return a full 40-character HEAD SHA.")
    return branch, head_sha


def pipeline_status(repo: Path = REPO_ROOT, runner: Runner = subprocess_runner) -> Dict[str, Any]:
    """Return local git status without reading or printing a remote URL."""

    branch, head_sha = _current_context(repo, runner)
    porcelain = _git(
        repo,
        ["status", "--porcelain=v1", "-z"],
        runner,
    )
    dirty_count = len([entry for entry in porcelain.split("\0") if entry])

    remote_output = _git(repo, ["remote"], runner)
    remotes = []
    for candidate in remote_output.splitlines():
        candidate = candidate.strip()
        remotes.append(candidate if SAFE_REMOTE_RE.fullmatch(candidate) else "[redacted]")

    upstream_result = runner(
        _git_read_argv(
            ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]
        ),
        repo,
        30,
        True,
    )
    ahead = None
    behind = None
    upstream = None
    if upstream_result.returncode == 0:
        candidate = upstream_result.stdout.strip()
        upstream = candidate if _valid_ref(candidate) else "[redacted]"
        counts_result = runner(
            _git_read_argv(
                ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]
            ),
            repo,
            30,
            True,
        )
        if counts_result.returncode != 0:
            raise PipelineError("git_read_failed", "Unable to compare local upstream state.", 5)
        parts = counts_result.stdout.strip().split()
        if len(parts) != 2 or not all(part.isdigit() for part in parts):
            raise PipelineError("invalid_git_output", "Git returned invalid divergence counts.", 5)
        ahead, behind = int(parts[0]), int(parts[1])

    return {
        "state": "read_only",
        "branch": branch,
        "head_sha": head_sha,
        "dirty_count": dirty_count,
        "upstream": upstream,
        "ahead": ahead,
        "behind": behind,
        "remote_names": remotes,
        "remote_urls_read": False,
        "external_action_performed": False,
    }


def _is_secret_like_path(path: str) -> bool:
    name = Path(path).name.lower()
    if name == ".env.example" or (name.startswith(".env.") and name.endswith(".example")):
        return False
    return bool(SECRET_LIKE_PATH_RE.search(path))


def _display_path(path: str) -> str:
    return "[redacted-secret-like-path]" if _is_secret_like_path(path) else path


def review_last_commit(
    repo: Path = REPO_ROOT, runner: Runner = subprocess_runner
) -> Dict[str, Any]:
    """Perform a metadata-only review of the last commit.

    Diff contents are deliberately not read.  This prevents the review command
    from copying an accidentally committed credential into process output.
    """

    _, head_sha = _current_context(repo, runner)
    names_output = _git(
        repo,
        ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"],
        runner,
    )
    paths = [path for path in names_output.split("\0") if path]
    issues: List[Dict[str, str]] = []
    for path in paths:
        if _is_secret_like_path(path):
            issues.append(
                {
                    "severity": "BLOCKER",
                    "type": "secret_like_path",
                    "path": "[redacted-secret-like-path]",
                }
            )

    numstat_output = _git(
        repo,
        ["diff-tree", "--root", "--no-commit-id", "--numstat", "-r", "-z", "HEAD"],
        runner,
    )
    for record in numstat_output.split("\0"):
        if not record:
            continue
        fields = record.split("\t", 2)
        if len(fields) != 3:
            continue
        added, deleted, path = fields
        if added.isdigit() and deleted.isdigit() and max(int(added), int(deleted)) > 500:
            issues.append(
                {
                    "severity": "WARN",
                    "type": "large_change",
                    "path": _display_path(path),
                }
            )

    return {
        "state": "read_only",
        "head_sha": head_sha,
        "verdict": "PASS" if not issues else "ISSUES_FOUND",
        "files_reviewed": len(paths),
        "issues": issues,
        "diff_content_read": False,
        "report_written": False,
        "external_action_performed": False,
    }


def commit_blocked() -> Dict[str, Any]:
    """Never sweep, stage, or commit a working tree."""

    raise PipelineError(
        "manual_scoped_commit_required",
        "Automatic commit is disabled; stage and commit only an independently reviewed file scope.",
        exit_code=3,
    )


def _json_without_duplicates(raw: str) -> Mapping[str, Any]:
    def pairs_hook(pairs: List[Tuple[str, Any]]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise PipelineError("duplicate_json_key", "Evidence JSON contains a duplicate key.")
            result[key] = value
        return result

    try:
        value = json.loads(raw, object_pairs_hook=pairs_hook)
    except PipelineError:
        raise
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise PipelineError("invalid_json", "Evidence is not valid UTF-8 JSON.") from None
    if not isinstance(value, dict):
        raise PipelineError("invalid_json_shape", "Evidence JSON must be an object.")
    return value


def _runtime_roots(repo: Path) -> Dict[str, Path]:
    base = repo / ".ghostclaw_runtime" / "a2a2a"
    return {
        "approvals": base / "approvals",
        "receipts": base / "receipts",
        "evidence": base / "evidence",
    }


def _read_direct_file(path: Path, root: Path, repo: Path, label: str) -> bytes:
    """Open a runtime file once through no-follow directory descriptors."""

    if not path.is_absolute():
        raise PipelineError("unsafe_evidence_path", f"{label} path must be absolute.")
    if not repo.is_absolute() or repo.is_symlink():
        raise PipelineError("unsafe_repository_root", "Repository root must be absolute and non-symlinked.")
    try:
        repo_resolved = repo.resolve(strict=True)
    except OSError:
        raise PipelineError("unsafe_repository_root", "Repository root cannot be resolved safely.") from None
    if repo_resolved != repo:
        raise PipelineError("unsafe_repository_root", "Repository root must use its canonical path.")
    try:
        relative_root = root.relative_to(repo)
    except ValueError:
        raise PipelineError("unsafe_runtime_root", f"{label} runtime root escaped the repository.") from None
    if path.parent != root:
        raise PipelineError("unsafe_evidence_path", f"{label} must be a direct child of its runtime root.")

    if not hasattr(os, "O_NOFOLLOW") or os.open not in os.supports_dir_fd:
        raise PipelineError("unsupported_safe_open", "Platform cannot safely open evidence by directory FD.")

    directory_flags = os.O_RDONLY | os.O_NOFOLLOW
    if hasattr(os, "O_DIRECTORY"):
        directory_flags |= os.O_DIRECTORY
    open_fds: List[int] = []
    try:
        current_fd = os.open(repo, directory_flags)
        open_fds.append(current_fd)
        for component in relative_root.parts:
            try:
                next_fd = os.open(component, directory_flags, dir_fd=current_fd)
            except OSError:
                raise PipelineError(
                    "unsafe_runtime_root", f"{label} runtime ancestor could not be opened safely."
                ) from None
            if not stat.S_ISDIR(os.fstat(next_fd).st_mode):
                os.close(next_fd)
                raise PipelineError("unsafe_runtime_root", f"{label} runtime root is not a directory.")
            open_fds.append(next_fd)
            current_fd = next_fd

        try:
            file_fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=current_fd)
        except OSError:
            raise PipelineError(
                "unsafe_evidence_file", f"{label} could not be opened as a no-follow file."
            ) from None
        open_fds.append(file_fd)
        file_stat = os.fstat(file_fd)
        if not stat.S_ISREG(file_stat.st_mode):
            raise PipelineError("unsafe_evidence_file", f"{label} must be a regular file.")
        if file_stat.st_size > MAX_EVIDENCE_BYTES:
            raise PipelineError("oversized_evidence", f"{label} exceeds the evidence size limit.")
        chunks = []
        remaining = MAX_EVIDENCE_BYTES + 1
        while remaining > 0:
            chunk = os.read(file_fd, min(16 * 1024, remaining))
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
        raw = b"".join(chunks)
        if len(raw) > MAX_EVIDENCE_BYTES:
            raise PipelineError("oversized_evidence", f"{label} exceeds the evidence size limit.")
        return raw
    except PipelineError:
        raise
    except OSError:
        raise PipelineError("unsafe_evidence_file", f"{label} could not be opened safely.") from None
    finally:
        for descriptor in reversed(open_fds):
            try:
                os.close(descriptor)
            except OSError:
                pass


def _read_evidence_json(
    path: Path, root: Path, repo: Path, label: str
) -> Tuple[Mapping[str, Any], str]:
    try:
        raw_bytes = _read_direct_file(path, root, repo, label)
        raw = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise PipelineError("evidence_read_failed", f"{label} could not be read safely.") from None
    return _json_without_duplicates(raw), hashlib.sha256(raw_bytes).hexdigest()


def _artifact_digest(path: Path, root: Path, repo: Path) -> str:
    return hashlib.sha256(_read_direct_file(path, root, repo, "artifact")).hexdigest()


def _parse_time(value: Any, field: str) -> datetime:
    if not isinstance(value, str):
        raise PipelineError("invalid_timestamp", f"{field} must be an ISO-8601 timestamp.")
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        raise PipelineError("invalid_timestamp", f"{field} must be an ISO-8601 timestamp.") from None
    if parsed.tzinfo is None:
        raise PipelineError("invalid_timestamp", f"{field} must include a timezone.")
    return parsed.astimezone(timezone.utc)


def _expect_exact_keys(document: Mapping[str, Any], keys: Sequence[str], label: str) -> None:
    expected = set(keys)
    actual = set(document)
    if actual != expected:
        raise PipelineError(
            "invalid_evidence_fields",
            f"{label} fields do not match the required schema.",
        )


def _expect_equal(document: Mapping[str, Any], expected: Mapping[str, Any], label: str) -> None:
    for key, value in expected.items():
        if document.get(key) != value:
            raise PipelineError("evidence_mismatch", f"{label} does not match execution field: {key}.")


def _validate_time_window(
    issued: datetime,
    expires: datetime,
    now: datetime,
    maximum: timedelta,
    label: str,
) -> None:
    if expires <= issued or expires - issued > maximum:
        raise PipelineError("invalid_evidence_lifetime", f"{label} lifetime exceeds policy.")
    if issued > now + CLOCK_SKEW:
        raise PipelineError("evidence_not_yet_valid", f"{label} is not yet valid.")
    if now > expires:
        raise PipelineError("expired_evidence", f"{label} has expired.")


def _validate_approval_and_receipt(
    *,
    repo: Path,
    approval_path: Path,
    receipt_path: Path,
    artifact_path: Path,
    action: str,
    target: str,
    branch: str,
    head_sha: str,
    argv: Sequence[str],
    now: datetime,
) -> Tuple[Mapping[str, Any], str]:
    roots = _runtime_roots(repo)
    claimed_path = approval_path.with_name(approval_path.name + ".claimed")
    if claimed_path.exists() or claimed_path.is_symlink():
        raise PipelineError("approval_replayed", "Approval has already been claimed.")
    approval, approval_file_digest = _read_evidence_json(
        approval_path, roots["approvals"], repo, "approval"
    )
    receipt, _ = _read_evidence_json(
        receipt_path, roots["receipts"], repo, "prerequisite receipt"
    )
    artifact_sha256 = _artifact_digest(artifact_path, roots["evidence"], repo)

    approval_keys = [
        "schema",
        "approval_id",
        "task_id",
        "action",
        "target",
        "branch",
        "head_sha",
        "argv",
        "artifact_sha256",
        "approved",
        "requested_by",
        "approved_by",
        "issued_at",
        "expires_at",
        "prerequisite_receipt_id",
    ]
    receipt_keys = [
        "schema",
        "receipt_id",
        "task_id",
        "action",
        "target",
        "branch",
        "head_sha",
        "argv",
        "artifact_sha256",
        "verdict",
        "produced_by",
        "created_at",
        "expires_at",
        "checks",
    ]
    _expect_exact_keys(approval, approval_keys, "Approval")
    _expect_exact_keys(receipt, receipt_keys, "Prerequisite receipt")

    expected = {
        "task_id": TASK_ID,
        "action": action,
        "target": target,
        "branch": branch,
        "head_sha": head_sha,
        "argv": list(argv),
        "artifact_sha256": artifact_sha256,
    }
    _expect_equal(approval, expected, "Approval")
    _expect_equal(receipt, expected, "Prerequisite receipt")

    if approval.get("schema") != APPROVAL_SCHEMA or approval.get("approved") is not True:
        raise PipelineError("approval_invalid", "Approval schema or decision is invalid.")
    if receipt.get("schema") != PREREQUISITE_RECEIPT_SCHEMA or receipt.get("verdict") != "PASS":
        raise PipelineError("receipt_invalid", "Prerequisite receipt is not a PASS receipt.")
    if not isinstance(approval.get("approval_id"), str) or not approval["approval_id"].strip():
        raise PipelineError("approval_invalid", "Approval ID is missing.")
    if not isinstance(receipt.get("receipt_id"), str) or not receipt["receipt_id"].strip():
        raise PipelineError("receipt_invalid", "Prerequisite receipt ID is missing.")
    if approval.get("prerequisite_receipt_id") != receipt.get("receipt_id"):
        raise PipelineError("receipt_mismatch", "Approval references a different prerequisite receipt.")
    requester = approval.get("requested_by")
    approver = approval.get("approved_by")
    if not isinstance(requester, str) or not requester.strip():
        raise PipelineError("approval_invalid", "Approval requester is missing.")
    if not isinstance(approver, str) or not approver.strip() or approver == requester:
        raise PipelineError("self_approval_blocked", "Requester and approver must be different identities.")
    if not isinstance(receipt.get("produced_by"), str) or not receipt["produced_by"].strip():
        raise PipelineError("receipt_invalid", "Prerequisite receipt producer is missing.")
    if receipt.get("checks") != REQUIRED_RECEIPT_CHECKS:
        raise PipelineError("receipt_checks_incomplete", "Prerequisite checks are not exactly PASS.")
    if not SHA256_RE.fullmatch(str(approval.get("artifact_sha256", ""))):
        raise PipelineError("approval_invalid", "Approval artifact digest is invalid.")

    approval_issued = _parse_time(approval.get("issued_at"), "issued_at")
    approval_expires = _parse_time(approval.get("expires_at"), "expires_at")
    receipt_created = _parse_time(receipt.get("created_at"), "created_at")
    receipt_expires = _parse_time(receipt.get("expires_at"), "expires_at")
    _validate_time_window(
        approval_issued, approval_expires, now, MAX_APPROVAL_LIFETIME, "Approval"
    )
    _validate_time_window(
        receipt_created, receipt_expires, now, MAX_RECEIPT_LIFETIME, "Prerequisite receipt"
    )
    if receipt_created > approval_issued + CLOCK_SKEW:
        raise PipelineError(
            "receipt_order_invalid",
            "Prerequisite receipt must exist before approval is issued.",
        )

    return approval, approval_file_digest


def _push_argv(branch: str) -> List[str]:
    if not _valid_ref(branch):
        raise PipelineError("unsafe_branch", "Push branch is not a safe named ref.")
    return [
        "git",
        "push",
        "--porcelain",
        PUSH_REPOSITORY_URL,
        f"HEAD:refs/heads/{branch}",
    ]


def push_to_github(
    *,
    repo: Path = REPO_ROOT,
    execute: bool = False,
    confirm: bool = False,
    target: Optional[str] = None,
    approval_path: Optional[Path] = None,
    receipt_path: Optional[Path] = None,
    artifact_path: Optional[Path] = None,
    runner: Runner = subprocess_runner,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Validate exact push evidence, then stop before external execution."""

    if confirm and not execute:
        raise PipelineError(
            "confirmation_not_authorization",
            "--confirm is not an approval and cannot unlock push.",
            exit_code=3,
        )
    if not execute:
        return {
            "action": "push",
            "state": "plan_only",
            "requires": ["--execute", "approval", "prerequisite_receipt", "artifact"],
            "external_action_performed": False,
        }

    branch, head_sha = _current_context(repo, runner)
    argv = _push_argv(branch)
    expected_target = f"{PUSH_REPOSITORY_ID}@refs/heads/{branch}"
    if target != expected_target:
        raise PipelineError("target_mismatch", "Push target must exactly match the current branch.")
    if not approval_path or not receipt_path or not artifact_path:
        raise PipelineError("missing_evidence", "Push requires approval, receipt, and artifact paths.")
    timestamp = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    _validate_approval_and_receipt(
        repo=repo,
        approval_path=approval_path,
        receipt_path=receipt_path,
        artifact_path=artifact_path,
        action="push",
        target=expected_target,
        branch=branch,
        head_sha=head_sha,
        argv=argv,
        now=timestamp,
    )
    raise PipelineError(
        "separate_executor_required",
        "Push evidence validated, but this local-safe slice cannot claim approval or run external Git.",
        exit_code=3,
    )


def deploy_cloudflare(*, execute: bool = False, confirm: bool = False) -> Dict[str, Any]:
    """Keep production deploy unavailable in this focused slice."""

    if confirm and not execute:
        raise PipelineError(
            "confirmation_not_authorization",
            "--confirm is not an approval and cannot unlock deploy.",
            exit_code=3,
        )
    if execute:
        raise PipelineError(
            "no_approved_deploy_targets",
            "Deploy is blocked: this slice contains no approved preview target manifest.",
            exit_code=3,
        )
    return {
        "action": "deploy",
        "state": "plan_only",
        "approved_targets": [],
        "production_deploy_available": False,
        "external_action_performed": False,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SIRINX local-safe deploy pipeline")
    subparsers = parser.add_subparsers(dest="command")
    for name in ("status", "review", "commit"):
        subparsers.add_parser(name)

    push = subparsers.add_parser("push")
    push.add_argument("--confirm", action="store_true")
    push.add_argument("--execute", action="store_true")
    push.add_argument("--target")
    push.add_argument("--approval", type=Path)
    push.add_argument("--receipt", type=Path)
    push.add_argument("--artifact", type=Path)

    deploy = subparsers.add_parser("deploy")
    deploy.add_argument("--confirm", action="store_true")
    deploy.add_argument("--execute", action="store_true")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    command = args.command or "status"
    try:
        if command == "status":
            result = pipeline_status()
        elif command == "review":
            result = review_last_commit()
        elif command == "commit":
            result = commit_blocked()
        elif command == "push":
            result = push_to_github(
                execute=args.execute,
                confirm=args.confirm,
                target=args.target,
                approval_path=args.approval,
                receipt_path=args.receipt,
                artifact_path=args.artifact,
            )
        elif command == "deploy":
            result = deploy_cloudflare(execute=args.execute, confirm=args.confirm)
        else:  # pragma: no cover - argparse owns command validation.
            parser.error("unknown command")
            return 2
    except PipelineError as exc:
        print(
            json.dumps(
                {
                    "state": "blocked" if exc.exit_code in (3, 4) else "failed",
                    "code": exc.code,
                    "message": exc.message,
                    "external_action_performed": exc.external_action_performed,
                },
                sort_keys=True,
            )
        )
        return exc.exit_code
    print(json.dumps(result, indent=2, sort_keys=True))
    if command == "review" and result.get("verdict") != "PASS":
        return 4
    if command in {"push", "deploy"} and result.get("state") == "plan_only":
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
