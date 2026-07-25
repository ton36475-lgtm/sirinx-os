#!/usr/bin/env python3
"""Local-only Merch QC validator.

Stdlib only. No Amazon API, no trademark database query, no network calls.
Input is a JSON design record or the bundled sample set.
"""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path
from typing import Any


MIN_WIDTH = 4500
MIN_HEIGHT = 5400
ALLOWED_COLOR_MODES = {"RGB", "RGBA", "sRGB"}
COMMON_BLOCKED_PHRASES = {
    "just do it",
    "disney",
    "marvel",
    "star wars",
    "barbie",
    "pokemon",
    "super bowl",
    "olympics",
    "harry potter",
}


def read_png_header(path: Path) -> dict[str, Any] | None:
    """Read PNG width, height, and color type from IHDR without third-party libs."""
    if not path.exists() or path.suffix.lower() != ".png":
        return None
    with path.open("rb") as handle:
        signature = handle.read(8)
        if signature != b"\x89PNG\r\n\x1a\n":
            return None
        length = struct.unpack(">I", handle.read(4))[0]
        chunk_type = handle.read(4)
        if chunk_type != b"IHDR" or length < 13:
            return None
        payload = handle.read(13)
    width, height, bit_depth, color_type = struct.unpack(">IIBB", payload[:10])
    color_mode = {2: "RGB", 6: "RGBA", 0: "GRAYSCALE", 3: "INDEXED", 4: "GRAYSCALE_ALPHA"}.get(
        color_type,
        f"PNG_COLOR_TYPE_{color_type}",
    )
    return {"width": width, "height": height, "bit_depth": bit_depth, "color_mode": color_mode}


def normalize_text(value: Any) -> str:
    if isinstance(value, list):
        return " ".join(normalize_text(item) for item in value)
    if isinstance(value, dict):
        return " ".join(normalize_text(item) for item in value.values())
    return str(value or "").lower()


def check_item(name: str, passed: bool, message: str, severity: str = "fail") -> dict[str, str]:
    if passed:
        status = "pass"
    elif severity == "warn":
        status = "warn"
    else:
        status = "fail"
    return {"name": name, "status": status, "message": message}


def validate_design(record: dict[str, Any], base_dir: Path | None = None) -> dict[str, Any]:
    asset = dict(record.get("asset") or {})
    asset_path = asset.get("path")
    if asset_path:
        resolved = Path(asset_path)
        if not resolved.is_absolute() and base_dir:
            resolved = base_dir / resolved
        png_header = read_png_header(resolved)
        if png_header:
            asset.update(png_header)

    metadata = record.get("metadata") or {}
    phrase_surface = normalize_text([metadata.get("title"), metadata.get("brand"), metadata.get("phrase")])
    matched_phrases = sorted(phrase for phrase in COMMON_BLOCKED_PHRASES if phrase in phrase_surface)
    bullet_points = metadata.get("bullet_points") or []
    if not isinstance(bullet_points, list):
        bullet_points = []

    width = int(asset.get("width") or 0)
    height = int(asset.get("height") or 0)
    color_mode = str(asset.get("color_mode") or "").strip()
    phrase_message = (
        f"matched local blocked phrases: {', '.join(matched_phrases)}"
        if matched_phrases
        else "no local blocked phrase matched"
    )
    checks = [
        check_item(
            "resolution",
            width >= MIN_WIDTH and height >= MIN_HEIGHT,
            f"expected >= {MIN_WIDTH}x{MIN_HEIGHT}, got {width}x{height}",
        ),
        check_item(
            "color_mode",
            color_mode in ALLOWED_COLOR_MODES,
            f"expected one of {sorted(ALLOWED_COLOR_MODES)}, got {color_mode or 'missing'}",
        ),
        check_item(
            "no_common_trademark_phrases",
            not matched_phrases,
            phrase_message,
        ),
        check_item("title_present", bool(str(metadata.get("title") or "").strip()), "title is required"),
        check_item("brand_field_present", bool(str(metadata.get("brand") or "").strip()), "brand is required"),
        check_item(
            "bullet_points_present",
            len([item for item in bullet_points if str(item).strip()]) >= 2,
            "at least two bullet points are required",
        ),
    ]
    statuses = [item["status"] for item in checks]
    overall = "fail" if "fail" in statuses else "warn" if "warn" in statuses else "pass"
    return {
        "design_id": record.get("design_id", "unknown"),
        "overall_status": overall,
        "checks": checks,
        "evidence": {
            "local_only": True,
            "external_calls": False,
            "trademark_database_query": False,
            "asset_source": "png_header_or_json_metadata",
        },
    }


def validate_samples(samples_path: Path) -> dict[str, Any]:
    payload = json.loads(samples_path.read_text(encoding="utf-8"))
    results = []
    failures = []
    for sample in payload.get("samples", []):
        result = validate_design(sample, samples_path.parent)
        result["expected_status"] = sample.get("expected_status")
        if result["overall_status"] != sample.get("expected_status"):
            failures.append(
                {
                    "design_id": sample.get("design_id"),
                    "expected": sample.get("expected_status"),
                    "actual": result["overall_status"],
                }
            )
        results.append(result)
    return {
        "packet": "A2A2A-P049-MERCH-QC-CHECKLIST-VALIDATOR-20260703",
        "status": "PASS" if not failures else "FAIL",
        "sample_count": len(results),
        "failures": failures,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Merch QC validator")
    parser.add_argument("--input", help="Path to one design JSON record")
    parser.add_argument("--run-samples", action="store_true", help="Run bundled sample test cases")
    parser.add_argument(
        "--samples",
        default="packages/types/merch-dashboard/qc-samples.json",
        help="Path to sample set JSON",
    )
    parser.add_argument("--json", help="Optional report output path")
    args = parser.parse_args()

    if args.run_samples:
      report = validate_samples(Path(args.samples))
    elif args.input:
      input_path = Path(args.input)
      record = json.loads(input_path.read_text(encoding="utf-8"))
      report = {
          "packet": "A2A2A-P049-MERCH-QC-CHECKLIST-VALIDATOR-20260703",
          "status": "PASS",
          "result": validate_design(record, input_path.parent),
      }
      if report["result"]["overall_status"] == "fail":
          report["status"] = "FAIL"
      elif report["result"]["overall_status"] == "warn":
          report["status"] = "WARN"
    else:
      raise SystemExit("Use --input <file> or --run-samples")

    if args.json:
      output = Path(args.json)
      output.parent.mkdir(parents=True, exist_ok=True)
      output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] == "FAIL":
      raise SystemExit(1)


if __name__ == "__main__":
    main()
