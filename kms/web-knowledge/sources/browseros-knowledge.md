# BrowserOS - AI Browser Runtime

**Source**: https://github.com/browseros-ai/BrowserOS
**Category**: AI Browser
**License**: AGPL-3.0
**Stars**: ~12K

## จุดเด่น
- Chromium fork ที่ฝัง AI Agent ไว้ใน Browser
- มากกว่า 53 AI Automation Tools
- Cowork Mode - Agent ทำงานข้ามเว็บและไฟล์ในเครื่อง
- Scheduled Tasks - ทำงานอัตโนมัติ
- รองรับ Local Model (Ollama, LM Studio)

## การเชื่อม MCP
- มี MCP Server ในตัว
- เชื่อมกับ Claude Code, Gemini CLI หรือ MCP Client อื่น
- เชื่อมต่อ 40+ services

## การติดตั้ง
```bash
# Clone repo
git clone https://github.com/browseros-ai/BrowserOS
cd BrowserOS
# Build ตามเอกสาร
```

## Security Position
- LOCAL_AI_PUBLIC_ACCESS = false
- MCP_DRY_RUN = true (default)
- ใช้ใน local environment ก่อน

---
*Auto-crawled on: 2026-07-15*