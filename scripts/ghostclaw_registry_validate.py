#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from datetime import datetime


VALID_AGENT_LANES = {
    "control_plane",
    "primary_builder",
    "qa_review_only",
    "final_gatekeeper",
    "validation",
    "readonly_intake",
    "coordination",
    "architecture",
    "coding_draft_workers",
    "local_uat",
    "creative_prompt_worker",
    "thai_text_qa_worker",
    "repo_mapper_research_worker",
    "defensive_report_worker",
    "model_router_worker",
}

ROUTE_AGENT_FIELDS = (
    "primary_agent",
    "reviewer_agent",
    "architect_agent",
    "validator_agent",
    "smoke_test_agent",
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Validate GhostClaw registry files and directory structure."
    )
    parser.add_argument(
        "--root",
        default="/Users/sirinx/sirinx-os",
        help="Root path of the GhostClaw OS project (default: /Users/sirinx/sirinx-os)",
    )
    return parser.parse_args()


def rel_path(root, *parts):
    return os.path.join(root, *parts)


def check_file_exists(root, *parts):
    path = rel_path(root, *parts)
    exists = os.path.isfile(path)
    return path, exists


def check_dir_exists(root, *parts):
    path = rel_path(root, *parts)
    exists = os.path.isdir(path)
    return path, exists


def count_yaml_entries(path, key="id:"):
    try:
        records = parse_yaml_records(path, key.replace(":", ""))
        if records:
            return len(records)
        with open(path, "r") as f:
            content = f.read()
        return len(re.findall(rf"^\s*-\s+{re.escape(key)}", content, re.MULTILINE))
    except OSError:
        return 0


def count_yaml_items_generic(path):
    return count_yaml_entries(path, key="-")


def validate_yaml_structure(path):
    try:
        with open(path, "r") as f:
            content = f.read()
        if not content.strip():
            return False, None
        if not re.search(r"^\S+:\s*$", content, re.MULTILINE):
            return False, "missing top-level key"
        return True, "stdlib-structure-check"
    except Exception as e:
        return False, str(e)


def validate_json_structure(path):
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return True, data
    except Exception as e:
        return False, str(e)


def clean_yaml_value(value):
    value = str(value or "").strip()
    value = value.split(" #", 1)[0].strip()
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    return value


def parse_yaml_records(path, id_key):
    """Parse the simple registry YAML shape used by GhostClaw without external deps."""
    try:
        with open(path, "r") as f:
            lines = f.read().splitlines()
    except OSError:
        return []

    records = []
    current = None
    current_list_key = None
    record_start = re.compile(rf"^\s*-\s+{re.escape(id_key)}:\s*(.+?)\s*$")

    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        start = record_start.match(line)
        if start:
            if current:
                records.append(current)
            current = {id_key: clean_yaml_value(start.group(1))}
            current_list_key = None
            continue

        if current is None:
            continue

        list_item = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if list_item and current_list_key:
            item = clean_yaml_value(list_item.group(1))
            nested = re.match(r"^([A-Za-z0-9_]+):\s*(.+?)\s*$", item)
            if nested:
                nested_key = nested.group(1)
                nested_value = clean_yaml_value(nested.group(2))
                current.setdefault(current_list_key, []).append({nested_key: nested_value})
                if nested_key == "path":
                    current.setdefault(f"{current_list_key}_paths", []).append(nested_value)
            else:
                current.setdefault(current_list_key, []).append(item)
            continue

        field = re.match(r"^\s+([A-Za-z0-9_]+):(?:\s*(.*?))?\s*$", line)
        if field:
            key = field.group(1)
            value = clean_yaml_value(field.group(2) or "")
            if value == "":
                current.setdefault(key, [])
                current_list_key = key
            else:
                current[key] = value
                current_list_key = None

    if current:
        records.append(current)
    return records


def find_duplicates(values):
    seen = set()
    duplicates = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return sorted(duplicates)


def make_cross_check(label, ok, detail, severity="fail"):
    return {
        "label": label,
        "ok": ok,
        "detail": detail,
        "severity": severity,
    }


def validate_cross_references(root):
    project_path = rel_path(root, ".ghostclaw/registry/project-registry.v1.yaml")
    agent_path = rel_path(root, ".ghostclaw/registry/agent-registry.v1.yaml")
    route_path = rel_path(root, ".ghostclaw/registry/route-matrix.v1.yaml")
    domain_path = rel_path(root, ".ghostclaw/registry/domain-pack-index.v1.yaml")

    projects = parse_yaml_records(project_path, "id")
    agents = parse_yaml_records(agent_path, "id")
    routes = parse_yaml_records(route_path, "route_id")
    domain_packs = parse_yaml_records(domain_path, "project_id")

    project_ids = {p.get("id") for p in projects if p.get("id")}
    agent_ids = {a.get("id") for a in agents if a.get("id")}
    agent_lanes = {a.get("lane") for a in agents if a.get("lane")}
    route_ids = [r.get("route_id") for r in routes if r.get("route_id")]
    route_task_types = {r.get("task_type") for r in routes if r.get("task_type")}
    domain_pack_project_ids = {p.get("project_id") for p in domain_packs if p.get("project_id")}

    checks = []
    checks.append(make_cross_check(
        "route IDs are unique",
        not find_duplicates(route_ids),
        ", ".join(find_duplicates(route_ids)) or f"{len(route_ids)} route IDs checked",
    ))
    checks.append(make_cross_check(
        "project IDs are unique",
        not find_duplicates([p.get("id") for p in projects if p.get("id")]),
        ", ".join(find_duplicates([p.get("id") for p in projects if p.get("id")])) or f"{len(project_ids)} project IDs checked",
    ))
    checks.append(make_cross_check(
        "agent IDs are unique",
        not find_duplicates([a.get("id") for a in agents if a.get("id")]),
        ", ".join(find_duplicates([a.get("id") for a in agents if a.get("id")])) or f"{len(agent_ids)} agent IDs checked",
    ))

    invalid_lanes = sorted(lane for lane in agent_lanes if lane not in VALID_AGENT_LANES)
    checks.append(make_cross_check(
        "agent lanes are valid",
        not invalid_lanes,
        ", ".join(invalid_lanes) or f"{len(agent_lanes)} lanes checked",
    ))

    missing_route_agents = []
    for route in routes:
        route_id = route.get("route_id", "unknown-route")
        for field in ROUTE_AGENT_FIELDS:
            agent = route.get(field)
            if agent and agent not in agent_ids:
                missing_route_agents.append(f"{route_id}.{field}={agent}")
        for agent in route.get("escalation_path", []):
            if agent and agent not in agent_ids:
                missing_route_agents.append(f"{route_id}.escalation_path={agent}")
    checks.append(make_cross_check(
        "route agent references resolve",
        not missing_route_agents,
        ", ".join(missing_route_agents) or "all route agent references resolve",
    ))

    unknown_known_routes = []
    known_route_aliases = []
    invalid_project_lanes = []
    missing_project_categories = []
    for project in projects:
        project_id = project.get("id", "unknown-project")
        if not project.get("domain_category"):
            missing_project_categories.append(project_id)
        for known_route in project.get("known_routes_paths", []):
            if known_route.startswith("/"):
                known_route_aliases.append(f"{project_id}:{known_route}")
            elif known_route not in route_task_types:
                unknown_known_routes.append(f"{project_id}:{known_route}")
        for lane in project.get("agent_lanes", []):
            if lane not in VALID_AGENT_LANES:
                invalid_project_lanes.append(f"{project_id}:{lane}")
    checks.append(make_cross_check(
        "project known_routes resolve to route task types",
        not unknown_known_routes,
        ", ".join(unknown_known_routes) or "all project known_routes resolve",
    ))
    checks.append(make_cross_check(
        "project known_routes path aliases",
        True,
        f"{len(known_route_aliases)} URL/path aliases skipped: {', '.join(known_route_aliases[:5])}" + (" ..." if len(known_route_aliases) > 5 else ""),
        severity="warn",
    ))
    checks.append(make_cross_check(
        "project agent_lanes resolve to valid lanes",
        not invalid_project_lanes,
        ", ".join(invalid_project_lanes) or "all project agent_lanes resolve",
    ))
    checks.append(make_cross_check(
        "project domain categories are present",
        not missing_project_categories,
        ", ".join(missing_project_categories) or "all projects declare domain_category",
    ))

    unknown_domain_packs = sorted(domain_pack_project_ids - project_ids)
    checks.append(make_cross_check(
        "domain packs reference known projects",
        not unknown_domain_packs,
        ", ".join(unknown_domain_packs) or f"{len(domain_pack_project_ids)} domain packs resolve",
    ))

    uncovered_projects = sorted(project_ids - domain_pack_project_ids)
    checks.append(make_cross_check(
        "project registry domain-pack coverage",
        True,
        f"{len(uncovered_projects)} projects do not have domain packs yet: {', '.join(uncovered_projects[:8])}" + (" ..." if len(uncovered_projects) > 8 else ""),
        severity="warn",
    ))

    return {
        "projects": len(projects),
        "agents": len(agents),
        "routes": len(routes),
        "domain_packs": len(domain_packs),
        "checks": checks,
        "failures": [c for c in checks if not c["ok"] and c["severity"] == "fail"],
        "warnings": [c for c in checks if c["severity"] == "warn"],
    }


def main():
    args = parse_args()
    root = os.path.abspath(args.root)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ---------- file checks ----------
    file_checks = [
        (".ghostclaw/registry/project-registry.v1.yaml", True),
        (".ghostclaw/registry/agent-registry.v1.yaml", True),
        (".ghostclaw/registry/knowledge-vault-index.v1.yaml", True),
        (".ghostclaw/registry/route-matrix.v1.yaml", True),
        (".ghostclaw/registry/domain-pack-index.v1.yaml", True),
        (".ghostclaw/schemas/project-registry.schema.json", True),
        (".ghostclaw/schemas/agent-registry.schema.json", True),
        (".ghostclaw/schemas/knowledge-vault-index.schema.json", True),
        (".ghostclaw/schemas/route-matrix.schema.json", True),
        ("docs/GHOSTCLAW_UNIFIED_PROJECT_OPERATING_SYSTEM.md", True),
        ("docs/KNOWLEDGE_VAULT_RETRIEVAL_PROTOCOL.md", True),
        ("docs/PROJECT_DOMAIN_PACKS.md", True),
        ("docs/MASTER_PLAN_INTEGRATION_MAP.md", True),
        ("docs/A2A2A_ALL_PROJECT_ROUTING_RUNBOOK.md", True),
        ("scripts/ghostclaw_registry_validate.py", True),
        ("AGENTS.md", False),
        ("PROJECT_STATE.md", False),
        ("NEXT_ACTIONS.md", False),
        ("AUTONOMOUS_RUN_LOG.md", False),
    ]

    file_results = []
    files_missing = 0
    for fpath, critical in file_checks:
        path, exists = check_file_exists(root, fpath)
        file_results.append((path, exists, critical))
        if not exists and critical:
            files_missing += 1

    # ---------- directory checks ----------
    dir_checks = [
        ".ghostclaw/registry/",
        ".ghostclaw/schemas/",
        ".ghostclaw_runtime/a2a2a/receipts/",
        ".ghostclaw_runtime/a2a2a/inbox/",
        ".ghostclaw_runtime/a2a2a/project_queues/ghostclaw_os/",
        ".ghostclaw_runtime/a2a2a/project_queues/sirinx_site/",
        ".ghostclaw_runtime/a2a2a/project_queues/agm/",
        ".ghostclaw_runtime/a2a2a/project_queues/ads_andromeda/",
        ".ghostclaw_runtime/a2a2a/project_queues/kusala/",
        ".ghostclaw_runtime/a2a2a/project_queues/phitsanulok_news/",
        ".ghostclaw_runtime/a2a2a/project_queues/merch_dashboard/",
        ".ghostclaw_runtime/a2a2a/project_queues/creative_assets/",
        ".ghostclaw_runtime/a2a2a/project_queues/local_business/",
        ".ghostclaw_runtime/a2a2a/project_queues/research/",
    ]

    dir_results = []
    dirs_missing = 0
    for dpath in dir_checks:
        path, exists = check_dir_exists(root, dpath)
        dir_results.append((path, exists))
        if not exists:
            dirs_missing += 1

    # ---------- yaml structure checks ----------
    yaml_files = [
        ".ghostclaw/registry/project-registry.v1.yaml",
        ".ghostclaw/registry/agent-registry.v1.yaml",
        ".ghostclaw/registry/knowledge-vault-index.v1.yaml",
        ".ghostclaw/registry/route-matrix.v1.yaml",
        ".ghostclaw/registry/domain-pack-index.v1.yaml",
    ]

    yaml_results = []
    for yf in yaml_files:
        path = rel_path(root, yf)
        if os.path.isfile(path):
            ok, info = validate_yaml_structure(path)
            yaml_results.append((path, ok, info))
        else:
            yaml_results.append((path, False, "FILE_NOT_FOUND"))

    # ---------- schema checks ----------
    schema_files = [
        ".ghostclaw/schemas/project-registry.schema.json",
        ".ghostclaw/schemas/agent-registry.schema.json",
        ".ghostclaw/schemas/knowledge-vault-index.schema.json",
        ".ghostclaw/schemas/route-matrix.schema.json",
    ]

    schema_results = []
    for sf in schema_files:
        path = rel_path(root, sf)
        if os.path.isfile(path):
            ok, info = validate_json_structure(path)
            schema_results.append((path, ok, info))
        else:
            schema_results.append((path, False, "FILE_NOT_FOUND"))

    # ---------- content checks ----------
    content_checks = [
        (".ghostclaw/registry/project-registry.v1.yaml", "project entries", 20, "id:"),
        (".ghostclaw/registry/agent-registry.v1.yaml", "agent entries", 10, "id:"),
        (".ghostclaw/registry/knowledge-vault-index.v1.yaml", "knowledge entries", 15, "id:"),
        (".ghostclaw/registry/route-matrix.v1.yaml", "route entries", 5, "route_id:"),
        (".ghostclaw/registry/domain-pack-index.v1.yaml", "domain pack entries", 10, "project_id:"),
    ]

    content_results = []
    content_failures = 0
    for cpath, label, minimum, key in content_checks:
        path = rel_path(root, cpath)
        if not os.path.isfile(path):
            content_results.append((path, label, "FILE_NOT_FOUND", minimum, 0, False))
            content_failures += 1
            continue
        count = count_yaml_entries(path, key=key)
        if count < minimum:
            content_results.append((path, label, "LOW_COUNT", minimum, count, False))
            content_failures += 1
        else:
            content_results.append((path, label, "OK", minimum, count, True))

    # ---------- cross-reference checks ----------
    cross_reference = validate_cross_references(root)

    # ---------- report ----------
    lines = []
    lines.append("GHOSTCLAW REGISTRY VALIDATION REPORT")
    lines.append("=" * 37)
    lines.append(f"Date: {now}")
    lines.append(f"Root: {root}")
    lines.append("")

    lines.append("FILE EXISTENCE CHECKS:")
    missing_warnings = []
    for path, exists, critical in file_results:
        disp = os.path.relpath(path, root)
        if exists:
            lines.append(f"  \u2713 {disp}")
        elif critical:
            lines.append(f"  \u2717 {disp} (MISSING)")
        else:
            lines.append(f"  \u2717 {disp} (MISSING, optional)")
            missing_warnings.append(disp)
    lines.append("")

    lines.append("DIRECTORY CHECKS:")
    for path, exists in dir_results:
        disp = os.path.relpath(path, root)
        if exists:
            lines.append(f"  \u2713 {disp}")
        else:
            lines.append(f"  \u2717 {disp} (MISSING)")
    lines.append("")

    lines.append("YAML STRUCTURE CHECKS:")
    for path, ok, info in yaml_results:
        disp = os.path.relpath(path, root)
        if ok:
            lines.append(f"  \u2713 {disp} (valid structure)")
        else:
            lines.append(f"  \u2717 {disp} (INVALID: {info})")
    lines.append("")

    lines.append("CONTENT CHECKS:")
    for path, label, status, minimum, count, ok in content_results:
        disp = os.path.relpath(path, root)
        if ok:
            lines.append(f"  \u2713 {disp} ({count} {label}, min {minimum})")
        elif status == "FILE_NOT_FOUND":
            lines.append(f"  \u2717 {disp} (FILE_NOT_FOUND)")
        else:
            lines.append(f"  \u2717 {disp} ({count} {label}, min {minimum})")
    lines.append("")

    lines.append("SCHEMA CHECKS:")
    for path, ok, info in schema_results:
        disp = os.path.relpath(path, root)
        if ok:
            lines.append(f"  \u2713 {disp} (valid JSON)")
        else:
            lines.append(f"  \u2717 {disp} (INVALID JSON: {info})")
    lines.append("")

    lines.append("CROSS-REFERENCE CHECKS:")
    for check in cross_reference["checks"]:
        marker = "\u2713" if check["ok"] else "\u2717"
        if check["severity"] == "warn":
            marker = "!"
        lines.append(f"  {marker} {check['label']} ({check['detail']})")
    lines.append("")

    total_critical_files = sum(1 for _, _, c in file_results if c)
    total_files_checked = len(file_results)
    total_file_missing = sum(1 for _, e, _ in file_results if not e)
    total_file_missing_critical = sum(1 for _, e, c in file_results if not e and c)
    total_dirs_checked = len(dir_results)
    total_dirs_missing = dirs_missing

    lines.append("SUMMARY:")
    lines.append(f"  Files checked:           {total_files_checked}")
    lines.append(f"  Files missing (total):   {total_file_missing}")
    lines.append(f"  Files missing (critical): {total_file_missing_critical}")
    lines.append(f"  Directories checked:     {total_dirs_checked}")
    lines.append(f"  Directories missing:     {total_dirs_missing}")
    lines.append(f"  Content failures:        {content_failures}")
    lines.append(f"  Cross-ref failures:      {len(cross_reference['failures'])}")
    lines.append(f"  Cross-ref warnings:      {len(cross_reference['warnings'])}")
    if missing_warnings:
        lines.append("  Warnings (optional files missing):")
        for w in missing_warnings:
            lines.append(f"    - {w}")

    if total_file_missing_critical > 0:
        lines.append("  STATUS: FAIL")
        status = "FAIL"
    elif content_failures > 0 or total_dirs_missing > 0 or cross_reference["failures"]:
        lines.append("  STATUS: PARTIAL")
        status = "PARTIAL"
    else:
        lines.append("  STATUS: PASS")
        status = "PASS"

    report = "\n".join(lines)
    print(report)

    sys.exit(0 if status in ("PASS", "PARTIAL") else 1)


if __name__ == "__main__":
    main()
