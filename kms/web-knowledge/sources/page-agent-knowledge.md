# Page Agent (Alibaba) - AI Web Automation

**Source**: Alibaba GitHub
**Category**: AI Web Automation
**License**: Unknown

## จุดเด่น
- ฝัง JavaScript SDK ลงเว็บได้เลย
- สั่งงานด้วยภาษาธรรมชาติ
- อ่าน DOM แบบ Text (ไม่ใช่ Screenshot)
- Bring Your Own LLM (Qwen, OpenAI, Claude, Gemini, DeepSeek, Ollama)

## การใช้งาน
```javascript
// ฝัง SDK ลงหน้าเว็บ
<script src="page-agent-sdk.js"></script>

// สั่ง AI กรอกฟอร์ม
await pageAgent.act("กรอกฟอร์มสร้างออเดอร์ให้หน่อย");
```

## Security Notes
- ควรเชื่อม LLM ผ่าน Backend Proxy
- ห้ามฝัง API Key จริงไวล์ Frontend
- Demo API ใช้เพื่อการทดสอบเท่านั้น

---
*Auto-crawled on: 2026-07-15*