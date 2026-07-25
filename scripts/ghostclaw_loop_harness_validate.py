#!/usr/bin/env python3
"""Validate GhostClaw Loop Harness manifests without external services.

The validator is intentionally dependency-free. It parses the local manifest and
schema, checks the GhostClaw safety contract, and can write local evidence,
receipt, and OpenCode review packets. It does not execute worker loops, consume
queue gates, call providers, read secrets, commit, push, deploy, or mutate cloud
systems.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKET_ID = "A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704"
DEFAULT_MANIFEST = "docs/harness/P077_LOOP_HARNESS_LOCAL_DRY_RUN_MANIFEST.example.json"
DEFAULT_SCHEMA = "docs/harness/loop_harness_manifest.schema.json"
DEFAULT_EVIDENCE = f".ghostclaw_runtime/a2a2a/evidence/{PACKET_ID}.json"
DEFAULT_RECEIPT = f".ghostclaw_runtime/a2a2a/receipts/{PACKET_ID}.json"
DEFAULT_REVIEW = ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P154-LOOP-HARNESS-OPENCODE-REVIEW-PACKET-20260704.json"

ACTIVE_FOCUS_REQUIRED = {"sirinx.co", "AGM AutoFlow"}
PAUSED_MARKERS = {
    "kusala",
    "กุศลา",
    "final farewell",
    "phitsanulok",
    "phitsanulok news",
    "phitsanulok united news",
}
REQUIRED_BLOCKED_PATHS = {
    ".env*",
    "secrets/**",
    "credentials/**",
}
REQUIRED_STOP_BEFORE = {
    "git commit",
    "git push",
    "deploy",
    "live Telegram send",
    "Cloudflare mutation",
    "provider/model call",
}
SAFE_ALLOWED_PREFIXES = (
    "docs/harness/",
    ".ghostclaw_runtime/a2a2a/evidence/",
    ".ghostclaw_runtime/a2a2a/receipts/",
    ".ghostclaw_runtime/a2a2a/reviews/",
    "reports/mission/",
)
EXTERNAL_ACTIONS_FALSE = {
    "queue_file_write": False,
    "queue_payload_execution": False,
    "worker_envelope_write": False,
    "worker_execution": False,
    "telegram_live_send": False,
    "provider_call": False,
    "repo_or_customer_data_external_routing": False,
    "secret_read_or_print": False,
    "install": False,
    "commit": False,
    "push": False,
    "deploy": False,
    "cloudflare_or_r2_mutation": False,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def to_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def resolve_path(root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root / path


def rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(to_json(data), encoding="utf-8")


def normalized_items(values: Any) -> set[str]:
    if not isinstance(values, list):
        return set()
    return {str(item) for item in values}


def contains_paused_marker(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in PAUSED_MARKERS)


def allowed_path_is_safe(pattern: str) -> bool:
    normalized = pattern.replace("**", "").replace("*", "")
    return normalized.startswith(SAFE_ALLOWED_PREFIXES)


def validate_manifest(manifest: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    issues: list[str] = []
    warnings: list[str] = []
    checks: dict[str, bool] = {}

    required = list(schema.get("required") or [])
    properties = set((schema.get("properties") or {}).keys())
    missing = [key for key in required if key not in manifest]
    extra = [key for key in manifest if properties and key not in properties]
    checks["required_fields_present"] = not missing
    checks["no_unknown_fields"] = not extra
    if missing:
        issues.append(f"missing_required_fields:{','.join(missing)}")
    if extra:
        issues.append(f"unknown_fields:{','.join(extra)}")

    mode = manifest.get("mode")
    allowed_modes = set((((schema.get("properties") or {}).get("mode") or {}).get("enum") or []))
    checks["mode_allowed"] = isinstance(mode, str) and (not allowed_modes or mode in allowed_modes)
    if not checks["mode_allowed"]:
        issues.append("mode_not_allowed")

    max_iterations = manifest.get("max_iterations")
    checks["max_iterations_within_cap"] = isinstance(max_iterations, int) and 1 <= max_iterations <= 5
    if not checks["max_iterations_within_cap"]:
        issues.append("max_iterations_out_of_cap")
    elif max_iterations > 3:
        warnings.append("max_iterations_above_default_requires_reason")

    active_focus = normalized_items(manifest.get("active_focus"))
    checks["active_focus_required_present"] = ACTIVE_FOCUS_REQUIRED.issubset(active_focus)
    checks["active_focus_excludes_paused_scope"] = not any(contains_paused_marker(item) for item in active_focus)
    if not checks["active_focus_required_present"]:
        issues.append("active_focus_missing_sirinx_or_agm")
    if not checks["active_focus_excludes_paused_scope"]:
        issues.append("active_focus_contains_paused_scope")

    paused = normalized_items(manifest.get("paused_out_of_scope"))
    checks["paused_scope_declared"] = any("Kusala" in item for item in paused) and any("Phitsanulok" in item for item in paused)
    if not checks["paused_scope_declared"]:
        issues.append("paused_scope_not_declared")

    allowed_paths = normalized_items(manifest.get("allowed_paths"))
    blocked_paths = normalized_items(manifest.get("blocked_paths"))
    checks["allowed_paths_safe"] = bool(allowed_paths) and all(allowed_path_is_safe(item) for item in allowed_paths)
    checks["allowed_paths_exclude_paused_scope"] = not any(contains_paused_marker(item) for item in allowed_paths)
    checks["blocked_paths_include_secret_like_paths"] = REQUIRED_BLOCKED_PATHS.issubset(blocked_paths)
    if not checks["allowed_paths_safe"]:
        issues.append("allowed_paths_not_limited_to_harness_receipts_reports_reviews")
    if not checks["allowed_paths_exclude_paused_scope"]:
        issues.append("allowed_paths_include_paused_scope")
    if not checks["blocked_paths_include_secret_like_paths"]:
        issues.append("blocked_paths_missing_secret_like_paths")

    stop_before = normalized_items(manifest.get("stop_before"))
    checks["stop_before_has_high_risk_gates"] = REQUIRED_STOP_BEFORE.issubset(stop_before)
    if not checks["stop_before_has_high_risk_gates"]:
        issues.append("stop_before_missing_high_risk_gate")

    required_validation = normalized_items(manifest.get("required_validation"))
    validation_text = "\n".join(required_validation)
    checks["validation_includes_json_parse"] = "json.tool" in validation_text
    checks["validation_includes_secret_scan"] = "secret-scan" in validation_text
    checks["validation_includes_diff_check"] = "git diff --check" in validation_text
    if not checks["validation_includes_json_parse"]:
        issues.append("validation_missing_json_parse")
    if not checks["validation_includes_secret_scan"]:
        issues.append("validation_missing_secret_scan")
    if not checks["validation_includes_diff_check"]:
        issues.append("validation_missing_diff_check")

    reviewer = manifest.get("reviewer") if isinstance(manifest.get("reviewer"), dict) else {}
    checks["reviewer_separate_from_worker"] = reviewer.get("separate_from_worker") is True
    checks["reviewer_mutation_blocked"] = reviewer.get("mutation_allowed") is False
    if not checks["reviewer_separate_from_worker"]:
        issues.append("reviewer_not_separate_from_worker")
    if not checks["reviewer_mutation_blocked"]:
        issues.append("reviewer_mutation_not_blocked")

    receipt_policy = manifest.get("receipt_policy") if isinstance(manifest.get("receipt_policy"), dict) else {}
    checks["receipt_per_iteration_required"] = receipt_policy.get("receipt_per_iteration") is True
    checks["record_changed_paths_required"] = receipt_policy.get("record_changed_paths") is True
    checks["record_validation_required"] = receipt_policy.get("record_validation") is True
    if not checks["receipt_per_iteration_required"]:
        issues.append("receipt_per_iteration_not_required")
    if not checks["record_changed_paths_required"]:
        issues.append("record_changed_paths_not_required")
    if not checks["record_validation_required"]:
        issues.append("record_validation_not_required")

    return {
        "checks": checks,
        "issues": issues,
        "warnings": warnings,
        "status": "pass" if not issues else "fail",
    }


def build_evidence(root: Path, manifest_path: str, schema_path: str) -> dict[str, Any]:
    manifest_abs = resolve_path(root, manifest_path)
    schema_abs = resolve_path(root, schema_path)
    manifest = read_json(manifest_abs)
    schema = read_json(schema_abs)
    validation = validate_manifest(manifest, schema)
    return {
        "schema": "ghostclaw.a2a2a.loop_harness_manifest_validation.v1",
        "packet_id": PACKET_ID,
        "status": "pass_loop_harness_manifest_validation" if validation["status"] == "pass" else "fail_loop_harness_manifest_validation",
        "created_at": now_iso(),
        "repo": str(root),
        "manifest_path": rel(root, manifest_abs),
        "schema_path": rel(root, schema_abs),
        "loop_id": manifest.get("loop_id"),
        "mode": manifest.get("mode"),
        "current_gate": manifest.get("current_gate"),
        "active_focus": manifest.get("active_focus"),
        "paused_out_of_scope": manifest.get("paused_out_of_scope"),
        "validation": validation,
        "external_actions_performed": EXTERNAL_ACTIONS_FALSE,
        "next_safe_action": (
            "Prepare OpenCode review packet for the harness validator output; do not consume P143 queue gate."
            if validation["status"] == "pass"
            else "Fix loop harness manifest validation issues before review."
        ),
    }


def build_receipt(evidence: dict[str, Any], evidence_output: str, review_output: str) -> dict[str, Any]:
    return {
        "schema": "ghostclaw.a2a2a.loop_harness_manifest_validation_receipt.v1",
        "packet_id": PACKET_ID,
        "status": "recorded_loop_harness_manifest_validation"
        if evidence["status"].startswith("pass_")
        else "recorded_loop_harness_manifest_validation_failed",
        "created_at": now_iso(),
        "repo": evidence["repo"],
        "evidence_path": evidence_output,
        "review_packet_path": review_output,
        "loop_id": evidence.get("loop_id"),
        "validation_status": evidence["status"],
        "issues": evidence["validation"]["issues"],
        "external_actions_performed": evidence["external_actions_performed"],
        "completion_claim": "Loop Harness manifest validator ran locally; no queue packet, worker, live send, provider call, commit, push, deploy, or cloud mutation was executed.",
        "next_safe_action": evidence["next_safe_action"],
    }


def build_review_packet(evidence: dict[str, Any], evidence_output: str) -> dict[str, Any]:
    passed = evidence["status"].startswith("pass_")
    return {
        "schema": "ghostclaw.a2a2a.opencode_review_packet.v1",
        "packet_id": "A2A2A-P154-LOOP-HARNESS-OPENCODE-REVIEW-PACKET-20260704",
        "status": "ready_for_opencode_review" if passed else "blocked_until_manifest_validation_passes",
        "created_at": now_iso(),
        "repo": evidence["repo"],
        "review_worker": "OpenCode_Reviewer",
        "mutation_allowed": False,
        "review_mode": "read_only",
        "target_artifacts": [
            evidence["manifest_path"],
            evidence["schema_path"],
            "docs/harness/GHOSTCLAW_LOOP_HARNESS_SPEC.md",
            "docs/harness/GHOSTCLAW_MODEL_CAPABILITY_REGISTRY.md",
            "docs/harness/GHOSTCLAW_TOOL_CALL_STABILITY_BENCH.md",
            evidence_output,
        ],
        "review_questions": [
            "Does the harness preserve Hermes, Agent Orchestrator, OpenCode review, deterministic validation, and human gates?",
            "Does the manifest enforce active focus on sirinx.co and AGM AutoFlow only?",
            "Are paused scopes excluded from active paths?",
            "Are commit, push, deploy, live send, provider call, Cloudflare/R2 mutation, and secret handling blocked?",
            "Is the iteration cap bounded and receipt policy explicit?",
        ],
        "must_not": [
            "edit source files",
            "write queue packet",
            "run worker loop",
            "call provider",
            "send live message",
            "commit",
            "push",
            "deploy",
        ],
        "external_actions_performed": EXTERNAL_ACTIONS_FALSE,
        "next_safe_action": "OpenCode may review this packet read-only; Codex remains blocked from consuming P143 without exact gate.",
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate GhostClaw Loop Harness manifest locally.")
    parser.add_argument("--root", default=str(REPO_ROOT))
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST)
    parser.add_argument("--schema", default=DEFAULT_SCHEMA)
    parser.add_argument("--evidence-output", default=DEFAULT_EVIDENCE)
    parser.add_argument("--receipt-output", default=DEFAULT_RECEIPT)
    parser.add_argument("--review-output", default=DEFAULT_REVIEW)
    parser.add_argument("--write", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    evidence = build_evidence(root, args.manifest, args.schema)
    if args.write:
        evidence_path = resolve_path(root, args.evidence_output)
        receipt_path = resolve_path(root, args.receipt_output)
        review_path = resolve_path(root, args.review_output)
        write_json(evidence_path, evidence)
        write_json(receipt_path, build_receipt(evidence, rel(root, evidence_path), rel(root, review_path)))
        write_json(review_path, build_review_packet(evidence, rel(root, evidence_path)))
    print(to_json(evidence), end="")
    return 0 if evidence["status"].startswith("pass_") else 1


if __name__ == "__main__":
    raise SystemExit(main())
