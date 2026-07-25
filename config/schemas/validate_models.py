#!/usr/bin/env python3
"""Validate config/models.<lane>.json against models.provider.schema.json.

Dependency-free on purpose: runs on a stock Python 3 with no install step, so it
works in CI and on a fresh machine. It enforces the constraints the schema
declares rather than a generic subset of JSON Schema.

    python3 config/schemas/validate_models.py                  # every registry
    python3 config/schemas/validate_models.py config/models.cointh.json

Exit code 0 = all valid, 1 = at least one invalid.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SCHEMAS = {"anthropic_messages", "openai_chat", "openai_responses"}
STATUSES = {"OK", "EMPTY", "ERR", "ABSENT"}
TIERS = {"PRIMARY", "LEAF"}
CEILINGS = {"green", "yellow"}

ISO8601 = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$")
BASE_URL = re.compile(r"^https://[^/]+(/[^/]+)*$")

TOP_REQUIRED = [
    "lane", "decision", "tier", "risk_ceiling",
    "base_url", "source_endpoint", "verified_at", "models",
]
RECORD_REQUIRED = [
    "id", "status", "schema", "http_code",
    "latency_ms", "needs_big_budget", "verified_at",
]


def validate(doc: dict, filename: str) -> list[str]:
    errors: list[str] = []
    err = errors.append

    for key in TOP_REQUIRED:
        if key not in doc:
            err(f"missing required top-level key: {key}")

    lane = doc.get("lane")
    if not isinstance(lane, str) or not lane:
        err("lane must be a non-empty string")
    else:
        expected = f"models.{lane}.json"
        if filename != expected:
            err(f"lane {lane!r} does not match filename — expected {expected}")

    if doc.get("tier") not in TIERS:
        err(f"tier must be one of {sorted(TIERS)}, got {doc.get('tier')!r}")

    if doc.get("risk_ceiling") not in CEILINGS:
        err(
            f"risk_ceiling must be one of {sorted(CEILINGS)} — no lane may execute RED, "
            f"got {doc.get('risk_ceiling')!r}"
        )

    base = doc.get("base_url", "")
    if not BASE_URL.match(base):
        err(f"base_url must be an https origin with an optional path and no trailing slash: {base!r}")
    elif base.rstrip("/").endswith("/v1"):
        err(
            f"base_url must not end in /v1 — clients append /v1/messages themselves, "
            f"so this yields /v1/v1/messages: {base!r}"
        )

    if not ISO8601.match(doc.get("verified_at", "")):
        err(f"verified_at must be ISO 8601 UTC: {doc.get('verified_at')!r}")

    models = doc.get("models")
    if not isinstance(models, list) or not models:
        err("models must be a non-empty array")
        return errors

    seen: set[str] = set()
    counts = dict.fromkeys(STATUSES, 0)
    big_budget = 0
    all_three = 0

    for i, m in enumerate(models):
        if not isinstance(m, dict):
            err(f"models[{i}] must be an object")
            continue

        where = f"models[{i}] ({m.get('id', '<no id>')})"

        for key in RECORD_REQUIRED:
            if key not in m:
                err(f"{where}: missing required key {key}")

        mid = m.get("id")
        if not isinstance(mid, str) or not mid:
            err(f"{where}: id must be a non-empty string")
        elif mid in seen:
            err(f"{where}: duplicate id")
        else:
            seen.add(mid)

        status = m.get("status")
        if status not in STATUSES:
            err(f"{where}: status must be one of {sorted(STATUSES)}, got {status!r}")
        else:
            counts[status] += 1

        schema = m.get("schema")
        if not isinstance(schema, list):
            err(f"{where}: schema must be an array")
        else:
            unknown = set(schema) - SCHEMAS
            if unknown:
                err(f"{where}: unknown schema name(s) {sorted(unknown)}")
            if len(set(schema)) != len(schema):
                err(f"{where}: schema entries must be unique")
            if len(schema) == 3:
                all_three += 1
            if status == "OK" and not schema:
                err(f"{where}: status OK requires at least one schema that answered")
            if status in ("ERR", "ABSENT") and schema:
                err(f"{where}: status {status} must not list working schemas")

        if status == "ERR":
            for key in ("error_code", "error_message"):
                if not m.get(key):
                    err(f"{where}: status ERR requires {key} from the provider's own response")

        code = m.get("http_code")
        if not isinstance(code, int) or not (100 <= code <= 599):
            err(f"{where}: http_code must be an integer 100-599, got {code!r}")

        lat = m.get("latency_ms")
        if not isinstance(lat, int) or lat < 0:
            err(f"{where}: latency_ms must be a non-negative integer, got {lat!r}")

        nbb = m.get("needs_big_budget")
        if not isinstance(nbb, bool):
            err(f"{where}: needs_big_budget must be a boolean, got {nbb!r}")
        elif nbb:
            big_budget += 1

        if not ISO8601.match(m.get("verified_at", "")):
            err(f"{where}: verified_at must be ISO 8601 UTC, got {m.get('verified_at')!r}")

    summary = doc.get("summary")
    if isinstance(summary, dict):
        expected = {
            "total": len(models),
            "ok": counts["OK"],
            "err": counts["ERR"],
            "empty": counts["EMPTY"],
            "absent": counts["ABSENT"],
            "needs_big_budget": big_budget,
            "usable_on_all_three_schemas": all_three,
        }
        for key, want in expected.items():
            if key in summary and summary[key] != want:
                err(f"summary.{key} says {summary[key]} but the records total {want}")

    return errors


def check(path: Path) -> bool:
    try:
        doc = json.loads(path.read_text())
    except FileNotFoundError:
        print(f"not found: {path}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"{path.name}: invalid JSON: {e}", file=sys.stderr)
        return False

    errors = validate(doc, path.name)
    if errors:
        for e in errors:
            print(f"{path.name}: {e}", file=sys.stderr)
        print(f"{path.name}: {len(errors)} error(s)", file=sys.stderr)
        return False

    models = doc["models"]
    ok = sum(1 for m in models if m["status"] == "OK")
    print(
        f"{path.name}: valid — lane={doc['lane']} tier={doc['tier']} "
        f"{len(models)} models, {ok} OK, verified_at {doc['verified_at']}"
    )
    return True


def main() -> int:
    config_dir = Path(__file__).resolve().parent.parent

    if len(sys.argv) > 1:
        targets = [Path(a) for a in sys.argv[1:]]
    else:
        targets = sorted(config_dir.glob("models.*.json"))
        if not targets:
            print(f"no models.*.json under {config_dir}", file=sys.stderr)
            return 1

    return 0 if all([check(p) for p in targets]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
