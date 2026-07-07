#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-/var/lib/ghostclaw/ghostclaw_governance.sqlite}"
BACKUP_DIR="${2:-/var/backups/ghostclaw-governance}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/ghostclaw_governance_${STAMP}.sqlite"
SHA="${OUT}.sha256"

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '${OUT}'"
shasum -a 256 "$OUT" > "$SHA"
find "$BACKUP_DIR" -type f -name 'ghostclaw_governance_*.sqlite' -mtime +14 -delete
find "$BACKUP_DIR" -type f -name 'ghostclaw_governance_*.sqlite.sha256' -mtime +14 -delete

echo "$OUT"

