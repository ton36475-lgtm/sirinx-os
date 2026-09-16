#!/usr/bin/env python3
"""Validate the GhostClaw YOLO v3.3 artifact gate without merging it."""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Any

EXPECTED_BASENAME = "ghostclaw_repo_merge_kit_v3_3.zip"
REQUIRED_ENTRY_KINDS = {
    "routers.ts": re.compile(r"(^|/)routers\.ts$"),
    "agentic.ts": re.compile(r"(^|/)agentic\.ts$"),
    "llmAnalysis.ts": re.compile(r"(^|/)llmAnalysis\.ts$"),
    "schema.ts": re.compile(r"(^|/)schema\.ts$"),
    "db.ts": re.compile(r"(^|/)db\.ts$"),
    "tests": re.compile(r"(^|/)tests/.*\.test\.mjs$"),
    "ci": re.compile(r"(^|/)(\.github/workflows/|ci/)"),
    "staging_manifest": re.compile(r"(^|/)(staging[-_]manifest|manifest).*\.json$"),
    "receipt": re.compile(r"(^|/)receipt.*\.json$"),
}


class ValidationResult:
    def __init__(
        self,
        ok: bool,
        errors: list[str],
        status: str = "blocked",
        artifact_basename: str | None = None,
        archive_entry_count: int = 0,
        missing_required_entries: list[str] | None = None,
        policy_pass: int | None = None,
        policy_fail: int | None = None,
        merge_script_execution: bool = False,
    ):
        self.ok = ok
        self.errors = errors
        self.status = status
        self.artifact_basename = artifact_basename
        self.archive_entry_count = archive_entry_count
        self.missing_required_entries = missing_required_entries or []
        self.policy_pass = policy_pass
        self.policy_fail = policy_fail
        self.merge_script_execution = merge_script_execution

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "status": self.status,
            "artifact_basename": self.artifact_basename,
            "archive_entry_count": self.archive_entry_count,
            "missing_required_entries": self.missing_required_entries,
            "policy_pass": self.policy_pass,
            "policy_fail": self.policy_fail,
            "merge_script_execution": self.merge_script_execution,
            "errors": self.errors,
        }


def read_archive_entries(artifact_path: Path, errors: list[str]) -> list[str]:
    try:
        with zipfile.ZipFile(artifact_path, "r") as archive:
            return [info.filename for info in archive.infolist() if not info.is_dir()]
    except zipfile.BadZipFile:
        errors.append("artifact must be a readable zip archive")
        return []


def missing_entry_kinds(entries: list[str]) -> list[str]:
    missing = []
    for kind, pattern in REQUIRED_ENTRY_KINDS.items():
        if not any(pattern.search(entry) for entry in entries):
            missing.append(kind)
    return missing


def parse_policy_evidence(policy_evidence_path: Path | None, errors: list[str]) -> tuple[int | None, int | None]:
    if policy_evidence_path is None:
        errors.append("policy evidence path is required")
        return None, None
    if not policy_evidence_path.exists():
        errors.append(f"policy evidence path does not exist: {policy_evidence_path}")
        return None, None

    text = policy_evidence_path.read_text(encoding="utf-8", errors="ignore")
    policy_pass = None
    policy_fail = None
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        payload = None

    if isinstance(payload, dict):
        for key in ("pass", "passed", "tests_passed"):
            if isinstance(payload.get(key), int):
                policy_pass = payload[key]
                break
        for key in ("fail", "failed", "tests_failed"):
            if isinstance(payload.get(key), int):
                policy_fail = payload[key]
                break
    else:
        pass_match = re.search(r"\bpass(?:ed)?\s*[:=]\s*(\d+)", text, re.IGNORECASE)
        fail_match = re.search(r"\bfail(?:ed)?\s*[:=]\s*(\d+)", text, re.IGNORECASE)
        if pass_match:
            policy_pass = int(pass_match.group(1))
        if fail_match:
            policy_fail = int(fail_match.group(1))

    if policy_pass is None:
        errors.append("policy evidence must include pass count")
    if policy_fail is None:
        errors.append("policy evidence must include fail count")
    elif policy_fail != 0:
        errors.append("policy evidence must show fail=0")
    if policy_pass is not None and policy_pass < 1:
        errors.append("policy evidence must show at least one passing test")

    return policy_pass, policy_fail


def validate_artifact_gate(
    artifact_path: Path | str,
    policy_evidence_path: Path | str | None = None,
) -> ValidationResult:
    artifact_path = Path(artifact_path)
    policy_path = Path(policy_evidence_path) if policy_evidence_path else None
    errors: list[str] = []

    if artifact_path.name != EXPECTED_BASENAME:
        errors.append(f"artifact basename must be {EXPECTED_BASENAME}")

    entries: list[str] = []
    if artifact_path.exists():
        entries = read_archive_entries(artifact_path, errors)
    else:
        errors.append(f"artifact path does not exist: {artifact_path}")

    missing = missing_entry_kinds(entries)
    for kind in missing:
        errors.append(f"missing required archive entry kind: {kind}")

    policy_pass, policy_fail = parse_policy_evidence(policy_path, errors)

    status = "artifact_gate_passed" if not errors else "blocked"
    return ValidationResult(
        ok=not errors,
        errors=errors,
        status=status,
        artifact_basename=artifact_path.name,
        archive_entry_count=len(entries),
        missing_required_entries=missing,
        policy_pass=policy_pass,
        policy_fail=policy_fail,
        merge_script_execution=False,
    )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", help="Path to ghostclaw_repo_merge_kit_v3_3.zip")
    parser.add_argument("--policy-evidence", help="Path to bundled policy test pass/fail evidence.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    artifact_path = Path(args.artifact)
    if not artifact_path.exists():
        print(
            json.dumps(
                {
                    "ok": False,
                    "reason": "missing_v3_3_artifact",
                    "path": str(artifact_path),
                },
                indent=2,
            )
        )
        return 2

    result = validate_artifact_gate(artifact_path, args.policy_evidence)
    print(json.dumps(result.to_dict(), indent=2))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
