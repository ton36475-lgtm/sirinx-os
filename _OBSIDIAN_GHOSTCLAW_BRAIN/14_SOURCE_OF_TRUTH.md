# 14 — Source of Truth

**Purpose:** Canonical reference files and their priority order

---

## Canonical Sources (Priority Order)

| Priority | File | Scope |
|---|---|---|
| 1 | Current Operator instruction | This mission |
| 2 | `AGENTS.md` (root) | Global safety rules |
| 3 | `GHOSTCLAW/AGENTS.md` | GHOSTCLAW constitution |
| 4 | `GHOSTCLAW/MASTER.md` | Master architecture |
| 5 | `_OBSIDIAN_GHOSTCLAW_BRAIN/01_PROJECT_CONTRACT.md` | Project scope |
| 6 | `PROJECT_STATE.md` | Current verified state |
| 7 | `GHOSTCLAW/FLEET_ORCHESTRATOR.md` | Fleet/Ship/Crew spec |
| 8 | `GHOSTCLAW/COMMAND_BROKER.md` | Command broker policy |
| 9 | `GHOSTCLAW/protocols/A2A2A_PROTOCOL.md` | A2A2A spec |
| 10 | `.thclaws/kms/sirinx-brain/` | Agent-readable KMS |

## Conflict Resolution

If sources conflict:
```
1. Stricter safety rule wins
2. Newer project state beats older memory
3. AGENTS.md beats everything except Operator instruction
4. When in doubt → escalate to Hermes → Operator
```

## Forbidden as Source of Truth

- ❌ Unverified notes
- ❌ Old session transcripts
- ❌ Speculation without source
- ❌ .env files
- ❌ Secrets
- ❌ External URLs without local copy
