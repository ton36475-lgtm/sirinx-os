#!/usr/bin/env python3
"""Validate and safely stage an OhMyCodex config packet."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REQUIRED_FALSE_CONSTRAINTS = (
    "write_live_config",
    "provider_model_call",
    "api_key_read",
    "env_read",
    "secret_access",
    "plugin_install",
    "postinstall_execution",
    "dependency_install",
    "push",
    "deploy",
    "production_action",
)

DEFAULT_REVIEW_TARGETS = ("hermes", "codex", "opencode")
REQUIRED_MODEL_ALIASES = (
    "glm-5.2",
    "deepseek-v4-pro",
    "kimi-k2.7-code",
    "gpt-5.5",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def approval_env_name(destination_label: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", destination_label).strip("_").upper()
    return f"APPROVE_OHMYCODEX_CONFIG_WRITE_{normalized}"


def load_packet(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        packet = json.load(handle)
    if not isinstance(packet, dict):
        raise ValueError("packet must be a JSON object")
    return packet


def load_optional_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return load_packet(path)


def validate_packet(packet: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    if packet.get("schema") != "ghostclaw.ohmycodex.config_packet.v1":
        errors.append("schema must be ghostclaw.ohmycodex.config_packet.v1")

    if packet.get("status") != "ready_for_review_no_execution":
        errors.append("status must be ready_for_review_no_execution")

    constraints = packet.get("safety_constraints")
    if not isinstance(constraints, dict):
        errors.append("safety_constraints must be an object")
    else:
        for key in REQUIRED_FALSE_CONSTRAINTS:
            if constraints.get(key) is not False:
                errors.append(f"safety_constraints.{key} must be false")

    destinations = packet.get("candidate_destination_paths")
    if not isinstance(destinations, dict) or not destinations:
        errors.append("candidate_destination_paths must be a non-empty object")

    config = packet.get("config_draft")
    if not isinstance(config, dict):
        errors.append("config_draft must be an object")
    else:
        if config.get("default_run_agent") != "codex-build-captain":
            errors.append("config_draft.default_run_agent must be codex-build-captain")
        if config.get("model_fallback") is not True:
            errors.append("config_draft.model_fallback must be true")
        if config.get("mcp_env_allowlist") != []:
            errors.append("config_draft.mcp_env_allowlist must remain empty")
        agents = config.get("agents")
        if not isinstance(agents, dict) or "build" not in agents:
            errors.append("config_draft.agents.build is required")

    if packet.get("destination_selected") is not None:
        errors.append("destination_selected must remain null until the write gate")

    return errors


def stable_json_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode("utf-8")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def resolve_destination(packet: dict[str, Any], destination_label: str, root: Path) -> Path:
    destinations = packet.get("candidate_destination_paths")
    if not isinstance(destinations, dict) or destination_label not in destinations:
        available = ", ".join(sorted(destinations)) if isinstance(destinations, dict) else "none"
        raise ValueError(f"unknown destination label: {destination_label}; available: {available}")

    raw_path = destinations[destination_label]
    if not isinstance(raw_path, str) or not raw_path.strip():
        raise ValueError(f"destination path for {destination_label} must be a non-empty string")

    expanded = Path(raw_path).expanduser()
    if expanded.is_absolute():
        return expanded
    return root / expanded


def build_apply_plan(packet: dict[str, Any], destination_label: str, root: Path, rollback_dir: Path) -> dict[str, Any]:
    errors = validate_packet(packet)
    target = None
    env_name = approval_env_name(destination_label)

    try:
        target = resolve_destination(packet, destination_label, root)
    except ValueError as exc:
        errors.append(str(exc))

    config = packet.get("config_draft") if not errors else None
    config_sha = hashlib.sha256(stable_json_bytes(config)).hexdigest() if isinstance(config, dict) else None
    rollback_path = None
    if target is not None:
        safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(target).strip("/"))
        rollback_path = rollback_dir / f"{safe_name}.backup"

    return {
        "schema": "ghostclaw.ohmycodex.config_apply_plan.v1",
        "ok": not errors,
        "errors": errors,
        "destination_label": destination_label,
        "target_path": str(target) if target else None,
        "target_exists": target.exists() if target else None,
        "rollback_path": str(rollback_path) if rollback_path else None,
        "approval_env": env_name,
        "config_sha256": config_sha,
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
    }


def build_preview(packet: dict[str, Any]) -> dict[str, Any]:
    errors = validate_packet(packet)
    return {
        "schema": "ghostclaw.ohmycodex.config_packet.preview.v1",
        "ok": not errors,
        "errors": errors,
        "gate": packet.get("gate"),
        "destination_selected": packet.get("destination_selected"),
        "candidate_destination_paths": packet.get("candidate_destination_paths", {}),
        "config_draft": packet.get("config_draft") if not errors else None,
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
    }


def write_config_with_gate(packet: dict[str, Any], destination_label: str, root: Path, rollback_dir: Path) -> dict[str, Any]:
    plan = build_apply_plan(packet, destination_label, root, rollback_dir)
    if not plan["ok"]:
        raise ValueError("; ".join(plan["errors"]))

    env_name = plan["approval_env"]
    if os.environ.get(env_name) != "1":
        raise PermissionError(f"write blocked: set {env_name}=1 to allow this exact destination")

    target = Path(plan["target_path"])
    rollback_dir.mkdir(parents=True, exist_ok=True)
    target.parent.mkdir(parents=True, exist_ok=True)

    backup_path = None
    if target.exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = Path(f"{plan['rollback_path']}.{stamp}")
        shutil.copy2(target, backup_path)

    config = packet["config_draft"]
    target.write_bytes(stable_json_bytes(config))

    return {
        "schema": "ghostclaw.ohmycodex.config_apply_result.v1",
        "ok": True,
        "destination_label": destination_label,
        "target_path": str(target),
        "backup_path": str(backup_path) if backup_path else None,
        "config_sha256": plan["config_sha256"],
        "write_live_config": True,
        "provider_model_call": False,
        "secret_access": False,
    }


def _safe_target(target: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9_-]+", "_", target).strip("_").lower()
    if not normalized:
        raise ValueError("review target cannot be empty")
    return normalized


def build_review_task(
    packet: dict[str, Any],
    apply_plan: dict[str, Any],
    target: str,
    packet_path: Path,
    apply_plan_path: Path | None,
    created_at: str,
) -> dict[str, Any]:
    safe_target = _safe_target(target)
    config = packet.get("config_draft", {})
    agents = config.get("agents", {}) if isinstance(config, dict) else {}
    build_agent = agents.get("build", {}) if isinstance(agents, dict) else {}

    return {
        "schema": "ghostclaw.a2a2a.task.v1",
        "id": f"ohmycodex_config_review_{safe_target}_{created_at.replace(':', '').replace('-', '')}",
        "source": "codex",
        "target": safe_target,
        "created_at": created_at,
        "task_type": "ohmycodex_config_review",
        "requires_ack": True,
        "requires_receipt": True,
        "dangerous_actions_allowed": False,
        "secret_access_allowed": False,
        "paid_model_calls_allowed": False,
        "payload": {
            "packet_path": str(packet_path),
            "apply_plan_path": str(apply_plan_path) if apply_plan_path else None,
            "approval_env": apply_plan.get("approval_env"),
            "config_sha256": apply_plan.get("config_sha256"),
            "destination_label": apply_plan.get("destination_label"),
            "target_path": apply_plan.get("target_path"),
            "target_exists": apply_plan.get("target_exists"),
            "default_run_agent": config.get("default_run_agent") if isinstance(config, dict) else None,
            "build_model": build_agent.get("model") if isinstance(build_agent, dict) else None,
            "fallback_models": build_agent.get("fallback_models", []) if isinstance(build_agent, dict) else [],
            "requested_review": [
                "confirm_packet_is_safe_to_review",
                "confirm_no_secret_or_provider_call_required",
                "confirm_exact_destination_gate",
                "return_reviewer_notes_only",
            ],
            "blocked_actions": [
                "write_live_config",
                "provider_model_call",
                "api_key_read",
                "env_read",
                "secret_access",
                "plugin_install",
                "dependency_install",
                "push",
                "deploy",
                "production_action",
            ],
        },
    }


def dispatch_review_tasks(
    packet: dict[str, Any],
    packet_path: Path,
    apply_plan: dict[str, Any],
    apply_plan_path: Path | None,
    root: Path,
    targets: list[str],
    created_at: str | None = None,
) -> dict[str, Any]:
    errors = validate_packet(packet)
    if apply_plan.get("schema") != "ghostclaw.ohmycodex.config_apply_plan.v1":
        errors.append("apply_plan schema must be ghostclaw.ohmycodex.config_apply_plan.v1")
    if apply_plan.get("ok") is not True:
        errors.append("apply_plan.ok must be true")
    if apply_plan.get("write_live_config") is not False:
        errors.append("apply_plan.write_live_config must be false")
    if apply_plan.get("provider_model_call") is not False:
        errors.append("apply_plan.provider_model_call must be false")
    if apply_plan.get("secret_access") is not False:
        errors.append("apply_plan.secret_access must be false")
    if errors:
        return {
            "schema": "ghostclaw.ohmycodex.review_dispatch.v1",
            "ok": False,
            "errors": errors,
            "packets": [],
        }

    stamp = created_at or now_iso()
    compact_stamp = stamp.replace(":", "").replace("-", "")
    packets = []
    for target in targets:
        safe_target = _safe_target(target)
        task = build_review_task(packet, apply_plan, safe_target, packet_path, apply_plan_path, stamp)
        path = (
            root
            / ".ghostclaw_runtime"
            / "a2a2a"
            / "inbox"
            / safe_target
            / f"ohmycodex_config_review_{safe_target}_{compact_stamp}.json"
        )
        write_json(path, task)
        packets.append(
            {
                "target": safe_target,
                "path": str(path),
                "task_id": task["id"],
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )

    return {
        "schema": "ghostclaw.ohmycodex.review_dispatch.v1",
        "ok": True,
        "created_at": stamp,
        "packet_path": str(packet_path),
        "apply_plan_path": str(apply_plan_path) if apply_plan_path else None,
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
        "packets": packets,
    }


def latest_receipt_for_target(root: Path, target: str) -> Path | None:
    safe_target = _safe_target(target)
    pattern = f"ack_{safe_target}_ohmycodex_config_review_{safe_target}_*.json"
    receipts = sorted((root / ".ghostclaw_runtime" / "a2a2a" / "receipts").glob(pattern))
    return receipts[-1] if receipts else None


def live_config_candidates(packet: dict[str, Any], root: Path) -> list[dict[str, Any]]:
    candidates = []
    destinations = packet.get("candidate_destination_paths", {})
    if not isinstance(destinations, dict):
        return candidates
    for label in sorted(destinations):
        try:
            path = resolve_destination(packet, label, root)
        except ValueError:
            continue
        candidates.append({"label": label, "path": str(path), "exists": path.exists()})
    return candidates


def _agent_aliases(alias_manifest: dict[str, Any]) -> set[str]:
    aliases: set[str] = set()
    agents = alias_manifest.get("agents", {})
    if not isinstance(agents, dict):
        return aliases
    for definition in agents.values():
        if not isinstance(definition, dict):
            continue
        for alias in definition.get("aliases", []):
            if isinstance(alias, str):
                aliases.add(alias)
        canonical = definition.get("canonical_model")
        if isinstance(canonical, str):
            aliases.add(canonical)
    return aliases


def _config_models(packet: dict[str, Any]) -> set[str]:
    models: set[str] = set()
    config = packet.get("config_draft", {})
    agents = config.get("agents", {}) if isinstance(config, dict) else {}
    if not isinstance(agents, dict):
        return models
    for agent_config in agents.values():
        if not isinstance(agent_config, dict):
            continue
        model = agent_config.get("model")
        if isinstance(model, str):
            models.add(model)
        fallback_models = agent_config.get("fallback_models", [])
        if isinstance(fallback_models, list):
            for item in fallback_models:
                if isinstance(item, str):
                    models.add(item)
                elif isinstance(item, dict) and isinstance(item.get("model"), str):
                    models.add(item["model"])
    return models


def build_readiness_report(
    packet: dict[str, Any],
    packet_path: Path,
    alias_manifest: dict[str, Any] | None,
    alias_manifest_path: Path | None,
    apply_plan: dict[str, Any] | None,
    apply_plan_path: Path | None,
    root: Path,
    targets: list[str],
) -> dict[str, Any]:
    checks: dict[str, Any] = {}
    blockers: list[str] = []
    warnings: list[str] = []

    packet_errors = validate_packet(packet)
    checks["config_packet_valid"] = not packet_errors
    if packet_errors:
        blockers.extend(f"packet: {error}" for error in packet_errors)

    alias_set = _agent_aliases(alias_manifest or {})
    config_model_set = _config_models(packet)
    missing_aliases = [model for model in REQUIRED_MODEL_ALIASES if model not in alias_set]
    missing_config_models = [model for model in REQUIRED_MODEL_ALIASES if model not in config_model_set]
    checks["required_aliases_present"] = not missing_aliases
    checks["required_config_models_present"] = not missing_config_models
    if missing_aliases:
        blockers.append(f"alias manifest missing required aliases: {', '.join(missing_aliases)}")
    if missing_config_models:
        blockers.append(f"config packet missing required models: {', '.join(missing_config_models)}")

    if "codex-local" not in config_model_set:
        blockers.append("config packet missing codex-local build model")
    checks["codex_local_build_model_present"] = "codex-local" in config_model_set

    if apply_plan is None:
        warnings.append("apply plan not supplied")
        checks["apply_plan_ok"] = False
    else:
        apply_ok = (
            apply_plan.get("schema") == "ghostclaw.ohmycodex.config_apply_plan.v1"
            and apply_plan.get("ok") is True
            and apply_plan.get("write_live_config") is False
            and apply_plan.get("provider_model_call") is False
            and apply_plan.get("secret_access") is False
        )
        checks["apply_plan_ok"] = apply_ok
        if not apply_ok:
            blockers.append("apply plan is missing or not safe")

    review_receipts = []
    for target in targets:
        receipt_path = latest_receipt_for_target(root, target)
        if receipt_path is None:
            blockers.append(f"missing A2A review ack receipt for {target}")
            review_receipts.append({"target": target, "path": None, "ok": False})
            continue
        receipt = load_optional_json(receipt_path)
        execution = receipt.get("execution", {}) if isinstance(receipt, dict) else {}
        ok = (
            receipt is not None
            and receipt.get("status") == "acknowledged_probe_only"
            and execution.get("payload_executed") is False
            and execution.get("paid_model_calls") is False
            and execution.get("secret_access") is False
            and execution.get("deploy") is False
            and execution.get("git_push") is False
        )
        if not ok:
            blockers.append(f"A2A review ack receipt for {target} is not safe/probe-only")
        review_receipts.append({"target": target, "path": str(receipt_path), "ok": ok})
    checks["a2a_review_receipts_ok"] = all(item["ok"] for item in review_receipts)

    live_configs = live_config_candidates(packet, root)
    live_config_exists = any(item["exists"] for item in live_configs)
    checks["live_config_not_written"] = not live_config_exists
    if live_config_exists:
        warnings.append("one or more OhMyCodex live config candidates already exist")

    ready_for_review = not blockers
    return {
        "schema": "ghostclaw.ohmycodex.readiness_report.v1",
        "status": "ready_for_review_no_execution" if ready_for_review else "not_ready",
        "created_at": now_iso(),
        "packet_path": str(packet_path),
        "alias_manifest_path": str(alias_manifest_path) if alias_manifest_path else None,
        "apply_plan_path": str(apply_plan_path) if apply_plan_path else None,
        "targets": targets,
        "checks": checks,
        "required_model_aliases": list(REQUIRED_MODEL_ALIASES),
        "config_models_found": sorted(config_model_set),
        "alias_models_found": sorted(alias_set),
        "review_receipts": review_receipts,
        "live_config_candidates": live_configs,
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
        "blockers": blockers,
        "warnings": warnings,
        "next_gate": packet.get("next_gate", "APPROVE_OHMYCODEX_CONFIG_WRITE_<DESTINATION_LABEL>"),
    }


def validate_live_config_shape(config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if config.get("default_run_agent") != "codex-build-captain":
        errors.append("live config default_run_agent must be codex-build-captain")
    if config.get("model_fallback") is not True:
        errors.append("live config model_fallback must be true")
    if config.get("mcp_env_allowlist") != []:
        errors.append("live config mcp_env_allowlist must remain empty")
    if not isinstance(config.get("disabled_commands"), list):
        errors.append("live config disabled_commands must be a list")
    agents = config.get("agents")
    if not isinstance(agents, dict):
        errors.append("live config agents must be an object")
    else:
        if not isinstance(agents.get("build"), dict):
            errors.append("live config agents.build must be an object")
        if not isinstance(agents.get("oracle"), dict):
            errors.append("live config agents.oracle must be an object")
    return errors


def build_read_only_load_check(
    packet: dict[str, Any],
    destination_label: str | None,
    root: Path,
    config_path: Path | None = None,
    apply_plan: dict[str, Any] | None = None,
) -> dict[str, Any]:
    blockers: list[str] = []
    warnings: list[str] = []
    checks: dict[str, Any] = {}

    packet_errors = validate_packet(packet)
    checks["packet_valid"] = not packet_errors
    if packet_errors:
        blockers.extend(f"packet: {error}" for error in packet_errors)

    if config_path is not None:
        target = config_path.expanduser()
        if not target.is_absolute():
            target = root / target
        resolved_label = destination_label or "explicit_config_path"
    elif destination_label:
        resolved_label = destination_label
        try:
            target = resolve_destination(packet, destination_label, root)
        except ValueError as exc:
            target = None
            blockers.append(str(exc))
    else:
        target = None
        resolved_label = None
        blockers.append("--read-only-load-check requires --destination-label or --config-path")

    loaded_config: dict[str, Any] | None = None
    raw_sha: str | None = None
    if target is None:
        checks["target_exists"] = False
    elif not target.exists():
        checks["target_exists"] = False
        blockers.append(f"config file does not exist at {target}")
    else:
        checks["target_exists"] = True
        try:
            loaded_config = load_packet(target)
            raw_sha = hashlib.sha256(target.read_bytes()).hexdigest()
        except (json.JSONDecodeError, ValueError) as exc:
            blockers.append(f"config file is not valid JSON object: {exc}")

    expected_config = packet.get("config_draft")
    expected_sha = hashlib.sha256(stable_json_bytes(expected_config)).hexdigest() if isinstance(expected_config, dict) else None
    plan_sha = apply_plan.get("config_sha256") if isinstance(apply_plan, dict) else None
    if plan_sha and expected_sha and plan_sha != expected_sha:
        blockers.append("apply plan config_sha256 does not match packet config draft")

    models: set[str] = set()
    missing_models: list[str] = list(REQUIRED_MODEL_ALIASES)
    missing_disabled: list[str] = []
    loaded_stable_sha: str | None = None
    if loaded_config is not None:
        shape_errors = validate_live_config_shape(loaded_config)
        checks["config_shape_ok"] = not shape_errors
        blockers.extend(shape_errors)

        loaded_stable_sha = hashlib.sha256(stable_json_bytes(loaded_config)).hexdigest()
        checks["config_matches_packet"] = loaded_config == expected_config
        checks["config_stable_sha_matches_packet"] = loaded_stable_sha == expected_sha
        if loaded_config != expected_config:
            blockers.append("loaded config JSON does not exactly match packet config_draft")
        if loaded_stable_sha != expected_sha:
            blockers.append("loaded config stable sha does not match packet config_draft")

        models = _config_models({"config_draft": loaded_config})
        missing_models = [model for model in REQUIRED_MODEL_ALIASES if model not in models]
        checks["required_models_present"] = not missing_models
        checks["codex_local_build_model_present"] = "codex-local" in models
        if "codex-local" not in models:
            blockers.append("loaded config missing codex-local build model")
        if missing_models:
            blockers.append(f"loaded config missing required models: {', '.join(missing_models)}")

        disabled_commands = set(loaded_config.get("disabled_commands", []))
        required_disabled = {
            "init-deep",
            "ralph-loop",
            "ulw-loop",
            "cancel-ralph",
            "refactor",
            "start-work",
            "stop-continuation",
            "remove-ai-slops",
            "hyperplan",
        }
        missing_disabled = sorted(required_disabled - disabled_commands)
        checks["risky_commands_disabled"] = not missing_disabled
        if missing_disabled:
            blockers.append(f"loaded config missing disabled risky commands: {', '.join(missing_disabled)}")
    else:
        checks["config_shape_ok"] = False
        checks["config_matches_packet"] = False
        checks["config_stable_sha_matches_packet"] = False
        checks["required_models_present"] = False
        checks["codex_local_build_model_present"] = False
        checks["risky_commands_disabled"] = False

    return {
        "schema": "ghostclaw.ohmycodex.read_only_load_check.v1",
        "status": "load_check_passed_no_runtime_start" if not blockers else "not_ready",
        "created_at": now_iso(),
        "destination_label": resolved_label,
        "target_path": str(target) if target else None,
        "target_sha256": raw_sha,
        "config_stable_sha256": loaded_stable_sha,
        "expected_config_sha256": expected_sha,
        "apply_plan_config_sha256": plan_sha,
        "checks": checks,
        "required_model_aliases": list(REQUIRED_MODEL_ALIASES),
        "config_models_found": sorted(models),
        "missing_required_models": missing_models,
        "missing_disabled_commands": missing_disabled,
        "write_live_config": False,
        "opencode_started": False,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
        "blockers": blockers,
        "warnings": warnings,
        "next_gate": "OpenCode runtime check only after exact config write gate and read-only load check pass",
    }


def build_live_config_smoke_report(
    packet: dict[str, Any],
    destination_label: str,
    root: Path,
    apply_plan: dict[str, Any] | None = None,
) -> dict[str, Any]:
    blockers: list[str] = []
    warnings: list[str] = []
    checks: dict[str, Any] = {}

    packet_errors = validate_packet(packet)
    checks["packet_valid"] = not packet_errors
    if packet_errors:
        blockers.extend(f"packet: {error}" for error in packet_errors)

    try:
        target = resolve_destination(packet, destination_label, root)
    except ValueError as exc:
        target = None
        blockers.append(str(exc))

    live_config: dict[str, Any] | None = None
    live_sha: str | None = None
    if target is None:
        checks["target_exists"] = False
    elif not target.exists():
        checks["target_exists"] = False
        blockers.append(f"live config does not exist at {target}")
    else:
        checks["target_exists"] = True
        try:
            live_config = load_packet(target)
            live_sha = hashlib.sha256(target.read_bytes()).hexdigest()
        except (json.JSONDecodeError, ValueError) as exc:
            blockers.append(f"live config is not valid JSON object: {exc}")

    expected_config = packet.get("config_draft")
    expected_sha = hashlib.sha256(stable_json_bytes(expected_config)).hexdigest() if isinstance(expected_config, dict) else None
    plan_sha = apply_plan.get("config_sha256") if isinstance(apply_plan, dict) else None
    if plan_sha and expected_sha and plan_sha != expected_sha:
        blockers.append("apply plan config_sha256 does not match packet config draft")

    if live_config is not None:
        shape_errors = validate_live_config_shape(live_config)
        checks["live_config_shape_ok"] = not shape_errors
        blockers.extend(shape_errors)

        live_stable_sha = hashlib.sha256(stable_json_bytes(live_config)).hexdigest()
        checks["live_config_matches_packet"] = live_config == expected_config
        checks["live_config_stable_sha_matches_packet"] = live_stable_sha == expected_sha
        if live_config != expected_config:
            blockers.append("live config JSON does not exactly match packet config_draft")
        if live_stable_sha != expected_sha:
            blockers.append("live config stable sha does not match packet config_draft")

        models = set()
        fake_packet = {"config_draft": live_config}
        models = _config_models(fake_packet)
        missing_models = [model for model in REQUIRED_MODEL_ALIASES if model not in models]
        checks["required_models_present"] = not missing_models
        if "codex-local" not in models:
            blockers.append("live config missing codex-local build model")
        if missing_models:
            blockers.append(f"live config missing required models: {', '.join(missing_models)}")

        disabled_commands = set(live_config.get("disabled_commands", []))
        required_disabled = {
            "init-deep",
            "ralph-loop",
            "ulw-loop",
            "cancel-ralph",
            "refactor",
            "start-work",
            "stop-continuation",
            "remove-ai-slops",
            "hyperplan",
        }
        missing_disabled = sorted(required_disabled - disabled_commands)
        checks["risky_commands_disabled"] = not missing_disabled
        if missing_disabled:
            blockers.append(f"live config missing disabled risky commands: {', '.join(missing_disabled)}")
    else:
        checks["live_config_shape_ok"] = False
        checks["live_config_matches_packet"] = False
        checks["live_config_stable_sha_matches_packet"] = False
        checks["required_models_present"] = False
        checks["risky_commands_disabled"] = False

    return {
        "schema": "ghostclaw.ohmycodex.live_config_smoke.v1",
        "status": "smoke_passed_no_provider_call" if not blockers else "not_ready",
        "created_at": now_iso(),
        "destination_label": destination_label,
        "target_path": str(target) if target else None,
        "target_sha256": live_sha,
        "expected_config_sha256": expected_sha,
        "apply_plan_config_sha256": plan_sha,
        "checks": checks,
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
        "blockers": blockers,
        "warnings": warnings,
    }


def build_activation_status(
    packet: dict[str, Any],
    destination_label: str,
    root: Path,
    apply_plan: dict[str, Any],
) -> dict[str, Any]:
    plan = build_apply_plan(
        packet,
        destination_label,
        root,
        root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
    )
    gate = plan.get("approval_env")
    target_path = plan.get("target_path")
    target = Path(target_path) if target_path else None
    smoke = build_live_config_smoke_report(packet, destination_label, root, apply_plan)
    return {
        "schema": "ghostclaw.ohmycodex.activation_status.v1",
        "status": "ready_for_activation_gate" if plan.get("ok") else "not_ready",
        "created_at": now_iso(),
        "destination_label": destination_label,
        "target_path": target_path,
        "target_exists": target.exists() if target else False,
        "approval_env": gate,
        "approval_env_set": os.environ.get(str(gate)) == "1" if gate else False,
        "apply_plan_ok": bool(plan.get("ok")),
        "smoke_status": smoke["status"],
        "smoke_blockers": smoke["blockers"],
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
        "next_actions": [
            f"Set {gate}=1 only for the selected destination" if gate else "Fix apply plan before activation",
            "Run --activate with the same destination label",
            "Verify smoke status becomes smoke_passed_no_provider_call",
            "Only then perform an OpenCode read-only load check",
        ],
    }


def activate_with_gate(
    packet: dict[str, Any],
    destination_label: str,
    root: Path,
    rollback_dir: Path,
) -> dict[str, Any]:
    apply_result = write_config_with_gate(packet, destination_label, root, rollback_dir)
    smoke = build_live_config_smoke_report(packet, destination_label, root, {
        "schema": "ghostclaw.ohmycodex.config_apply_plan.v1",
        "ok": True,
        "config_sha256": apply_result.get("config_sha256"),
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
    })
    ok = smoke["status"] == "smoke_passed_no_provider_call"
    return {
        "schema": "ghostclaw.ohmycodex.activation_result.v1",
        "status": "activated_smoke_passed_no_provider_call" if ok else "activated_smoke_failed",
        "created_at": now_iso(),
        "destination_label": destination_label,
        "target_path": apply_result.get("target_path"),
        "backup_path": apply_result.get("backup_path"),
        "config_sha256": apply_result.get("config_sha256"),
        "smoke": smoke,
        "write_live_config": True,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
    }


def activation_dry_run(
    packet: dict[str, Any],
    destination_label: str,
    root: Path,
    sandbox_root: Path | None = None,
) -> dict[str, Any]:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    sandbox = sandbox_root or (root / ".ghostclaw_runtime" / "a2a2a" / "sandboxes" / f"ohmycodex_activation_{stamp}")
    sandbox.mkdir(parents=True, exist_ok=True)

    target = resolve_destination(packet, destination_label, sandbox)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(stable_json_bytes(packet["config_draft"]))

    apply_plan = build_apply_plan(
        packet,
        destination_label,
        sandbox,
        sandbox / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
    )
    smoke = build_live_config_smoke_report(packet, destination_label, sandbox, apply_plan)
    ok = smoke["status"] == "smoke_passed_no_provider_call"
    return {
        "schema": "ghostclaw.ohmycodex.activation_dry_run.v1",
        "status": "dry_run_smoke_passed_no_provider_call" if ok else "dry_run_smoke_failed",
        "created_at": now_iso(),
        "destination_label": destination_label,
        "sandbox_root": str(sandbox),
        "sandbox_target_path": str(target),
        "config_sha256": apply_plan.get("config_sha256"),
        "smoke": smoke,
        "write_live_config": False,
        "sandbox_write_only": True,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
    }


def build_activation_handoff(
    packet: dict[str, Any],
    packet_path: Path,
    destination_label: str,
    root: Path,
    apply_plan: dict[str, Any] | None = None,
    apply_plan_path: Path | None = None,
) -> dict[str, Any]:
    plan = apply_plan or build_apply_plan(
        packet,
        destination_label,
        root,
        root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
    )
    blockers: list[str] = []
    if plan.get("schema") != "ghostclaw.ohmycodex.config_apply_plan.v1":
        blockers.append("apply plan schema must be ghostclaw.ohmycodex.config_apply_plan.v1")
    if plan.get("ok") is not True:
        blockers.extend(plan.get("errors", ["apply plan is not ok"]))
    if plan.get("write_live_config") is not False:
        blockers.append("apply plan must be non-writing")
    if plan.get("provider_model_call") is not False:
        blockers.append("apply plan must not require provider calls")
    if plan.get("secret_access") is not False:
        blockers.append("apply plan must not require secret access")

    gate = plan.get("approval_env")
    target_path = plan.get("target_path")
    target = Path(target_path) if isinstance(target_path, str) else None
    activation_receipt = (
        root
        / ".ghostclaw_runtime"
        / "a2a2a"
        / "receipts"
        / f"ohmycodex_activation_{destination_label}.json"
    )
    live_load_receipt = (
        root
        / ".ghostclaw_runtime"
        / "a2a2a"
        / "receipts"
        / f"ohmycodex_read_only_load_check_live_{destination_label}.json"
    )
    smoke_receipt = (
        root
        / ".ghostclaw_runtime"
        / "a2a2a"
        / "receipts"
        / f"ohmycodex_live_config_smoke_{destination_label}.json"
    )

    packet_arg = str(packet_path)
    plan_arg = str(apply_plan_path) if apply_plan_path else None
    activation_argv = [
        "python3",
        "scripts/ghostclaw_ohmycodex_config_packet.py",
        "--packet",
        packet_arg,
        "--destination-label",
        destination_label,
        "--activate",
        "--store-activation-result",
        str(activation_receipt),
    ]
    smoke_argv = [
        "python3",
        "scripts/ghostclaw_ohmycodex_config_packet.py",
        "--packet",
        packet_arg,
        "--destination-label",
        destination_label,
        "--smoke-live-config",
        "--store-smoke-report",
        str(smoke_receipt),
    ]
    load_check_argv = [
        "python3",
        "scripts/ghostclaw_ohmycodex_config_packet.py",
        "--packet",
        packet_arg,
        "--destination-label",
        destination_label,
        "--read-only-load-check",
        "--store-load-check-result",
        str(live_load_receipt),
    ]
    if plan_arg:
        smoke_argv[6:6] = ["--apply-plan-path", plan_arg]
        load_check_argv[6:6] = ["--apply-plan-path", plan_arg]

    return {
        "schema": "ghostclaw.ohmycodex.activation_handoff.v1",
        "status": "ready_for_exact_gate" if not blockers else "not_ready",
        "created_at": now_iso(),
        "destination_label": destination_label,
        "target_path": target_path,
        "target_exists": target.exists() if target else False,
        "approval_env": gate,
        "approval_env_required_value": "1",
        "approval_env_set": os.environ.get(str(gate)) == "1" if gate else False,
        "config_sha256": plan.get("config_sha256"),
        "rollback_path": plan.get("rollback_path"),
        "rollback_backup_if_target_exists": True,
        "packet_path": str(packet_path),
        "apply_plan_path": str(apply_plan_path) if apply_plan_path else None,
        "commands": [
            {
                "name": "activate_selected_config",
                "env": {str(gate): "1"} if gate else {},
                "argv": activation_argv,
                "writes_live_config": True,
                "provider_model_call": False,
                "secret_access": False,
            },
            {
                "name": "post_activation_smoke",
                "env": {},
                "argv": smoke_argv,
                "writes_live_config": False,
                "provider_model_call": False,
                "secret_access": False,
            },
            {
                "name": "post_activation_read_only_load_check",
                "env": {},
                "argv": load_check_argv,
                "writes_live_config": False,
                "opencode_started": False,
                "provider_model_call": False,
                "secret_access": False,
            },
        ],
        "receipts_expected": {
            "activation": str(activation_receipt),
            "smoke": str(smoke_receipt),
            "read_only_load_check": str(live_load_receipt),
        },
        "preflight_required": [
            "confirm project_canonical is the selected destination",
            "confirm no existing config should be preserved beyond rollback backup",
            "set exact approval env for one command invocation only",
            "run activation command from repo root",
        ],
        "blocked_actions": [
            "provider_model_call",
            "api_key_read",
            "env_secret_read",
            "plugin_install",
            "dependency_install",
            "push",
            "deploy",
            "production_action",
        ],
        "blockers": blockers,
    }


def _load_receipt(path: Path | None) -> dict[str, Any] | None:
    if path is None or not path.exists():
        return None
    return load_packet(path)


def _requirement(name: str, status: str, evidence: str | None, detail: str) -> dict[str, Any]:
    return {
        "name": name,
        "status": status,
        "evidence": evidence,
        "detail": detail,
    }


def build_goal_completion_audit(
    packet: dict[str, Any],
    destination_label: str,
    root: Path,
    readiness_path: Path | None = None,
    handoff_path: Path | None = None,
    activation_path: Path | None = None,
    smoke_path: Path | None = None,
    load_check_path: Path | None = None,
) -> dict[str, Any]:
    requirements: list[dict[str, Any]] = []
    blockers: list[str] = []

    packet_errors = validate_packet(packet)
    config = packet.get("config_draft", {})
    models = _config_models(packet)
    required_models = set(REQUIRED_MODEL_ALIASES) | {"codex-local"}
    missing_models = sorted(required_models - models)
    if packet_errors or missing_models:
        detail = "; ".join(packet_errors + [f"missing models: {', '.join(missing_models)}"] if missing_models else packet_errors)
        requirements.append(_requirement("config_packet_contains_required_models", "incomplete", None, detail))
        blockers.append("config packet does not prove all requested models")
    else:
        requirements.append(
            _requirement(
                "config_packet_contains_required_models",
                "complete",
                "config_packet",
                "packet includes codex-local, GLM 5.2, DeepSeek V4 Pro, Kimi K2.7 Code, and GPT-5.5 aliases",
            )
        )

    agent_order = config.get("agent_order", []) if isinstance(config, dict) else []
    agents = config.get("agents", {}) if isinstance(config, dict) else {}
    hermes_present = "hermes-commander" in agent_order
    codex_present = config.get("default_run_agent") == "codex-build-captain" and "codex-build-captain" in agent_order
    build_agent = agents.get("build", {}) if isinstance(agents, dict) else {}
    oracle_agent = agents.get("oracle", {}) if isinstance(agents, dict) else {}
    if hermes_present and codex_present and build_agent.get("model") == "codex-local" and oracle_agent.get("model") == "gpt-5.5":
        requirements.append(
            _requirement(
                "hermes_codex_team_routing_declared",
                "complete",
                "config_packet",
                "Hermes is in agent_order, Codex is default build captain, GPT-5.5 is oracle/final gate",
            )
        )
    else:
        requirements.append(
            _requirement(
                "hermes_codex_team_routing_declared",
                "incomplete",
                "config_packet",
                "Hermes/Codex/GPT final gate route is not fully declared in config draft",
            )
        )
        blockers.append("Hermes/Codex route is incomplete")

    readiness = _load_receipt(readiness_path)
    if readiness and readiness.get("status") == "ready_for_review_no_execution":
        requirements.append(_requirement("team_readiness_receipt_passed", "complete", str(readiness_path), "readiness receipt is review-ready"))
    else:
        requirements.append(_requirement("team_readiness_receipt_passed", "missing", str(readiness_path) if readiness_path else None, "readiness receipt missing or not ready"))
        blockers.append("readiness receipt missing or not ready")

    handoff = _load_receipt(handoff_path)
    if handoff and handoff.get("status") == "ready_for_exact_gate":
        requirements.append(_requirement("activation_handoff_ready", "complete", str(handoff_path), "handoff records exact env gate and post-write checks"))
    else:
        requirements.append(_requirement("activation_handoff_ready", "missing", str(handoff_path) if handoff_path else None, "handoff receipt missing or not ready"))
        blockers.append("activation handoff missing or not ready")

    try:
        target = resolve_destination(packet, destination_label, root)
    except ValueError as exc:
        target = None
        requirements.append(_requirement("live_ohmycodex_config_written", "missing", None, str(exc)))
        blockers.append("live config destination cannot be resolved")

    live_config_exact = False
    if target is not None and target.exists():
        try:
            live_config = load_packet(target)
            live_config_exact = live_config == config
        except (json.JSONDecodeError, ValueError):
            live_config_exact = False
        requirements.append(
            _requirement(
                "live_ohmycodex_config_written",
                "complete" if live_config_exact else "incomplete",
                str(target),
                "live config exists and matches packet" if live_config_exact else "live config exists but does not match packet",
            )
        )
        if not live_config_exact:
            blockers.append("live config exists but does not match packet")
    elif target is not None:
        requirements.append(
            _requirement(
                "live_ohmycodex_config_written",
                "missing",
                str(target),
                "selected live OhMyCodex config file does not exist yet",
            )
        )
        blockers.append("live OhMyCodex config has not been written")

    activation = _load_receipt(activation_path)
    activation_ok = activation and activation.get("status") == "activated_smoke_passed_no_provider_call"
    requirements.append(
        _requirement(
            "activation_receipt_passed",
            "complete" if activation_ok else "missing",
            str(activation_path) if activation_path else None,
            "activation receipt passed" if activation_ok else "activation receipt missing or not passed",
        )
    )
    if not activation_ok:
        blockers.append("activation receipt missing or not passed")

    smoke = _load_receipt(smoke_path)
    smoke_ok = smoke and smoke.get("status") == "smoke_passed_no_provider_call"
    requirements.append(
        _requirement(
            "live_smoke_receipt_passed",
            "complete" if smoke_ok else "missing",
            str(smoke_path) if smoke_path else None,
            "live smoke receipt passed" if smoke_ok else "live smoke receipt missing or not passed",
        )
    )
    if not smoke_ok:
        blockers.append("live smoke receipt missing or not passed")

    load_check = _load_receipt(load_check_path)
    load_check_ok = load_check and load_check.get("status") == "load_check_passed_no_runtime_start"
    requirements.append(
        _requirement(
            "live_read_only_load_check_passed",
            "complete" if load_check_ok else "missing",
            str(load_check_path) if load_check_path else None,
            "live read-only load check passed" if load_check_ok else "live read-only load check missing or not passed",
        )
    )
    if not load_check_ok:
        blockers.append("live read-only load check missing or not passed")

    forbidden_side_effects = []
    for name, receipt in (("activation", activation), ("smoke", smoke), ("load_check", load_check)):
        if not isinstance(receipt, dict):
            continue
        if receipt.get("provider_model_call") is True:
            forbidden_side_effects.append(f"{name}: provider_model_call=true")
        if receipt.get("secret_access") is True:
            forbidden_side_effects.append(f"{name}: secret_access=true")
        if receipt.get("push") is True:
            forbidden_side_effects.append(f"{name}: push=true")
        if receipt.get("deploy") is True:
            forbidden_side_effects.append(f"{name}: deploy=true")
    if forbidden_side_effects:
        requirements.append(_requirement("forbidden_side_effects_absent", "incomplete", None, "; ".join(forbidden_side_effects)))
        blockers.append("forbidden side effects detected")
    else:
        requirements.append(_requirement("forbidden_side_effects_absent", "complete", None, "no provider call, secret access, push, or deploy is recorded in supplied receipts"))

    complete = not blockers
    return {
        "schema": "ghostclaw.ohmycodex.goal_completion_audit.v1",
        "status": "complete" if complete else "not_complete",
        "created_at": now_iso(),
        "objective": "agent team config glm 5.2 and deepseek v4 pro kimi code 2.7 gpt 5.5 model to hermes and codex with ohmycodex",
        "destination_label": destination_label,
        "target_path": str(target) if target else None,
        "requirements": requirements,
        "blockers": blockers,
        "next_gate": "APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1" if not complete else None,
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
    }


def activate_and_verify_with_gate(
    packet: dict[str, Any],
    packet_path: Path,
    destination_label: str,
    root: Path,
    rollback_dir: Path,
    readiness_path: Path | None,
    handoff_path: Path | None,
    receipt_dir: Path,
) -> dict[str, Any]:
    receipt_dir.mkdir(parents=True, exist_ok=True)
    activation_path = receipt_dir / f"ohmycodex_activation_{destination_label}.json"
    smoke_path = receipt_dir / f"ohmycodex_live_config_smoke_{destination_label}.json"
    load_check_path = receipt_dir / f"ohmycodex_read_only_load_check_live_{destination_label}.json"
    goal_audit_path = receipt_dir / f"ohmycodex_goal_completion_audit_{destination_label}.json"

    activation = activate_with_gate(packet, destination_label, root, rollback_dir)
    write_json(activation_path, activation)

    apply_plan = {
        "schema": "ghostclaw.ohmycodex.config_apply_plan.v1",
        "ok": True,
        "config_sha256": activation.get("config_sha256"),
        "write_live_config": False,
        "provider_model_call": False,
        "secret_access": False,
    }
    smoke = build_live_config_smoke_report(packet, destination_label, root, apply_plan)
    write_json(smoke_path, smoke)

    load_check = build_read_only_load_check(packet, destination_label, root, None, apply_plan)
    write_json(load_check_path, load_check)

    goal_audit = build_goal_completion_audit(
        packet,
        destination_label,
        root,
        readiness_path,
        handoff_path,
        activation_path,
        smoke_path,
        load_check_path,
    )
    write_json(goal_audit_path, goal_audit)

    complete = goal_audit.get("status") == "complete"
    return {
        "schema": "ghostclaw.ohmycodex.activate_and_verify.v1",
        "status": "complete" if complete else "activated_but_not_complete",
        "created_at": now_iso(),
        "destination_label": destination_label,
        "packet_path": str(packet_path),
        "target_path": activation.get("target_path"),
        "config_sha256": activation.get("config_sha256"),
        "receipts": {
            "activation": str(activation_path),
            "smoke": str(smoke_path),
            "read_only_load_check": str(load_check_path),
            "goal_audit": str(goal_audit_path),
        },
        "activation_status": activation.get("status"),
        "smoke_status": smoke.get("status"),
        "load_check_status": load_check.get("status"),
        "goal_audit_status": goal_audit.get("status"),
        "goal_audit_blockers": goal_audit.get("blockers", []),
        "write_live_config": True,
        "opencode_started": False,
        "provider_model_call": False,
        "secret_access": False,
        "push": False,
        "deploy": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--packet",
        type=Path,
        default=Path(".ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json"),
        help="Path to the non-executing OhMyCodex config packet.",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Print the config preview if validation passes.",
    )
    parser.add_argument(
        "--destination-label",
        help="Candidate destination label from the packet, for example project_canonical.",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Project root used to resolve relative destination paths.",
    )
    parser.add_argument(
        "--rollback-dir",
        type=Path,
        default=Path(".ghostclaw_runtime/a2a2a/rollback/ohmycodex"),
        help="Directory for future write-mode rollback snapshots.",
    )
    parser.add_argument(
        "--apply-plan",
        action="store_true",
        help="Print the destination-specific apply plan without writing config.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write config only when the exact approval env var is set.",
    )
    parser.add_argument(
        "--dispatch-review",
        action="store_true",
        help="Write probe-only A2A review tasks into target inboxes.",
    )
    parser.add_argument(
        "--targets",
        nargs="+",
        default=list(DEFAULT_REVIEW_TARGETS),
        help="Review inbox targets for --dispatch-review.",
    )
    parser.add_argument(
        "--apply-plan-path",
        type=Path,
        help="Optional existing apply-plan JSON evidence for --dispatch-review.",
    )
    parser.add_argument(
        "--alias-manifest",
        type=Path,
        default=Path(".ghostclaw_runtime/model_router/ohmycodex_model_aliases_20260630T100425Z.json"),
        help="Model alias manifest used by --readiness-report.",
    )
    parser.add_argument(
        "--readiness-report",
        action="store_true",
        help="Print a non-executing readiness report for the OhMyCodex team config.",
    )
    parser.add_argument(
        "--store-readiness-report",
        type=Path,
        help="Optional path to store the readiness report JSON.",
    )
    parser.add_argument(
        "--smoke-live-config",
        action="store_true",
        help="Validate a selected live config file without starting OpenCode or calling providers.",
    )
    parser.add_argument(
        "--store-smoke-report",
        type=Path,
        help="Optional path to store the live config smoke report JSON.",
    )
    parser.add_argument(
        "--read-only-load-check",
        action="store_true",
        help="Load and verify a config file without starting OpenCode or calling providers.",
    )
    parser.add_argument(
        "--config-path",
        type=Path,
        help="Optional explicit config path for --read-only-load-check.",
    )
    parser.add_argument(
        "--store-load-check-result",
        type=Path,
        help="Optional path to store the read-only load check JSON.",
    )
    parser.add_argument(
        "--activation-status",
        action="store_true",
        help="Print gate-bound activation status without writing config.",
    )
    parser.add_argument(
        "--activate",
        action="store_true",
        help="Write live config only when the exact approval env var is set, then run smoke verification.",
    )
    parser.add_argument(
        "--activate-and-verify",
        action="store_true",
        help="Write live config behind the exact gate, then store activation, smoke, load-check, and goal-audit receipts.",
    )
    parser.add_argument(
        "--activation-dry-run",
        action="store_true",
        help="Write config into an isolated runtime sandbox and run smoke verification without touching live config.",
    )
    parser.add_argument(
        "--activation-handoff",
        action="store_true",
        help="Emit exact-gate activation handoff instructions without writing config.",
    )
    parser.add_argument(
        "--sandbox-root",
        type=Path,
        help="Optional sandbox root for --activation-dry-run.",
    )
    parser.add_argument(
        "--store-activation-result",
        type=Path,
        help="Optional path to store activation status/result JSON.",
    )
    parser.add_argument(
        "--store-activation-handoff",
        type=Path,
        help="Optional path to store activation handoff JSON.",
    )
    parser.add_argument(
        "--goal-completion-audit",
        action="store_true",
        help="Audit objective completion evidence without writing config or calling providers.",
    )
    parser.add_argument(
        "--readiness-path",
        type=Path,
        help="Optional readiness receipt path for --goal-completion-audit.",
    )
    parser.add_argument(
        "--handoff-path",
        type=Path,
        help="Optional activation handoff receipt path for --goal-completion-audit.",
    )
    parser.add_argument(
        "--activation-path",
        type=Path,
        help="Optional activation receipt path for --goal-completion-audit.",
    )
    parser.add_argument(
        "--smoke-path",
        type=Path,
        help="Optional live smoke receipt path for --goal-completion-audit.",
    )
    parser.add_argument(
        "--load-check-path",
        type=Path,
        help="Optional live read-only load-check receipt path for --goal-completion-audit.",
    )
    parser.add_argument(
        "--store-goal-audit",
        type=Path,
        help="Optional path to store goal completion audit JSON.",
    )
    parser.add_argument(
        "--verify-receipt-dir",
        type=Path,
        default=Path(".ghostclaw_runtime/a2a2a/receipts"),
        help="Receipt directory for --activate-and-verify outputs.",
    )
    parser.add_argument(
        "--store-activate-and-verify-result",
        type=Path,
        help="Optional path to store activate-and-verify aggregate JSON.",
    )
    args = parser.parse_args()

    packet = load_packet(args.packet)
    root = args.root.resolve()
    rollback_dir = args.rollback_dir
    if not rollback_dir.is_absolute():
        rollback_dir = root / rollback_dir

    if args.write:
        if not args.destination_label:
            raise SystemExit("--write requires --destination-label")
        result = write_config_with_gate(packet, args.destination_label, root, rollback_dir)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    if args.activation_status:
        if not args.destination_label:
            raise SystemExit("--activation-status requires --destination-label")
        apply_plan_path = args.apply_plan_path
        if apply_plan_path and not apply_plan_path.is_absolute():
            apply_plan_path = root / apply_plan_path
        apply_plan = load_optional_json(apply_plan_path) if apply_plan_path else build_apply_plan(
            packet, args.destination_label, root, rollback_dir
        )
        result = build_activation_status(packet, args.destination_label, root, apply_plan)
        if args.store_activation_result:
            result_path = args.store_activation_result
            if not result_path.is_absolute():
                result_path = root / result_path
            write_json(result_path, result)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "ready_for_activation_gate" else 1

    if args.activate:
        if not args.destination_label:
            raise SystemExit("--activate requires --destination-label")
        result = activate_with_gate(packet, args.destination_label, root, rollback_dir)
        if args.store_activation_result:
            result_path = args.store_activation_result
            if not result_path.is_absolute():
                result_path = root / result_path
            write_json(result_path, result)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "activated_smoke_passed_no_provider_call" else 1

    if args.activate_and_verify:
        if not args.destination_label:
            raise SystemExit("--activate-and-verify requires --destination-label")

        def resolve_optional(path: Path | None) -> Path | None:
            if path is None:
                return None
            return path if path.is_absolute() else root / path

        receipt_dir = args.verify_receipt_dir
        if not receipt_dir.is_absolute():
            receipt_dir = root / receipt_dir
        result = activate_and_verify_with_gate(
            packet,
            args.packet,
            args.destination_label,
            root,
            rollback_dir,
            resolve_optional(args.readiness_path),
            resolve_optional(args.handoff_path),
            receipt_dir,
        )
        if args.store_activate_and_verify_result:
            result_path = args.store_activate_and_verify_result
            if not result_path.is_absolute():
                result_path = root / result_path
            write_json(result_path, result)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "complete" else 1

    if args.activation_dry_run:
        if not args.destination_label:
            raise SystemExit("--activation-dry-run requires --destination-label")
        sandbox_root = args.sandbox_root
        if sandbox_root and not sandbox_root.is_absolute():
            sandbox_root = root / sandbox_root
        result = activation_dry_run(packet, args.destination_label, root, sandbox_root)
        if args.store_activation_result:
            result_path = args.store_activation_result
            if not result_path.is_absolute():
                result_path = root / result_path
            write_json(result_path, result)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "dry_run_smoke_passed_no_provider_call" else 1

    if args.activation_handoff:
        if not args.destination_label:
            raise SystemExit("--activation-handoff requires --destination-label")
        apply_plan_path = args.apply_plan_path
        if apply_plan_path and not apply_plan_path.is_absolute():
            apply_plan_path = root / apply_plan_path
        apply_plan = load_optional_json(apply_plan_path) if apply_plan_path else None
        result = build_activation_handoff(
            packet,
            args.packet,
            args.destination_label,
            root,
            apply_plan,
            apply_plan_path if apply_plan else None,
        )
        if args.store_activation_handoff:
            handoff_path = args.store_activation_handoff
            if not handoff_path.is_absolute():
                handoff_path = root / handoff_path
            write_json(handoff_path, result)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "ready_for_exact_gate" else 1

    if args.goal_completion_audit:
        if not args.destination_label:
            raise SystemExit("--goal-completion-audit requires --destination-label")

        def resolve_optional(path: Path | None) -> Path | None:
            if path is None:
                return None
            return path if path.is_absolute() else root / path

        result = build_goal_completion_audit(
            packet,
            args.destination_label,
            root,
            resolve_optional(args.readiness_path),
            resolve_optional(args.handoff_path),
            resolve_optional(args.activation_path),
            resolve_optional(args.smoke_path),
            resolve_optional(args.load_check_path),
        )
        if args.store_goal_audit:
            audit_path = args.store_goal_audit
            if not audit_path.is_absolute():
                audit_path = root / audit_path
            write_json(audit_path, result)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "complete" else 1

    if args.dispatch_review:
        if args.apply_plan_path:
            apply_plan_path = args.apply_plan_path
            if not apply_plan_path.is_absolute():
                apply_plan_path = root / apply_plan_path
            apply_plan = load_packet(apply_plan_path)
        else:
            if not args.destination_label:
                raise SystemExit("--dispatch-review requires --destination-label or --apply-plan-path")
            apply_plan_path = None
            apply_plan = build_apply_plan(packet, args.destination_label, root, rollback_dir)
        result = dispatch_review_tasks(packet, args.packet, apply_plan, apply_plan_path, root, args.targets)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["ok"] else 1

    if args.readiness_report:
        alias_manifest_path = args.alias_manifest
        if not alias_manifest_path.is_absolute():
            alias_manifest_path = root / alias_manifest_path
        alias_manifest = load_optional_json(alias_manifest_path)
        apply_plan_path = args.apply_plan_path
        if apply_plan_path and not apply_plan_path.is_absolute():
            apply_plan_path = root / apply_plan_path
        apply_plan = load_optional_json(apply_plan_path) if apply_plan_path else None
        report = build_readiness_report(
            packet,
            args.packet,
            alias_manifest,
            alias_manifest_path if alias_manifest else None,
            apply_plan,
            apply_plan_path if apply_plan else None,
            root,
            args.targets,
        )
        if args.store_readiness_report:
            report_path = args.store_readiness_report
            if not report_path.is_absolute():
                report_path = root / report_path
            write_json(report_path, report)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0 if report["status"] == "ready_for_review_no_execution" else 1

    if args.smoke_live_config:
        if not args.destination_label:
            raise SystemExit("--smoke-live-config requires --destination-label")
        apply_plan_path = args.apply_plan_path
        if apply_plan_path and not apply_plan_path.is_absolute():
            apply_plan_path = root / apply_plan_path
        apply_plan = load_optional_json(apply_plan_path) if apply_plan_path else None
        report = build_live_config_smoke_report(packet, args.destination_label, root, apply_plan)
        if args.store_smoke_report:
            report_path = args.store_smoke_report
            if not report_path.is_absolute():
                report_path = root / report_path
            write_json(report_path, report)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0 if report["status"] == "smoke_passed_no_provider_call" else 1

    if args.read_only_load_check:
        apply_plan_path = args.apply_plan_path
        if apply_plan_path and not apply_plan_path.is_absolute():
            apply_plan_path = root / apply_plan_path
        apply_plan = load_optional_json(apply_plan_path) if apply_plan_path else None
        config_path = args.config_path
        if config_path and not config_path.is_absolute():
            config_path = root / config_path
        report = build_read_only_load_check(
            packet,
            args.destination_label,
            root,
            config_path,
            apply_plan,
        )
        if args.store_load_check_result:
            result_path = args.store_load_check_result
            if not result_path.is_absolute():
                result_path = root / result_path
            write_json(result_path, report)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0 if report["status"] == "load_check_passed_no_runtime_start" else 1

    if args.apply_plan:
        if not args.destination_label:
            raise SystemExit("--apply-plan requires --destination-label")
        plan = build_apply_plan(packet, args.destination_label, root, rollback_dir)
        print(json.dumps(plan, indent=2, sort_keys=True))
        return 0 if plan["ok"] else 1

    if args.preview:
        preview = build_preview(packet)
        print(json.dumps(preview, indent=2, sort_keys=True))
    else:
        preview = build_preview(packet)
        print(json.dumps({k: preview[k] for k in ("schema", "ok", "errors")}, indent=2, sort_keys=True))

    return 0 if preview["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
