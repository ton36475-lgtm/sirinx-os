#!/usr/bin/env python3
"""
Download direct allowlisted URLs from an AutoFindGame manifest.

Default is dry-run. Use --execute to download.
This does not crawl or search the web. It only processes URLs already present
in the manifest and validated by policy checks.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

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


def normalize_domain(url: str) -> str:
    netloc = urlparse(url).netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc


def is_allowed_domain(url: str) -> bool:
    domain = normalize_domain(url)
    return any(domain == allowed or domain.endswith("." + allowed) for allowed in ALLOWED_DOMAINS)


def blocked_text(*values: str) -> str | None:
    haystack = " ".join(v or "" for v in values).lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern in haystack:
            return pattern
    return None


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_filename(name: str) -> str:
    return "".join(c for c in name if c.isalnum() or c in {".", "-", "_", " ", "(" , ")"}).strip() or "download.bin"


def main() -> int:
    parser = argparse.ArgumentParser(description="Download direct allowlisted URLs from manifest.")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--out", type=Path, default=Path("downloads/staging"))
    parser.add_argument("--execute", action="store_true", help="Actually download files. Default is dry-run.")
    parser.add_argument("--report", type=Path, default=Path("reports/download_report.json"))
    args = parser.parse_args()

    if not args.manifest.exists():
        print(f"ERROR: Manifest not found: {args.manifest}", file=sys.stderr)
        return 2

    args.out.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)

    results = []
    with args.manifest.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_number, row in enumerate(reader, start=2):
            title = (row.get("title") or "").strip()
            url = (row.get("download_url") or "").strip()
            filename = safe_filename((row.get("filename") or Path(urlparse(url).path).name or title).strip())
            source_type = (row.get("source_type") or "").strip()
            license_status = (row.get("license_status") or "").strip()
            notes = (row.get("notes") or "").strip()
            status = "skipped"
            reason = "no download_url"
            output_path = ""
            digest = ""

            if url:
                blocked = blocked_text(title, url, filename, notes)
                if source_type not in ALLOWED_SOURCE_TYPES:
                    status, reason = "blocked", f"source_type not allowed: {source_type}"
                elif license_status not in ALLOWED_LICENSE_STATUS:
                    status, reason = "blocked", f"license_status not allowed: {license_status}"
                elif blocked:
                    status, reason = "blocked", f"blocked pattern: {blocked}"
                elif not is_allowed_domain(url):
                    status, reason = "blocked", f"domain not allowlisted: {normalize_domain(url)}"
                else:
                    output = args.out / filename
                    output_path = str(output)
                    if args.execute:
                        request = Request(url, headers={"User-Agent": "AutoFindGame-LegalFetcher/1.0"})
                        try:
                            with urlopen(request, timeout=45) as response:
                                data = response.read()
                            output.write_bytes(data)
                            digest = sha256_file(output)
                            status, reason = "downloaded", "ok"
                        except Exception as exc:
                            status, reason = "error", str(exc)
                    else:
                        status, reason = "dry_run", "would download"

            results.append({
                "row_number": row_number,
                "title": title,
                "download_url": url,
                "filename": filename,
                "status": status,
                "reason": reason,
                "output_path": output_path,
                "sha256": digest,
            })

    report = {
        "mode": "execute" if args.execute else "dry_run",
        "manifest": str(args.manifest),
        "out": str(args.out),
        "results": results,
    }
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))

    if any(r["status"] in {"blocked", "error"} for r in results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())