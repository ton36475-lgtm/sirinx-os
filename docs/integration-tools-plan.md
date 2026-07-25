# แผนการติดตั้ง Integration Tools

## สภาพแวดล้อมปัจจุบัน

### Repo Structure
- Monorepo with pnpm workspaces
- Apps: dev-dashboard, live-agent-studio, sirinx-site, solar-intelligence
- Services: dev-control-api, hermes-api
- MCP Servers: sirinx-files, supabase, unreal-engine, linear

### Tools ที่มีอยู่
- Chrome DevTools MCP (hermes-browser-automator)
- Computer use (macOS background control)
- Native MCP client

---

## แผนการติดตั้งแต่ละระบบ

### 1. Firecrawl - Web Scraping สำหรับ RAG

**วิธีการติดตั้ง:**
- เพิ่ม `firecrawl-mcp` เป็น MCP Server ใน `.mcp.json`
- ใช้สำหรับ scrape ข้อมูลจากเว็บไซต์สู่ Knowledge Base

**Configuration:**
```json
"firecrawl": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "firecrawl-mcp"]
}
```

**ใช้สำหรับ:**
- สร้าง dataset จากเว็บไซต์
- สนับสนุน RAG pipeline
- Knowledge Base สำหรับ AI agents

### 2. Page Agent - AI Web Automation

**วิธีการตั้งค่า:**
- JavaScript SDK ที่ฝังลงเว็บ
- ไม่ใช่ MCP Server แต่เป็น library
- ใช้ภายใต้ BrowserOS หรือ Chrome DevTools MCP

**การฝัดตั้ง:**
- เพิ่ม SDK script ใน apps ที่ต้องการ
- กำหนด policy สำหรับ web automation

### 3. MCP Servers - modelcontextprotocol/servers

**Servers ที่ควรเพิ่ม:**
- filesystem (ไปละ)
- fetch (API calls)
- git (repo management)
- sqlite (local database)
- time (scheduling)

**Installation:**
ใช้ `@modelcontextprotocol/server-*` แต่ละตัว
- รันผ่าน stdio
- ไม่เก็บ secrets

### 4. BrowserOS - AI Browser Runtime

**Configuration:**
- เป็น Chromium fork
- ควร run ใน local environment
- เชื่อมกับ MCP ผ่าน bridge

**Security:**
- LOCAL_AI_PUBLIC_ACCESS=false
- MCP_DRY_RUN=true
- ไม่เปิด public access

### 5. obra/superpowers - AI Coding Workflow

**สกิลที่เลือกใช้:**
1. brainstorming - สัมภาษณ์และออกแบบ
2. writing-plans - แผนการทำงาน
3. subagent-driven-development - แต่งานให้ subagents
4. test-driven-development - TDD
5. systematic-debugging - debug 4 phase

**การติดตั้ง:**
- ใช้ใน Claude Code
- หรือสร้าง workflow เสมือนใน sirinx-os

---

## การดำเนินการตาม AGENTS.md

### Safety Gates
- [x] ไม่มี hardcoded API keys
- [x] .env ไม่ถูก commit
- [x] MCP_DRY_RUN=true
- [ ] ตรวจสอบ robots.txt ก่อน scrape

### Tool Classification
- Firecrawl MCP: T5 (External API dry-run)
- Page Agent: T4 (Local AI inference)
- MCP Servers: T1-T4 ตามประเภท
- BrowserOS: T4 (Local inference)

### การเชื่อม MCP
- อัปเดต .mcp.json
- ไม่เปิด external actions
- ใช้ dry-run mode ก่อน production

---

## ขั้นตอนต่อไป

1. เพิ่ม Firecrawl MCP Server
2. สร้าง Knowledge Base structure
3. ทดสอบ scrape ข้อมูลจากเว็บไซต์ตัวอย่าง
4. เพิ่ม MCP servers อื่นๆ ที่ปลอดภัย
5. สร้าง workflow สำหรับ obra/superpowers