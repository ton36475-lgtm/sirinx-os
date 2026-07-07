#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MISSION_ID = "MAXPLUS-HERMES-CHINESE-MODEL-20260630"
REPORT_PATH = ROOT / ".ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.preflight.json"
LAUNCHER = ROOT / "scripts/launchers/hermes-maxplus-openai-chat-safe"
CONFIG_TEMPLATE = ROOT / "docs/ghostclaw/templates/hermes-maxplus-config.yaml.template"
ENV_TEMPLATE = ROOT / "docs/ghostclaw/templates/hermes-maxplus-env.template"


def mode_string(path: Path) -> str | None:
    try:
        return oct(stat.S_IMODE(path.stat().st_mode))
    except FileNotFoundError:
        return None


def read_template_markers(path: Path, markers: list[str]) -> dict[str, bool]:
    if not path.exists():
        return {marker: False for marker in markers}
    body = path.read_text(encoding="utf-8")
    return {marker: marker in body for marker in markers}


def run_launcher_dry_run() -> dict:
    proc = subprocess.run(
        [str(LAUNCHER), "--dry-run"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        env=os.environ.copy(),
    )
    output = proc.stdout.strip()
    try:
        parsed = json.loads(output) if output else {}
    except json.JSONDecodeError:
        parsed = {"parse_error": True, "stdout_length": len(output)}
    return {
        "exit_code": proc.returncode,
        "stdout_json": parsed,
        "stderr_length": len(proc.stderr),
        "secret_value_printed": False,
    }


def main() -> int:
    hermes_home = Path.home() / ".hermes"
    private_env = hermes_home / ".env"
    private_config = hermes_home / "config.yaml"
    launcher_dry_run = run_launcher_dry_run() if LAUNCHER.exists() else {"missing": True}

    report = {
        "mission_id": MISSION_ID,
        "local_only": True,
        "secret_files_read": False,
        "provider_calls_executed": False,
        "remote_installer_executed": False,
        "hermes_binary": shutil.which("hermes"),
        "uv_binary": shutil.which("uv"),
        "hermes_home_present": hermes_home.is_dir(),
        "private_config_exists": private_config.exists(),
        "private_config_mode": mode_string(private_config),
        "private_env_exists": private_env.exists(),
        "private_env_mode": mode_string(private_env),
        "env_presence": {
            "MAXPLUS_CODEX_API_KEY": bool(os.environ.get("MAXPLUS_CODEX_API_KEY")),
            "MAXPLUS_HERMES_CODEX_MODEL": bool(os.environ.get("MAXPLUS_HERMES_CODEX_MODEL")),
            "HERMES_INFERENCE_PROVIDER": bool(os.environ.get("HERMES_INFERENCE_PROVIDER")),
        },
        "template_markers": {
            "config": read_template_markers(
                CONFIG_TEMPLATE,
                ["custom:maxplus-codex", "transport: openai_chat", "api_mode: openai_chat", "deepseek-v4-flash"],
            ),
            "env": read_template_markers(
                ENV_TEMPLATE,
                ["REPLACE_WITH_PRIVATE_MAXPLUS_CODEX_KEY", "MAXPLUS_CODEX_API_KEY"],
            ),
        },
        "launcher_dry_run": launcher_dry_run,
        "runtime_ready": bool(
            shutil.which("hermes")
            and hermes_home.is_dir()
            and private_config.exists()
            and private_env.exists()
            and os.environ.get("MAXPLUS_CODEX_API_KEY")
        ),
        "next_gate_required": "provider_call_runtime_smoke" ,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "runtime_ready": report["runtime_ready"],
        "hermes_present": bool(report["hermes_binary"]),
        "private_env_exists": report["private_env_exists"],
        "key_present": report["env_presence"]["MAXPLUS_CODEX_API_KEY"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

