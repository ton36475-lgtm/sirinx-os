# OpenCut Knowledge Pack

## โครงสร้างโปรเจกต์

### แพลตฟอร์ม
- **Web**: localhost:5173
- **API**: localhost:8787 (Cloudflare Workers)
- **Desktop**: กำลังพัฒนา

### เทคโนโลยีหลัก
- **Runtime**: Rust core + Bun/TypeScript
- **Framework**: 
  - API: Elysia (Bun) + Cloudflare Workers
  - Web: ไม่ระบุชัด (โดยปกติ Next.js หรือ Bun)
- **Build**: Moon workspace (proto toolchain)

---

## จุดเชื่อม MCP

### 1. Video Editing as a Tool
```
AI Agent → MCP Client → OpenCut MCP → Render Video
```

### 2. ฟีเจอร์ MCP ที่น่าสนใจ
- Timeline manipulation
- Effects application
- Project management
- Export automation

---

## Integration Points กับ sirinx-os

### sirinx-os Components ที่เกี่ยวข้อง
1. **Asset Registry** (`packages/asset-registry/`)
2. **Image Gateway** (`services/image-gateway/`)
3. **Local AI Runtime** (`packages/local-ai-gateway/`)
4. **Creative Orchestrator** (`services/creative-orchestrator/`)

### แผนเชื่อม
```
sirinx-os/
├── services/video-gateway/     ← NEW
│   ├── src/mcp-client.ts       ← Connect to OpenCut MCP
│   ├── src/job-queue.ts        ← Video job queue
│   └── src/render-api.ts       ← Render endpoints
├── apps/video-studio/         ← NEW
│   └── studio.tsx             ← Video editor UI
└── data/generated-video/      ← Video output directory
```

---

## Environment Variables (จาก package.json)

```json
{
  "scripts": {
    "dev": "wrangler dev",        // API: localhost:8787
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy"
  }
}
```

---

## Security Notes

- **Privacy-first**: Videos stay on device (ตาม opencut-classic README)
- **MCP Safety**: ใช้ sirinx-os MCP_DRY_RUN policy
- **Asset Isolation**: ใช้ sirinx-os data/generated-video directory

---

## ขั้นตอนต่อไป

1. เพิ่ม OpenCut MCP server (ถ้ามี) ใน `.mcp.json`
2. สร้าง video-gateway service
3. เพิ่ม video-studio app
4. เชื่อมต่อกับ asset-registry

---
*Auto-researched on: 2026-07-15*