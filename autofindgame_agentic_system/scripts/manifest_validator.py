#!/usr/bin/env python3
"""
AutoFindGame manifest validator.

Legal-only validation for R36S / ArkOS-compatible game manifests.
This script blocks unclear or risky source classes, blocked search patterns,
invalid target folders, and mismatched file extensions.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from urllib.parse import urlparse

REQUIRED_FIELDS = [
    "title",
    "system",
    "source_type",
    "license_status",
    "source_url",
    "download_url",
    "filename",
    "extension",
    "target_folder",
    "local_path",
    "sha256",
    "status",
    "notes",
]

ALLOWED_SOURCE_TYPES = {
    "official_freeware",
    "homebrew_author_release",
    "open_source",
    "public_domain",
    "owned_purchased_data",
    "owned_dump",
}

ALLOWED_LICENSE_STATUS = {
    "freeware_official",
    "homebrew_author",
    "open_source",
    "public_domain",
    "owned_by_user",
    "approved_free_distribution",
}

BLOCKED_PATTERNS = [
    "full rom set",
    "mega pack",
    "rom pack",
    "bios pack",
    "no-intro",
    "redump",
    "complete collection",
    "torrent",
    "crack",
    "warez",
    "all games",
]

ALLOWED_DOMAINS = {
    "scummvm.org",
    "downloads.scummvm.org",
    "mamedev.org",
    "itch.io",
    "github.com",
    "gitlab.com",
    "codeberg.org",
    "portmaster.games",
}

# Conservative ArkOS-style folder to extension mapping.
# This is intentionally not exhaustive; add only what you verify.
FOLDER_EXTENSIONS = {
    "gb": {".gb", ".zip", ".7z"},
    "gbc": {".gbc", ".gb", ".zip", ".7z"},
    "gba": {".gba", ".zip", ".7z"},
    "nes": {".nes", ".zip", ".7z"},
    "famicom": {".nes", ".zip", ".7z"},
    "snes": {".sfc", ".smc", ".zip", ".7z"},
    "sfc": {".sfc", ".smc", ".zip", ".7z"},
    "genesis": {".md", ".bin", ".gen", ".smd", ".zip", ".7z"},
    "megadrive": {".md", ".bin", ".gen", ".smd", ".zip", ".7z"},
    "mame2003": {".zip", ".7z"},
    "arcade": {".zip", ".7z", ".cue"},
    "scummvm": {".zip", ".scummvm", ".7z"},
    "ports": {".zip", ".sh"},
    "tools": {".zip", ".sh"},
    "psx": {".chd", ".pbp", ".cue", ".bin", ".iso"},
    "psp": {".iso", ".cso", ".chd", ".pbp"},
}

@dataclass
class RowIssue:
    row_number: int
    title: str
    severity: str
    field: str
    message: str


def normalize_domain(url: str) -> str:
    if not url:
        return ""
    try:
        netloc = urlparse(url).netloc.lower()
    except Exception:
        return ""
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc


def domain_allowed(url: str) -> bool:
    if not url:
        return True
    domain = normalize_domain(url)
    if not domain:
        return False
    return any(domain == allowed or domain.endswith("." + allowed) for allowed in ALLOWED_DOMAINS)


def has_blocked_pattern(*values: str) -> str | None:
    haystack = " ".join(v or "" for v in values).lower()
    compact = re.sub(r"\s+", " ", haystack)
    for pattern in BLOCKED_PATTERNS:
        if pattern in compact:
            return pattern
    return None


def validate_row(row: dict[str, str], row_number: int) -> list[RowIssue]:
    issues: list[RowIssue] = []
    title = row.get("title", "").strip()
    source_type = row.get("source_type", "").strip()
    license_status = row.get("license_status", "").strip()
    source_url = row.get("source_url", "").strip()
    download_url = row.get("download_url", "").strip()
    filename = row.get("filename", "").strip()
    extension = row.get("extension", "").strip().lower()
    target_folder = row.get("target_folder", "").strip().lower()
    notes = row.get("notes", "").strip()

    for field in REQUIRED_FIELDS:
        if field not in row:
            issues.append(RowIssue(row_number, title, "error", field, "Missing required field."))

    if not title:
        issues.append(RowIssue(row_number, title, "error", "title", "Title is required."))

    if source_type not in ALLOWED_SOURCE_TYPES:
        issues.append(RowIssue(row_number, title, "error", "source_type", f"Blocked or unknown source_type: {source_type!r}."))

    if license_status not in ALLOWED_LICENSE_STATUS:
        issues.append(RowIssue(row_number, title, "error", "license_status", f"Blocked or unknown license_status: {license_status!r}."))

    blocked = has_blocked_pattern(title, source_url, download_url, filename, notes)
    if blocked:
        issues.append(RowIssue(row_number, title, "error", "blocked_pattern", f"Blocked pattern found: {blocked!r}."))

    for field, url in (("source_url", source_url), ("download_url", download_url)):
        if url and not domain_allowed(url):
            issues.append(RowIssue(row_number, title, "error", field, f"Domain not allowlisted: {normalize_domain(url)!r}."))

    if target_folder not in FOLDER_EXTENSIONS:
        issues.append(RowIssue(row_number, title, "error", "target_folder", f"Unknown target folder: {target_folder!r}."))
    else:
        allowed_ext = FOLDER_EXTENSIONS[target_folder]
        if extension not in allowed_ext:
            issues.append(RowIssue(row_number, title, "error", "extension", f"Extension {extension!r} is not expected for folder {target_folder!r}. Allowed: {sorted(allowed_ext)}"))

    if filename and extension and not filename.lower().endswith(extension):
        issues.append(RowIssue(row_number, title, "warning", "filename", "Filename does not end with the declared extension."))

    if target_folder in {"psx", "psp"}:
        issues.append(RowIssue(row_number, title, "warning", "system", "PSX/PSP may require extra legal BIOS or owned game data. Verify before use."))

    return issues


def read_manifest(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = [dict(row) for row in reader]
    return rows, fieldnames


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate AutoFindGame legal game manifest.")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--json-report", type=Path, default=None)
    args = parser.parse_args()

    if not args.manifest.exists():
        print(f"ERROR: Manifest not found: {args.manifest}", file=sys.stderr)
        return 2

    rows, fieldnames = read_manifest(args.manifest)
    issues: list[RowIssue] = []

    missing_fields = [f for f in REQUIRED_FIELDS if f not in fieldnames]
    for field in missing_fields:
        issues.append(RowIssue(0, "<manifest>", "error", field, "Missing column in manifest header."))

    for idx, row in enumerate(rows, start=2):
        issues.extend(validate_row(row, idx))

    errors = [i for i in issues if i.severity == "error"]
    warnings = [i for i in issues if i.severity == "warning"]

    report = {
        "manifest": str(args.manifest),
        "row_count": len(rows),
        "status": "PASS" if not errors else "FAIL",
        "error_count": len(errors),
        "warning_count": len(warnings),
        "issues": [asdict(i) for i in issues],
    }

    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        args.json_report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())