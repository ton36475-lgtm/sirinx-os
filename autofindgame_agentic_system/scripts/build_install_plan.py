#!/usr/bin/env python3
"""
Build or execute an EASYROMS install plan from an AutoFindGame manifest.

This script copies local staged files to target ArkOS folders only when --execute
is provided. Default is dry-run.
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from pathlib import Path

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


def resolve_local_path(row: dict[str, str], staging: Path) -> Path | None:
    local_path = (row.get("local_path") or "").strip()
    filename = (row.get("filename") or "").strip()
    candidates = []
    if local_path:
        candidates.append(Path(local_path))
    if filename:
        candidates.append(staging / filename)
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Build/copy EASYROMS install plan.")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--easyroms", type=Path, required=True, help="Path to EASYROMS root, e.g. E:\\")
    parser.add_argument("--staging", type=Path, default=Path("downloads/staging"))
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("reports/install_plan.json"))
    args = parser.parse_args()

    if args.execute and args.dry_run:
        print("ERROR: choose either --execute or --dry-run, not both.", file=sys.stderr)
        return 2

    if not args.manifest.exists():
        print(f"ERROR: Manifest not found: {args.manifest}", file=sys.stderr)
        return 2

    mode = "execute" if args.execute else "dry_run"
    plan = []
    issues = []

    with args.manifest.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_number, row in enumerate(reader, start=2):
            title = (row.get("title") or "").strip()
            target_folder = (row.get("target_folder") or "").strip().lower()
            extension = (row.get("extension") or "").strip().lower()
            filename = (row.get("filename") or "").strip()
            src = resolve_local_path(row, args.staging)
            dst_dir = args.easyroms / target_folder
            dst = dst_dir / filename if filename else None

            entry = {
                "row_number": row_number,
                "title": title,
                "target_folder": target_folder,
                "extension": extension,
                "source": str(src) if src else "",
                "destination": str(dst) if dst else "",
                "status": "pending",
                "reason": "",
            }

            if target_folder not in FOLDER_EXTENSIONS:
                entry["status"] = "blocked"
                entry["reason"] = f"unknown target_folder: {target_folder}"
                issues.append(entry)
            elif extension not in FOLDER_EXTENSIONS[target_folder]:
                entry["status"] = "blocked"
                entry["reason"] = f"extension {extension} not valid for {target_folder}"
                issues.append(entry)
            elif not src:
                entry["status"] = "missing_source"
                entry["reason"] = "local_path/staging file not found"
                issues.append(entry)
            elif dst and dst.exists():
                entry["status"] = "blocked"
                entry["reason"] = "destination exists; overwrite not allowed by default"
                issues.append(entry)
            elif args.execute:
                try:
                    dst_dir.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                    entry["status"] = "copied"
                    entry["reason"] = "ok"
                except Exception as exc:
                    entry["status"] = "error"
                    entry["reason"] = str(exc)
                    issues.append(entry)
            else:
                entry["status"] = "dry_run"
                entry["reason"] = "would copy"

            plan.append(entry)

    args.report.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "mode": mode,
        "manifest": str(args.manifest),
        "easyroms": str(args.easyroms),
        "staging": str(args.staging),
        "plan": plan,
        "issue_count": len(issues),
        "status": "PASS" if not issues else "CHECK_REQUIRED",
    }
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))

    return 0 if not any(i["status"] in {"blocked", "error"} for i in issues) else 1


if __name__ == "__main__":
    raise SystemExit(main())