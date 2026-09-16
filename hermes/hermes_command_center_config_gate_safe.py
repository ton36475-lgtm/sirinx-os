"""
GHOSTCLAW — Hermes Command Center SAFE GATE VERSION
===================================================
Config Gate safe version.

Default mode is DRY RUN ONLY.
This file is intended to be placed and compiled during Config Gate V1, not started live.

Required to start live:
  HERMES_ALLOW_LIVE=1
  HERMES_DRY_RUN_ONLY=0
  TELEGRAM_BOT_TOKEN set
  TELEGRAM_ADMIN_CHAT_ID set
  ~/.ghostclaw/receipts/config_gate_v1.json exists and indicates config gate completion

Required before live Fable5 provider routing:
  HERMES_ALLOW_FABLE5_PROVIDER_CALL=1
  OPENROUTER_API_KEY set

No secrets are printed. Receipts redact likely secret patterns.
"""

import asyncio
import json
import logging
import os
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("hermes")

RECEIPT_DIR = Path.home() / ".ghostclaw" / "receipts"
CONFIG_GATE_RECEIPT = RECEIPT_DIR / "config_gate_v1.json"
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

REPO = Path(os.environ.get("GHOSTCLAW_REPO", "/Users/sirinx/sirinx-os"))
DRY_RUN_ONLY = os.environ.get("HERMES_DRY_RUN_ONLY", "1") != "0"
ALLOW_LIVE = os.environ.get("HERMES_ALLOW_LIVE") == "1"

SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|token|password|credential)\s*[:=]\s*[^\s]+"),
    re.compile(r"(?i)(sk-[A-Za-z0-9_\-]{12,})"),
    re.compile(r"(?i)(ghp_[A-Za-z0-9_]{12,})"),
    re.compile(r"(?i)(xox[baprs]-[A-Za-z0-9\-]{12,})"),
    re.compile(r"(?i)(ccsk-[A-Za-z0-9_\-]{12,})"),
]

RISKY_PATTERNS = [
    r"\bpush\b", r"\bdeploy\b", r"\bproduction\b", r"\bsecret\b", r"\btoken\b",
    r"\bcredential\b", r"\bpassword\b", r"\bpay(ment)?\b", r"\bspend\b",
    r"\bsend\s+(message|email)\b", r"\bdelete\b", r"\bdrop\s+table\b", r"\boverwrite\b",
    r"rm\s+-rf", r"sudo\b", r"chmod\s+777", r"cat\s+\.env", r"printenv\b", r"env\s*\|",
    r"curl\b.*\|\s*(bash|sh)", r"wget\b.*\|\s*(bash|sh)",
    r"ลบ", r"ล้าง", r"ทับไฟล์", r"ดีพลอย", r"โปรดักชัน", r"ส่งข้อความ", r"อ่าน.*secret", r"อ่าน.*token",
]

@dataclass
class ModelChoice:
    profile: str
    label: str
    reason: str

RULES: list[tuple[re.Pattern, ModelChoice]] = [
    (re.compile(r"architecture|brand|strategy|playbook|design decision", re.I),
     ModelChoice("fable5", "Fable 5", "งาน reasoning/strategy ระดับสูง")),
    (re.compile(r"refactor|multi[- ]?file|large repo|migrate|rewrite whole", re.I),
     ModelChoice("glm", "GLM-5.2", "เหมาะ refactor ไฟล์เยอะ/context ใหญ่")),
    (re.compile(r"mcp|agent|tool.?call|orchestrat|hermes|a2a", re.I),
     ModelChoice("kimi", "Kimi K2.7 Code", "เหมาะงาน agentic/tool-use")),
    (re.compile(r"algorithm|math|leetcode|optimi[sz]e|competitive|logic puzzle", re.I),
     ModelChoice("deepseek", "DeepSeek V4 Pro", "งาน logic/routine")),
]

DEFAULT_CHOICE = ModelChoice("deepseek", "DeepSeek V4 Pro", "งาน routine ทั่วไป")
PENDING: dict[str, dict] = {}


def redact(text: str) -> str:
    out = text
    for pat in SECRET_PATTERNS:
        out = pat.sub("[REDACTED_SECRET]", out)
    return out


def require_live_gate() -> tuple[str, int]:
    if not ALLOW_LIVE:
        return "HERMES_ALLOW_LIVE is not 1", 2
    if not CONFIG_GATE_RECEIPT.exists():
        return "config_gate_v1.json receipt missing", 2
    try:
        data = json.loads(CONFIG_GATE_RECEIPT.read_text())
    except Exception as exc:
        return f"config gate receipt invalid JSON: {exc}", 2
    status = str(data.get("status", ""))
    if "COMPLETE" not in status and "PASS" not in status:
        return f"config gate receipt status not complete/pass: {status}", 2
    missing = [k for k in ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ADMIN_CHAT_ID"] if not os.environ.get(k)]
    if missing:
        return "missing required environment variables: " + ", ".join(missing), 2
    return "ok", 0


def classify_model(task_text: str) -> ModelChoice:
    for pattern, choice in RULES:
        if pattern.search(task_text):
            return choice
    return DEFAULT_CHOICE


def is_risky(task_text: str) -> bool:
    return any(re.search(p, task_text, re.I) for p in RISKY_PATTERNS)


def check_fable5_quota() -> str:
    url = os.environ.get("FABLE5_QUOTA_URL") or os.environ.get("NINEROUTER_QUOTA_URL")
    if not url:
        return "unknown"
    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=3) as r:
            data = json.loads(r.read())
            weekly_pct = data.get("fable5", {}).get("weekly_pct_used", 0)
            return "near_limit" if weekly_pct > 80 else "ok"
    except Exception as e:
        log.warning("quota check failed: %s", e)
        return "unknown"


def write_receipt(task_id: str, payload: dict) -> Path:
    path = RECEIPT_DIR / f"{task_id}.json"
    safe = dict(payload)
    if "task" in safe:
        safe["task"] = redact(str(safe["task"]))
    if "output" in safe:
        safe["output"] = redact(str(safe["output"]))[:3500]
    safe["written_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    path.write_text(json.dumps(safe, ensure_ascii=False, indent=2))
    return path


def run_codex(task_text: str, profile: str, cwd: str | None = None) -> str:
    cwd_path = cwd or str(REPO)
    cmd = ["codex", "--profile", profile, "-p", task_text]
    if DRY_RUN_ONLY:
        return "[dry-run] would run: codex --profile %s -p [REDACTED_TASK] cwd=%s" % (profile, cwd_path)
    if profile == "fable5":
        if os.environ.get("HERMES_ALLOW_FABLE5_PROVIDER_CALL") != "1":
            return "[blocked] fable5 provider call requires HERMES_ALLOW_FABLE5_PROVIDER_CALL=1"
        if not os.environ.get("OPENROUTER_API_KEY"):
            return "[blocked] fable5 provider call requires OPENROUTER_API_KEY presence"
    try:
        result = subprocess.run(cmd, cwd=cwd_path, capture_output=True, text=True, timeout=600)
        output = result.stdout.strip() or result.stderr.strip()
        return redact(output)[:3500]
    except FileNotFoundError:
        return "[error] codex CLI not found in PATH"
    except subprocess.TimeoutExpired:
        return "[error] Codex timed out after 10 minutes"


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "GHOSTCLAW Hermes Command Center\n"
        f"Mode: {'DRY_RUN_ONLY' if DRY_RUN_ONLY else 'LIVE_EXECUTION'}\n"
        "Risky tasks require approval. Secrets are redacted in receipts."
    )


async def cmd_quota(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"Fable5 weekly quota status: {check_fable5_quota()}")


async def handle_task(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_chat_id = int(os.environ["TELEGRAM_ADMIN_CHAT_ID"])
    if update.effective_chat.id != admin_chat_id:
        await update.message.reply_text("ไม่ได้รับอนุญาต")
        return

    task_text = update.message.text or ""
    choice = classify_model(task_text)

    if choice.profile == "fable5" and check_fable5_quota() == "near_limit":
        choice = ModelChoice("glm", "GLM-5.2", "Fable5 quota ใกล้หมด จึง fallback")

    task_id = f"task_{int(time.time())}"
    PENDING[task_id] = {"text": task_text, "choice": choice, "cwd": str(REPO)}

    if is_risky(task_text):
        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("✅ Approve", callback_data=f"approve:{task_id}"),
            InlineKeyboardButton("❌ Deny", callback_data=f"deny:{task_id}"),
        ]])
        write_receipt(task_id, {"status": "pending_approval", "task": task_text, "model": choice.profile, "risky": True})
        await update.message.reply_text(
            f"⚠️ งานนี้ถูก flag ว่าเสี่ยง\nโมเดล: {choice.label}\nเหตุผล: {choice.reason}\nต้อง Approve ก่อน",
            reply_markup=keyboard,
        )
        return

    write_receipt(task_id, {"status": "auto_approved_dry_run" if DRY_RUN_ONLY else "auto_approved", "task": task_text, "model": choice.profile, "risky": False})
    output = await asyncio.to_thread(run_codex, task_text, choice.profile, str(REPO))
    write_receipt(task_id + "_result", {"status": "completed", "task": task_text, "model": choice.profile, "output": output})
    await update.message.reply_text(f"ผลลัพธ์:\n{output}")


async def handle_approval(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_chat_id = int(os.environ["TELEGRAM_ADMIN_CHAT_ID"])
    query = update.callback_query
    await query.answer()
    action, task_id = query.data.split(":", 1)
    task = PENDING.get(task_id)
    if not task:
        await query.edit_message_text("Task หมดอายุหรือถูกจัดการไปแล้ว")
        return
    if action == "deny":
        write_receipt(task_id, {"status": "denied", "task": task["text"]})
        await query.edit_message_text("❌ Denied — ไม่รันงานนี้")
        PENDING.pop(task_id, None)
        return
    choice: ModelChoice = task["choice"]
    await query.edit_message_text(f"✅ Approved — กำลังรันด้วย {choice.label}...")
    output = await asyncio.to_thread(run_codex, task["text"], choice.profile, task["cwd"])
    write_receipt(task_id, {"status": "approved_and_executed_dry_run" if DRY_RUN_ONLY else "approved_and_executed", "task": task["text"], "model": choice.profile, "output": output})
    await context.bot.send_message(chat_id=admin_chat_id, text=f"ผลลัพธ์ ({task_id}):\n{output}")
    PENDING.pop(task_id, None)


def main() -> int:
    msg, code = require_live_gate()
    if code != 0:
        log.error("Hermes blocked: %s", msg)
        return code
    bot_token = os.environ["TELEGRAM_BOT_TOKEN"]
    app = Application.builder().token(bot_token).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("quota", cmd_quota))
    app.add_handler(CallbackQueryHandler(handle_approval))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_task))
    log.info("Hermes Command Center starting. dry_run_only=%s", DRY_RUN_ONLY)
    app.run_polling()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
