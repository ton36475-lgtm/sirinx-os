# Web Knowledge Base Structure

## โครงสร้าง

```
kms/web-knowledge/
├── crawled-sources.yaml     # รายการแหล่งที่ crawl
├── knowledge-pipeline.yaml  # ขั้นตอนการประมวลผล
├── sources/               # ข้อมูลดิบจากแหล่งต่างๆ
│   ├── ai-tools/          # ข้อมูลเครื่องมือ AI
│   ├── solar-energy/      # ข้อมูล Solar/PV
│   └── research/          # ข้อมูลการวิจัย
└── processed/             # ข้อมูลที่ประมวลผลแล้ว
    ├── summaries/
    └── embeddings/
```

## แหล่งข้อมูลที่ crawl (ตามข้อมูลที่ได้)

1. **Firecrawl** (mendableai/firecrawl)
   - GitHub: https://github.com/mendableai/firecrawl
   - ใช้สำหรับ: Web scraping, RAG dataset

2. **Page Agent** (Alibaba)
   - GitHub: ค้นหาจากข้อมูล
   - ใช้สำหรับ: AI Web Automation

3. **MCP Servers**
   - GitHub: https://github.com/modelcontextprotocol/servers
   - ใช้สำหรับ: Tool integration

4. **BrowserOS**
   - GitHub: https://github.com/browseros-ai/BrowserOS
   - ใช้สำหรับ: AI Browser Runtime

5. **obra/superpowers**
   - GitHub: https://github.com/obra/superpowers
   - ใช้สำหรับ: AI Coding Workflow