#!/usr/bin/env python3
"""Build a compact GhostClaw knowledge context pack from local registry pointers."""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_ROOT = "/Users/sirinx/sirinx-os"
DEFAULT_INDEX = ".ghostclaw/registry/knowledge-vault-index.v1.yaml"
DEFAULT_PROJECTS = ".ghostclaw/registry/project-registry.v1.yaml"
DEFAULT_ROUTES = ".ghostclaw/registry/route-matrix.v1.yaml"
DEFAULT_DOMAIN_PACKS = ".ghostclaw/registry/domain-pack-index.v1.yaml"
FORBIDDEN_PATH_RE = re.compile(r"(^|/)(\\.env|secrets?|private|credentials?|tokens?)(/|$)", re.I)
TIER_B_CATEGORIES = {"policy", "registry", "project_docs", "runbooks", "specs"}


def clean(value):
    value = str(value or "").strip()
    value = value.split(" #", 1)[0].strip()
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    return value


def parse_scalar(value):
    value = clean(value)
    if value in {">", "|"}:
        return ""
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [clean(part) for part in inner.split(",")]
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False
    return value


def parse_yaml_records(path, id_key):
    """Parse the simple registry YAML shape without third-party dependencies."""
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError:
        return []

    records = []
    current = None
    current_list_key = None
    current_nested = None
    start_re = re.compile(rf"^\s*-\s+{re.escape(id_key)}:\s*(.*?)\s*$")

    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        start = start_re.match(line)
        if start:
            if current:
                records.append(current)
            current = {id_key: parse_scalar(start.group(1))}
            current_list_key = None
            current_nested = None
            continue

        if current is None:
            continue

        list_item = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if list_item and current_list_key:
            raw_item = clean(list_item.group(1))
            nested = re.match(r"^([A-Za-z0-9_]+):\s*(.*?)\s*$", raw_item)
            if nested:
                current_nested = {nested.group(1): parse_scalar(nested.group(2))}
                current.setdefault(current_list_key, []).append(current_nested)
            else:
                current.setdefault(current_list_key, []).append(parse_scalar(raw_item))
                current_nested = None
            continue

        nested_field = re.match(r"^\s{6,}([A-Za-z0-9_]+):(?:\s*(.*?))?\s*$", line)
        if nested_field and current_nested is not None:
            current_nested[nested_field.group(1)] = parse_scalar(nested_field.group(2) or "")
            continue

        field = re.match(r"^\s+([A-Za-z0-9_]+):(?:\s*(.*?))?\s*$", line)
        if field:
            key = field.group(1)
            raw_value = field.group(2) or ""
            if clean(raw_value) == "":
                current.setdefault(key, [])
                current_list_key = key
            else:
                current[key] = parse_scalar(raw_value)
                current_list_key = None
            current_nested = None

    if current:
        records.append(current)
    return records


def as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize_tokens(values):
    tokens = set()
    for value in as_list(values):
        if isinstance(value, dict):
            value = " ".join(str(v) for v in value.values())
        for token in re.split(r"[^A-Za-z0-9_-]+", str(value).lower()):
            if token:
                tokens.add(token)
    return tokens


def safe_rel_path(path):
    normalized = clean(path).replace("\\", "/")
    return normalized.lstrip("/")


def path_is_safe(path):
    normalized = safe_rel_path(path)
    if normalized.startswith("../") or "/../" in normalized:
        return False
    return not FORBIDDEN_PATH_RE.search(normalized)


def category_allowed(category, tier):
    tier = tier.upper()
    if tier == "A":
        return False
    if tier == "B":
        return clean(category).lower() in TIER_B_CATEGORIES
    if tier in {"C", "D"}:
        return True
    return False


def score_entry(entry, project_id, retrieval_keys):
    score = 0
    projects = {str(item).lower() for item in as_list(entry.get("projects"))}
    if project_id.lower() in projects:
        score += 100

    needles = normalize_tokens([project_id, *retrieval_keys])
    haystack = normalize_tokens([
        entry.get("id", ""),
        entry.get("title", ""),
        entry.get("category", ""),
        entry.get("source_path", ""),
        entry.get("tags", []),
        entry.get("summary", ""),
    ])
    score += len(needles & haystack) * 10

    freshness = clean(entry.get("freshness", "")).lower()
    if freshness == "current":
        score += 3
    return score


def compact_record(record, keys):
    return {key: record.get(key) for key in keys if record.get(key) not in (None, "", [])}


def build_context_pack(root, project_id, tier, task_type=None, max_entries=12):
    root_path = Path(root)
    tier = clean(tier).upper()
    if tier not in {"A", "B", "C", "D", "X"}:
        raise ValueError("tier must be one of A, B, C, D, X")

    projects = parse_yaml_records(root_path / DEFAULT_PROJECTS, "id")
    routes = parse_yaml_records(root_path / DEFAULT_ROUTES, "route_id")
    domain_packs = parse_yaml_records(root_path / DEFAULT_DOMAIN_PACKS, "project_id")
    knowledge_entries = parse_yaml_records(root_path / DEFAULT_INDEX, "id")

    project = next((item for item in projects if item.get("id") == project_id), {})
    retrieval_keys = as_list(project.get("retrieval_keys"))
    if not retrieval_keys:
        retrieval_keys = [project_id]

    if not task_type:
        known_routes = as_list(project.get("known_routes"))
        task_type = None
        for route in known_routes:
            if isinstance(route, dict) and route.get("path"):
                task_type = route["path"]
                break
        task_type = task_type or "repo_or_architecture"

    route = next((item for item in routes if item.get("task_type") == task_type), {})
    domain_pack = next((item for item in domain_packs if item.get("project_id") == project_id), {})

    source_pointers = []
    skipped = []
    if tier not in {"X", "A"}:
        for entry in knowledge_entries:
            path = safe_rel_path(entry.get("source_path", ""))
            score = score_entry(entry, project_id, retrieval_keys)
            if score <= 0:
                continue
            if not category_allowed(entry.get("category"), tier):
                skipped.append({"id": entry.get("id"), "reason": "tier_category_filter"})
                continue
            if not path or not path_is_safe(path):
                skipped.append({"id": entry.get("id"), "reason": "unsafe_or_empty_path"})
                continue
            source_pointers.append({
                "id": entry.get("id"),
                "title": entry.get("title"),
                "category": entry.get("category"),
                "source_path": path,
                "format": entry.get("format"),
                "tags": as_list(entry.get("tags")),
                "freshness": entry.get("freshness"),
                "summary": entry.get("summary"),
                "score": score,
                "exists": (root_path / path).exists(),
            })

    source_pointers = sorted(
        source_pointers,
        key=lambda item: (-int(item.get("score") or 0), str(item.get("id") or "")),
    )[:max_entries]

    status = "ok"
    if tier == "X":
        status = "blocked_forbidden_tier"
    elif tier == "D":
        status = "approval_required_tier_d_context_only"

    pack = {
        "status": status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "local_pointer_only_retrieval",
        "project_id": project_id,
        "tier": tier,
        "task_type": task_type,
        "limits": {
            "max_entries": max_entries,
            "full_vault_loaded": False,
            "target_files_read": False,
        },
        "project": compact_record(project, [
            "id",
            "name",
            "canonical_role",
            "priority",
            "status",
            "domain_category",
            "retrieval_keys",
            "constraints",
            "build_order",
            "agent_lanes",
        ]),
        "domain_pack": compact_record(domain_pack, [
            "project_id",
            "canonical_role",
            "priority",
            "core_rules",
            "constraints",
            "build_order",
            "related_files_paths",
        ]),
        "route": compact_record(route, [
            "route_id",
            "task_type",
            "primary_agent",
            "reviewer_agent",
            "architect_agent",
            "validator_agent",
            "tier",
            "constraints",
        ]),
        "retrieval_keys": retrieval_keys,
        "source_pointers": source_pointers,
        "skipped_count": len(skipped),
        "guardrails": [
            "pointer_only_no_target_file_content",
            "no_network_calls",
            "no_secret_paths",
            "bounded_output",
            "no_full_vault_prompt_load",
        ],
    }
    encoded = json.dumps(pack, ensure_ascii=False, separators=(",", ":"))
    pack["bounded"] = {
        "source_pointer_count": len(source_pointers),
        "estimated_json_bytes": len(encoded.encode("utf-8")),
    }
    return pack


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Create a compact GhostClaw knowledge-vault context pack."
    )
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--tier", required=True)
    parser.add_argument("--task-type", default=None)
    parser.add_argument("--max-entries", type=int, default=12)
    parser.add_argument("--output", default=None)
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv or sys.argv[1:])
    pack = build_context_pack(
        root=args.root,
        project_id=args.project_id,
        tier=args.tier,
        task_type=args.task_type,
        max_entries=args.max_entries,
    )
    text = json.dumps(pack, ensure_ascii=False, indent=2)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0 if pack["status"] in {"ok", "approval_required_tier_d_context_only"} else 2


if __name__ == "__main__":
    raise SystemExit(main())
