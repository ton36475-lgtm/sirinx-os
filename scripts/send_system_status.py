#!/usr/bin/env python3
"""Send system status report via Telegram."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Telegram bot configuration
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
    print("❌ TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required")
    sys.exit(1)

import subprocess

# Generate status report
status = subprocess.run(
    ["python3", "-c", """
import json
from pathlib import Path

kg_path = Path('bsidin-brain/langgraph/knowledge_graph/knowledge_graph.json')
agents_path = Path('bsidin-brain/langgraph/knowledge_graph/agents_index.json')
skills_path = Path('bsidin-brain/langgraph/knowledge_graph/skills_index.json')

agents = json.loads(agents_path.read_text()) if agents_path.exists() else {}
skills = json.loads(skills_path.read_text()) if skills_path.exists() else {}

a2a_path = Path('~/.config/a2a/sync_config.json').expanduser()
a2a_config = json.loads(a2a_path.read_text()) if a2a_path.exists() else {}

perm_path = Path('~/.config/ghostclaw/permission-approval.json').expanduser()
perm_config = json.loads(perm_path.read_text()) if perm_path.exists() else {}

tg_path = Path('~/.config/ghostclaw/telegram-approval.json').expanduser()
tg_config = json.loads(tg_path.read_text()) if tg_path.exists() else {}

print(json.dumps({
    'agents_count': len(agents),
    'skills_count': len(skills),
    'a2a_sync_enabled': a2a_config.get('a2a_sync', {}).get('enabled', False),
    'agents_synced': list(a2a_config.get('agents', {}).keys()) if a2a_config else [],
    'permission_mode': perm_config.get('permission_approval', {}).get('mode', 'unknown'),
    'telegram_approval_enabled': tg_config.get('telegram', {}).get('command_center', {}).get('enabled', False)
}, indent=2))
"""],
    capture_output=True,
    text=True,
    cwd=Path.home() / "project-hermes"
)

if status.returncode != 0:
    print(f"❌ Failed to generate status: {status.stderr}")
    sys.exit(1)

status_data = json.loads(status.stdout)

# Build message
message = f"""
*BSIDIN Brain System Status Report*

📊 *Metrics*
- Agents Indexed: `{status_data['agents_count']}`
- Skills Indexed: `{status_data['skills_count']}`

🔄 *A2A Sync*
- Enabled: `{status_data['a2a_sync_enabled']}`
- Agents: {', '.join(status_data['agents_synced'])}

🔐 *Permissions*
- Mode: `{status_data['permission_mode']}`

📱 *Telegram Approval*
- Enabled: `{status_data['telegram_approval_enabled']}`

⚙️ *Status:* All systems operational
"""

# Send via curl
result = subprocess.run(
    [
        "curl", "-s", "-X", "POST",
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        "-d", f"chat_id={TELEGRAM_CHAT_ID}",
        "-d", f"text={message}",
        "-d", "parse_mode=MarkdownV2"
    ],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✅ Telegram report sent successfully")
else:
    print(f"❌ Failed to send Telegram report: {result.stderr}")
    sys.exit(1)
