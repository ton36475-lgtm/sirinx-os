# Skills Orchestration Master Plan

**Date:** 2026-07-15
**Source:** PROJECT_STATE.md + Skills Kit analysis

## 🎯 sirinx-os Architecture (Deep Research)

### Core Systems
```
sirinx-os/
├── sirinx-co (public website)
├── sirinx-site (brand site)
├── dev.sirinx.co (command center)
├── sirinx.app (app entry)
└── apps/
    ├── pocket-hatchery (flagship MVP)
    ├── centerbrain-shell (local hub)
    └── sirinx-site (marketing)
```

### Agent Routing (จาก AGENT_ROUTING_TABLE.md)

| Mission Type | Primary Agent | Fallback |
|--------------|--------------|----------|
| Code | Codex Builder | GLM |
| Architecture | Hermes Commander | GLM |
| Security | Security Auditor | Policy Guardian |
| Validation | Validator Worker | Test Runner |

---

## 🔄 Skills Integration Workflow

### Complete Pipeline Flow

```
User Goal
    ↓
autonomous-task-planner (แผนงาน)
    ↓
system-design-architect (ออกแแบบ)
    ↓
senior-fullstack-builder (สร้าง) ← MCP Servers
    ↓
evidence-verifier (ตรวจสอบ)
    ↓
knowledge-sync-engine (ซิงค์ Obsidian)
    ↓
codex-workflow-synthesizer (สร้าง workflow)
    ↓
marketing-visual-creator → auto-video-editor (สร้างเนื้อหา)
    ↓
social-media-auto-poster (แผนโพสต์)
    ↓
safety-gate-enforcer (ตรวจสอบสุดท้าย)
    ↓
Report
```

---

## 📊 การผสานทุก Skill

### Phase 1: Planning
1. **autonomous-task-planner** - แยกเป็น tasks เล็กๆ
2. **system-design-architect** - ออกแบบ architecture

### Phase 2: Implementation
3. **senior-fullstack-builder** - เขียนโค้ด
4. **mcp-integration-manager** - เพิ่มเครื่องมือ
5. **codebase-cartographer** - แผนการทำงาน

### Phase 3: Creation
6. **marketing-visual-creator** - สร้างภาพ
7. **auto-video-editor** - ทำวิดีโอ
8. **ai-content-factory** - ผลิตเนื้อหาครบ

### Phase 4: Verification
9. **evidence-verifier** - ตรวจสอบหลักฐาน
10. **safety-gate-enforcer** - ป้องกันภัยคุกคาปาง

### Phase 5: Delivery
11. **social-media-auto-poster** - แผนการโพสต์
12. **knowledge-sync-engine** - ซิงค์ Obsidian

---

## 🔗 Integration Points

### sirinx-os ↔ Skills Kit

| sirinx-os Component | Skills Used |
|---------------------|-------------|
| dev-dashboard | senior-fullstack-builder, evidence-verifier |
| services/dev-control-api | codex-workflow-synthesizer |
| apps/live-agent-studio | knowledge-sync-engine |
| kms/ | web-scraper-kb-builder |
| .mcp.json | mcp-integration-manager |

---

## 🛡️ Safety Validation Matrix

| Action | Gate | Skill |
|--------|------|-------|
| File edit | Task ID lease | safety-gate-enforcer |
| MCP add | Policy review | mcp-integration-manager |
| API call | Approval required | auth-skills |
| Git push | Exact approval | safety-gate-enforcer |
| Deploy | R0/R4 gates | system-design-architect |
| Social post | Approved content | social-media-auto-poster |

---

## 📈 Next Actions

1. Integrate skills เข้ากับ sirinx-os workflow
2. สร้าง orchestration script
3. เผยแพร่ sirinx-skills-kit เป็น npm package
4. สร้าง docs การใช้ skills ร่วมกับ sirinx-os