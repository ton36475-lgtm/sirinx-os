# HERMES_COMMAND_CENTER_INTEGRATION.md
## Omnigent + GHOSTCLAW Integration Plan

### Command Center Architecture
```
[Hermes Command Center]
        ↓
[Agent Router] → Claude Code | Codex | OpenCode | Cursor
        ↓
[Policy Engine] → Cost Guard | Approval Gate | Rate Limit
        ↓
[Evidence Ledger] → SHA256 Chain + Obsidian Sync
```

### Files to Create
1. `services/command-center/` - หัวใจระบบ
2. `services/command-center/router.rs` - ตัวกระจายงาน
3. `services/command-center/policy.rs` - ระบบ policy
4. `services/command-center/evidence_chain.rs` - บันทึกหลักฐาน

### Integration Points
- **Telegram** → `/approve` `/status` `/abort` commands
- **Obsidian** → Auto-sync ผลงาน
- **Cloudflare Workers** → WASM deployment
- **Supabase** → Task persistence

---

รอ explicit approval เพื่อเริ่ม Stage 2 (Providers) ของ GHOSTCLAW - ทุก ๆ approval จะถูกบันทึกลง ledger