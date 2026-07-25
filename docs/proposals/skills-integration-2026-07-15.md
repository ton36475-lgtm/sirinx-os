# Proposal: GhostClaw OS Skills Kit Integration

**Date:** 2026-07-15
**Author:** GhostClaw Team
**Status:** Draft - Awaiting Approval

---

## Part A: Real-time WebSocket Sync

### Goal
เพิ่ม WebSocket real-time sync ระหว่าง Skills API ↔ GhostClaw OS Agents

### Constraints
- ใช้ ws://localhost:8888 (local only)
- DRY-RUN mode เท่านั้น
- ไม่มี external connections
- ไม่มี secrets ใน connection

### File Scope
```
/services/skills-api/src/
  ├── websocket-server.mjs    ← NEW
  └── lib/skills-stream.mjs   ← NEW
```

### Expected Result
- แสดง real-time skill execution status
- Broadcast agent messages
- Live knowledge sync

### Verification
```bash
# Start server
npm run dev

# Test connection
node -e "const ws = new WebSocket('ws://localhost:8888'); ws.on('open', () => console.log('✓'))"
```

---

## Part B: GitHub Actions Auto-Deploy

### Goal
เพิ่ม GitHub Actions workflow สำหรับ auto-deploy Skills Kit ไป sirinx-os

### Constraints
- Deploy เฉพาะ branch `staging/*`
- ต้องผ่าน safety scan ก่อน
- Manual trigger only
- NO production deploy

### File Scope
```
.github/workflows/
  └── skills-kit-deploy.yml    ← NEW

/services/skills-api/
  └── Dockerfile              ← NEW (for staging deploy)
```

### Expected Result
- Auto deploy ไป staging.sirinx.co เมื่อ merge staging/*
- Run safety scan อัตโนมัติ
- ไม่มี push โดยไม่ได้กล่อง

### Verification
```bash
# Check workflow syntax
act -W .github/workflows/skills-kit-deploy.yml -P ubuntu-latest

# Test safety scan
node scripts/secret-scan.mjs
```

---

## การอนุมัติโดยแยก

**อนุมัติ Part A (WebSocket):** ใช้คำสั่ง `/approve websocket-sync`

**อนุมัติ Part B (GitHub Actions):** ใช้คำสั่ง `/approve skills-deploy-actions`

**อนุมัติทั้งหมด:** ใช้คำสั่ง `/approve ghostclaw-skills-integration`

---

**Safety:** ไม่มี commit/push/deploy จริงหากไม่ได้อนุมัติ

**Evidence:** `/docs/proposals/skills-integration-2026-07-15.md`