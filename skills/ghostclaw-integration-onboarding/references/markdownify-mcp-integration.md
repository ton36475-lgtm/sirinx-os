# Markdownify MCP Integration Notes

## Source
- GitHub: https://github.com/zcaceres/markdownify-mcp
- Stars: 2,842
- License: MIT
- Language: TypeScript (Bun) + Python (markitdown)

## Installation (VERIFIED 2026-07-16)

```bash
cd /Users/sirinx/sirinx-os/integrations
git clone --depth=1 https://github.com/zcaceres/markdownify-mcp.git markdownify-mcp
cd markdownify-mcp
bun install          # 230 packages + creates .venv with markitdown preinstall
bun run build        # tsc → dist/index.js
```

### If markitdown missing from venv
```bash
.venv/bin/pip install "markitdown[all]"
# Installs: pdfminer-six, python-pptx, openpyxl, mammoth, pandas, pydub, speechrecognition, youtube-transcript-api, etc.
```

### Verified markitdown works
```bash
.venv/bin/python3 -c "from markitdown import MarkItDown; m=MarkItDown(); print(m.convert('/tmp/test.md').text_content)"
# Output: file content as markdown
```

## MCP Tools (11)
1. `pdf-to-markdown` — PDF → Markdown via pdfminer-six
2. `image-to-markdown` — Image → Markdown with metadata
3. `audio-to-markdown` — Audio → transcription via speechrecognition
4. `docx-to-markdown` — Word → Markdown via mammoth
5. `xlsx-to-markdown` — Excel → Markdown via openpyxl
6. `pptx-to-markdown` — PowerPoint → Markdown via python-pptx
7. `youtube-to-markdown` — YouTube video → transcript
8. `bing-search-to-markdown` — Bing search results → Markdown
9. `webpage-to-markdown` — Web page → Markdown
10. `git-repo-to-markdown` — Git repo → Markdown via repomix
11. `get-markdown-file` — Retrieve existing .md file

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `MARKITDOWN_PATH` | `.venv/bin/markitdown` then `markitdown` on PATH | Absolute path to markitdown executable |
| `REPOMIX_PATH` | `node_modules/.bin/repomix` then `repomix` on PATH | Path to repomix for git-repo-to-markdown |
| `MD_ALLOWED_PATHS` | unset (unrestricted) | Colon-separated read boundary for file-input tools |
| `MD_SHARE_DIR` | unset | Deprecated alias for `MD_ALLOWED_PATHS` |

## MCP Config (for Claude Code / Cursor / Codex)
```json
{
  "mcpServers": {
    "markdownify": {
      "command": "node",
      "args": ["/Users/sirinx/sirinx-os/integrations/markdownify-mcp/dist/index.js"],
      "env": {
        "MD_ALLOWED_PATHS": "/Users/sirinx/sirinx-os:/Users/sirinx/Documents"
      }
    }
  }
}
```

## Testing the MCP Server
MCP servers use stdio protocol — they exit immediately if run in foreground without stdin input.

```bash
# Test tools/list
printf '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}\n{"jsonrpc":"2.0","method":"tools/list","id":2}\n' | node dist/index.js
```

## Disk Impact
- node_modules: ~230 packages
- .venv: markitdown[all] adds pdfminer, pandas, numpy, openpyxl, etc. (~300MB)
- Total footprint: ~350MB
