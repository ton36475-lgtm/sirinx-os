# Firecrawl Integration Knowledge

**Source**: https://github.com/firecrawl/firecrawl
**Category**: Web Scraping / RAG
**License**: MIT

## Key Features
- Search the web and get full page content from results
- Scrape any URL to markdown, HTML, screenshots, or structured JSON
- Handle JS-heavy pages (96% web coverage)
- API ready with Python, Node.js, CLI support

## Endpoints Available
1. **Search** - Web search with full content
2. **Scrape** - Single page extraction
3. **Interact** - AI prompts on pages
4. **Agent** - Autonomous data gathering
5. **Crawl** - All URLs of a website
6. **Map** - Discover all URLs on a website
7. **Batch Scrape** - Multiple URLs asynchronously

## Quick Start
```bash
# Sign up at firecrawl.dev for API key
firecrawl search "firecrawl" --limit 5
firecrawl scrape https://firecrawl.dev --only-main-content
```

## Integration Points
- MCP client compatible
- LLM-ready output
- Connect via single command to agents

---
*Auto-crawled on: 2026-07-15*