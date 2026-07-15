# End-to-End Goal Specification

**Goal:** ผสาน SIRINX Skills Kit เข้ากับ sirinx-os เพื่อสร้าง AI-Powered Development + Marketing Automation Platform

---

## 🎯 Ultimate Goal

### Vision Statement
เปลี่ยน sirinx-os ให้เป็น **Autonomous AI Agent Platform** ที่ทำงานได้เอง 4 ด้าน:
- **Development** - ออกแบบ/เขียนโค้ดอัตโนมัติ
- **Knowledge** - สร้าง Knowledge Base จาก Web
- **Creative** - สร้างภาพ/วิดีโอโดยอัตโนมัติ
- **Marketing** - แผน/โพสต์โซเชียลอัตโนมัติ

---

## 📋 Integration Spec

### Phase 1: Development Automation

**Skills Used:**
- `autonomous-task-planner` + `system-design-architect` → `senior-fullstack-builder` → `evidence-verifier`

**Flow:**
```
User Request
    ↓
autonomous-task-planner (แผนงาน)
    ↓
system-design-architect (ออกแบบ)
    ↓
senior-fullstack-builder (เขียนโค้ด)
    ↓
evidence-verifier (ตรวจสอบ)
    ↓
Commit Ready
```

**Success Metrics:**
- งานเสร็จภายใน 2-5 นาที/task
- Evidence record ครบ
- Safety gate pass

---

### Phase 2: Knowledge Integration

**Skills Used:**
- `web-scraper-kb-builder` → `knowledge-sync-engine`

**Flow:**
```
Target URL
    ↓
web-scraper-kb-builder (scrape)
    ↓
SQLite knowledge-base.sqlite (เก็บ)
    ↓
knowledge-sync-engine (Obsidian sync)
    ↓
Ready for RAG
```

**Success Metrics:**
- ข้อมูลอ่านได้จาก knowledge-base.sqlite
- Obsidian pulse สร้างอัตโนมัติ

---

### Phase 3: Creative Automation

**Skills Used:**
- `marketing-visual-creator` + `auto-video-editor` → `ai-content-factory`

**Flow:**
```
Content Idea
    ↓
marketing-visual-creator (สร้างภาพ)
    ↓
auto-video-editor (ตัดวิดีโอ)
    ↓
ai-content-factory (ประกอบทำเป็นเนื้อหา)
    ↓
data/generated-* (ผลลัพธ์)
```

**Success Metrics:**
- ภาพ/วิดีโอออกมาใช้ได้
- เก็บไฟล์ครบ

---

### Phase 4: Marketing Automation

**Skills Used:**
- `social-media-auto-poster` + `brand-asset-generator`

**Flow:**
```
Marketing Goal
    ↓
brand-asset-generator (สร้างแบรนด์)
    ↓
ai-content-factory (สร้างเนื้อหา)
    ↓
social-media-auto-poster (แผนโพสต์)
    ↓
Ready to Post (ยังไม่โพสต์จริง)
```

**Success Metrics:**
- แผนโพสต์ครบทุกแพลตฟอร์ม
- Content calendar สร้างอัตโนมัติ

---

## 🔗 sirinx-os Integration Points

### Services ที่เชื่อม

| sirinx-os Service | Skills Used |
|-------------------|-------------|
| `services/dev-control-api` | codex-workflow-synthesizer |
| `services/hermes-api` | knowledge-sync-engine, mcp-integration-manager |
| `apps/dev-dashboard` | all automation skills |
| `apps/live-agent-studio` | web-scraper-kb-builder |
| `data/knowledge-base.sqlite` | web-scraper-kb-builder |
| `.mcp.json` | mcp-integration-manager |

### API Endpoints ใหม่

```typescript
// services/skills-api/src/skills-router.ts
GET /api/skills/list
GET /api/skills/:name/execute
POST /api/skills/orchestrate
POST /api/skills/knowledge/scrape
POST /api/skills/content/create
POST /api/skills/social/post
```

---

## 🛡️ Safety Gates

### Required Gates
| Action | Gate | Skill |
|--------|------|-------|
| Skill execution | Task ID lease | safety-gate-enforcer |
| MCP add | Policy review | mcp-integration-manager |
| Web scrape | robots.txt check | web-scraper-kb-builder |
| File write | Approval required | senior-fullstack-builder |
| Git push | Exact approval | safety-gate-enforcer |
| Social post | Content approval | social-media-auto-poster |

### Validation Flow
```
Skill Request
    ↓
safety-gate-enforcer.validate()
    ↓
mcp-integration-manager.check()
    ↓
evidence-verifier.prove()
    ↓
Execute / Block
```

---

## 📊 Evidence Requirements

### Per Phase
```
Phase 1:
- design-document.md
- code-changes.diff
- test-results.passed
- evidence-verifier-checklist.md

Phase 2:
- scraped-content.json
- knowledge-base.sqlite entry
- obsidian-pulse.md

Phase 3:
- generated-assets/
- content-spec.md
- render-evidence.json

Phase 4:
- content-calendar.md
- brand-kit.zip
- post-schedule.json
```

---

## 🚀 Delivery Milestones

### Milestone 1: Skills Core (NOW)
- [x] 23 Skills สร้างแล้ว
- [x] GitHub repo เผยแพร่
- [x] Skeleton + Schema สร้างแล้ว

### Milestone 2: Integration (Next)
- [ ] sirinx-os skills-api service
- [ ] MCP servers integration
- [ ] Knowledge Base connection

### Milestone 3: Automation (Future)
- [ ] Full workflow orchestration
- [ ] Content creation pipeline
- [ ] Social posting scheduler

### Milestone 4: Production (Planned)
- [ ] R0 Gate approval
- [ ] Production deployment
- [ ] Live automation

---

## 🔧 Implementation Checklist

- [ ] Create skills-api service
- [ ] Wire MCP servers (Firecrawl, etc.)
- [ ] Connect to knowledge-base.sqlite
- [ ] Add skill-execution endpoints
- [ ] Create orchestration workflow
- [ ] Safety validation integration
- [ ] Obsidian sync automation
- [ ] Content pipeline setup