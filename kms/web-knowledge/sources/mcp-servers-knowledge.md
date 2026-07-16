# MCP Servers Reference

**Source**: https://github.com/modelcontextprotocol/servers
**Category**: MCP Integration
**License**: MIT

## Reference Servers (TypeScript)

| Server | Purpose | Usage |
|--------|---------|-------|
| **Everything** | Test server | Prompts, resources, tools |
| **Fetch** | Web fetching | Content conversion for LLM |
| **Filesystem** | File operations | Secure with access controls |
| **Git** | Git operations | Read, search, manipulate repos |
| **Memory** | Knowledge graph | Persistent memory system |
| **Sequential Thinking** | Problem solving | Thought sequences |
| **Time** | Time/date | Timezone conversion |

## Installation (npx)
```bash
# Fetch server
npx -y @modelcontextprotocol/server-fetch

# Git server  
npx -y @modelcontextprotocol/server-git

# Memory server
npx -y @modelcontextprotocol/server-memory
```

## Security Model
- Servers are **reference implementations** (not production-ready)
- Developers must implement appropriate safeguards
- Use allowlist for file paths, commands

---
*Auto-crawled on: 2026-07-15*