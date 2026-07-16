# OpenCut Integration Plan

## 🔍 OpenCut คืออะไร

OpenCut คือ **free and open-source video editor** สำหรัับ web, desktop, และ mobile

### เวอร์ชันใหม่ (OpenCut-app/OpenCut)
- กำลังถูกเขียนใหม่หมด
- Rust core + Web frontend
- มี MCP server สำหรับ AI agents
- Headless mode สำหรับ automation/batch rendering

### เวอร์ชันเดิม (opencut-classic)
- Next.js web application
- Native desktop app (GPUI)
- Rust/WASM core สำหรับ GPU compositor

---

## 🎯 จุดที่น่าสนใจกับ sirinx-os

### 1. MCP Server
- OpenCut มี MCP server สำหรับ AI agents
- สามารถเชื่อมต่อกับ Hermes/Codex/Hermes AI system ได้

### 2. Rust Core
- sirinx-os มี GHOSTCLAW Rust components
- สามารถใช้ WASM bindings ร่วมกัน

### 3. Automation Ready
- Headless mode เหมาะกับ automation workflows
- สามารถทำให้ AI สร้างวิดีโออัตโนมัติ

---

## 📁 โครงสร้าง Repo

### OpenCut (ใหม่)
```
apps/
├── api/     # API server (localhost:8787)
├── desktop/ # Desktop app
├── web/     # Web app (localhost:5173)
.moon/       # Moon workspace
Cargo.toml   # Rust project
```

### opencut-classic (เดิม)
```
apps/
├── web/     # Next.js app (localhost:3000)
├── desktop/ # GPUI desktop
rust/        # Rust core + WASM
```

---

## 🔗 Integration Points

### 1. MCP Integration
```
Hermes → MCP Client → OpenCut MCP Server → Video Editing
```

### 2. Workflow Integration
```
SIRINX OS
├── Image Studio
├── Creative Studio (After Effects MCP)
└── Video Studio (OpenCut MCP)
```

### 3. API Integration
- เพิ่ม API endpoint สำหรับ video job queue
- ใช้ Sirinxx asset registry เก็บไฟล์

---

## 🛡️ Security Considerations

1. **Rust Core** - ปลอดภัยสำหรับ local processing
2. **MCP Server** - ควบคุมจาก sirinx-os MCP policy
3. **Headless Mode** - ไม่มี external send เริ่มต้น
4. **Asset Storage** - ใช้ sirinx-os data/generated-assets

---

## 📋 แผนการทำงาน

### Phase 1: Research & Integration Plan
- [x] วิเคราะห์ repo structure
- [ ] สร้าง knowledge pack
- [ ] วิเคราะห์ MCP server capabilities

### Phase 2: MCP Integration (Dry-run)
- [ ] เพิ่ม OpenCut MCP ลงใน `.mcp.json`
- [ ] สร้าง test harness
- [ ] ทดสอบ basic operations

### Phase 3: SIRINX OS Integration
- [ ] สร้าง video job API
- [ ] เพิ่ม video studio UI
- [ ] เชื่อมต่อกับ asset registry

### Phase 4: Production (Needs Approval)
- [ ] Human approval ก่อนเปิด headless mode
- [ ] เพิ่ม render automation workflows

---

## 🔗 URLs

| Resource | Link |
|----------|------|
| Main Repo | https://github.com/OpenCut-app/OpenCut |
| Classic Repo | https://github.com/opencut-app/opencut-classic |
| Live Demo | https://opencut.app |
| Discord | https://discord.gg/zmR9N35cjK |