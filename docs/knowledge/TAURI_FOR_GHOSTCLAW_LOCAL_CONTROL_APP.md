# Tauri for GhostClaw Local Control App

**Date:** 2026-06-30
**Policy:** Strategy doc only — no `npm create tauri-app`, no dependency install

---

## Strategy

- Tauri as desktop/mobile shell for GhostClaw local control
- IPC permission boundary: read-only by default, write requires file lease
- Dry-run create-app plan (no auto-execution)
- Mobile build pipeline: manual gate only

## IPC Boundary

| Channel | Permission | Default |
|---|---|---|
| read_status | read | allow |
| read_queue | read | allow |
| write_file | write | deny (requires lease) |
| deploy | write | deny (X-tier block) |
| push | write | deny (X-tier block) |
