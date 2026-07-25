#!/usr/bin/env python3
"""Build a Telegram-safe Codex/Hermes work report draft from the local queue."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUEUE = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"

SAFETY_FLAGS = {
    "dry_run": True,
    "live_send": False,
    "provider_call": False,
    "external_message_send": False,
    "deploy": False,
    "push": False,
    "cloud_mutation": False,
    "customer_send": False,
    "secret_read": False,
    "paid_provider_call": False,
    "runtime_queue_execution": False,
    "telegram_live_send": False,
}


class WorkReport:
    def __init__(
        self,
        status: str,
        body: str,
        delivery: str = "telegram-draft",
        dry_run: bool = True,
        live_send: bool = False,
        provider_call: bool = False,
        external_message_send: bool = False,
    ):
        self.status = status
        self.body = body
        self.delivery = delivery
        self.dry_run = dry_run
        self.live_send = live_send
        self.provider_call = provider_call
        self.external_message_send = external_message_send

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "delivery": self.delivery,
            "dry_run": self.dry_run,
            "live_send": self.live_send,
            "provider_call": self.provider_call,
            "external_message_send": self.external_message_send,
            "body": self.body,
        }


def load_queue(queue_path: Path) -> dict[str, Any]:
    return json.loads(queue_path.read_text(encoding="utf-8"))


def pick_queue_item(queue: dict[str, Any], item_id: str | None = None) -> dict[str, Any]:
    items = queue.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("execution queue must include at least one item")

    if item_id:
        for item in items:
            if item.get("id") == item_id:
                return item
        raise ValueError(f"queue item not found: {item_id}")

    for item in items:
        status = str(item.get("status", ""))
        if not status.startswith("done"):
            return item
    return items[0]


def render_status(item: dict[str, Any]) -> str:
    status = str(item.get("status", ""))
    gate = str(item.get("gate", ""))
    if status.startswith("blocked") or status.startswith("waiting") or "closed" in gate or "required" in gate:
        return "BLOCKED"
    if status.startswith("done"):
        return "DONE"
    if status.startswith("active"):
        return "IN_PROGRESS"
    return "DRAFT"


def as_bullets(values: Any, fallback: str = "none", limit: int = 6) -> list[str]:
    if not isinstance(values, list) or not values:
        return [f"- {fallback}"]
    bullets = []
    for value in values[:limit]:
        text = str(value).strip()
        bullets.append(f"- {text}" if text else f"- {fallback}")
    return bullets


def build_work_report(queue_path: Path | str = DEFAULT_QUEUE, item_id: str | None = None) -> WorkReport:
    queue_path = Path(queue_path)
    queue = load_queue(queue_path)
    item = pick_queue_item(queue, item_id=item_id)
    status = render_status(item)
    item_id_text = str(item.get("id", "unknown-task"))
    next_action = str(item.get("next_action", "No next safe action recorded."))
    task = f"{item_id_text} - {next_action}"
    verification = queue.get("verification", [])
    audit = str(queue_path.relative_to(ROOT)) if queue_path.is_relative_to(ROOT) else str(queue_path)

    lines = [
        "Hermes work report.",
        f"status: {status}",
        f"task: {task}",
        f"audit: {audit}",
        "team: planner, context, coder, qa, reviewer, reporter",
        "files:",
        *as_bullets(item.get("evidence")),
        "tests:",
        *as_bullets(verification, fallback="not run", limit=3),
        "blockers:",
        *as_bullets(item.get("blocked_by")),
        f"next: {next_action}",
        "delivery: telegram-draft",
        "dry_run: true",
        "live_send: false",
        "provider_call: false",
        "external_message_send: false",
        "deploy: false",
        "push: false",
        "cloud_mutation: false",
        "customer_send: false",
        "secret_read: false",
        "paid_provider_call: false",
        "runtime_queue_execution: false",
        "telegram_live_send: false",
    ]
    return WorkReport(status=status, body="\n".join(lines))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("queue", nargs="?", default=str(DEFAULT_QUEUE), help="Path to the local execution queue JSON.")
    parser.add_argument("--item-id", help="Optional queue item id to render.")
    parser.add_argument("--json", action="store_true", help="Print a JSON wrapper instead of plain report text.")
    return parser.parse_args(argv)


def missing_queue_payload(queue_path: Path) -> dict[str, Any]:
    return {
        "ok": False,
        "reason": "missing_execution_queue",
        "path": str(queue_path),
        **SAFETY_FLAGS,
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    queue_path = Path(args.queue)
    if not queue_path.is_absolute():
        queue_path = ROOT / queue_path

    if not queue_path.exists():
        print(json.dumps(missing_queue_payload(queue_path), indent=2))
        return 2

    try:
        report = build_work_report(queue_path, item_id=args.item_id)
    except (json.JSONDecodeError, ValueError) as exc:
        payload = {
            "ok": False,
            "reason": "invalid_execution_queue",
            "error": str(exc),
            **SAFETY_FLAGS,
        }
        print(json.dumps(payload, indent=2))
        return 1

    if args.json:
        print(json.dumps({"ok": True, **report.to_dict()}, indent=2))
    else:
        print(report.body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
