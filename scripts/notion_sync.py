#!/usr/bin/env python3
# Notion Vault Sync Script
# Syncs Obsidian notes to Notion database

import os
import json
from datetime import datetime

NOTION_API_KEY = os.getenv('NOTION_API_KEY', 'placeholder')
DATABASE_ID = os.getenv('NOTION_DATABASE_ID', 'placeholder')

def sync_note(note_path: str) -> dict:
    """Sync single markdown note to Notion"""
    title = os.path.basename(note_path).replace('.md', '')
    
    payload = {
        "object": "page",
        "parent": {"database_id": DATABASE_ID},
        "properties": {
            "Title": {"title": [{"text": {"content": title}}]},
            "Synced": {"checkbox": True},
            "Timestamp": {"date": {"start": datetime.utcnow().isoformat()}}
        }
    }
    
    return payload

if __name__ == "__main__":
    print("Notion sync stub ready - set NOTION_API_KEY and DATABASE_ID to run")