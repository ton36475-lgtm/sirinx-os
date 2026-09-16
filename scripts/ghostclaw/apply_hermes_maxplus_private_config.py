#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import stat
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONFIG_TEMPLATE = ROOT / "docs/ghostclaw/templates/hermes-maxplus-config.yaml.template"
ENV_TEMPLATE = ROOT / "docs/ghostclaw/templates/hermes-maxplus-env.template"
HERMES_HOME = Path.home() / ".hermes"
CONFIG_TARGET = HERMES_HOME / "config.yaml"
ENV_TARGET = HERMES_HOME / ".env"
GATE_ENV = "APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG"
KEY_ENV = "MAXPLUS_CODEX_API_KEY"


def render_env_template(key_present: bool) -> str:
    body = ENV_TEMPLATE.read_text(encoding="utf-8")
    if key_present:
        private_key = os.environ[KEY_ENV]
        body = body.replace("REPLACE_WITH_PRIVATE_MAXPLUS_CODEX_KEY", private_key)
    return body


def apply_private_files() -> None:
    HERMES_HOME.mkdir(parents=True, exist_ok=True)
    CONFIG_TARGET.write_text(CONFIG_TEMPLATE.read_text(encoding="utf-8"), encoding="utf-8")
    ENV_TARGET.write_text(render_env_template(key_present=True), encoding="utf-8")
    os.chmod(CONFIG_TARGET, stat.S_IRUSR | stat.S_IWUSR)
    os.chmod(ENV_TARGET, stat.S_IRUSR | stat.S_IWUSR)


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply private Hermes MaxPlus config without printing secrets.")
    parser.add_argument("--dry-run", action="store_true", help="Report readiness without writing home config files.")
    parser.add_argument("--write", action="store_true", help="Write ~/.hermes/config.yaml and ~/.hermes/.env from templates.")
    args = parser.parse_args()

    key_present = bool(os.environ.get(KEY_ENV))
    gate_open = os.environ.get(GATE_ENV) == "1"
    templates_present = CONFIG_TEMPLATE.exists() and ENV_TEMPLATE.exists()

    if args.dry_run or not args.write:
        print(
            json.dumps(
                {
                "dry_run": True,
                "templates_present": templates_present,
                "key_present": key_present,
                "write_gate_open": gate_open,
                "target_config": str(CONFIG_TARGET),
                "target_env": str(ENV_TARGET),
                "secret_value_printed": False,
                },
                indent=2,
            )
        )
        return 0

    if not templates_present:
        print("ERROR: required templates are missing", file=sys.stderr)
        return 1
    if not key_present:
        print(f"ERROR: {KEY_ENV} is not set; refusing to write private config", file=sys.stderr)
        return 1
    if not gate_open:
        print(f"ERROR: set {GATE_ENV}=1 to allow private home config write", file=sys.stderr)
        return 1

    apply_private_files()
    print(
        json.dumps(
            {
            "written": True,
            "target_config": str(CONFIG_TARGET),
            "target_env": str(ENV_TARGET),
            "mode": "0600",
            "secret_value_printed": False,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
