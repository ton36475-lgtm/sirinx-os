# MCP And Connector Map

## Active Local MCP

`sirinx-files` is active for thClaws and mirrored for Claude-compatible tools:

```text
/Users/sirinx/sirinx-os
/Users/sirinx/Documents/Obsidian Vault
/Users/sirinx/OZ-CORP-MONOREPO/knowledge/obsidian
```

## Codex Plugin Surfaces

Use these from Codex when needed:

- Chrome: logged-in browser/session-dependent web work.
- Computer Use: macOS UI control when no API/tool path exists.
- Browser: local app/browser QA.
- OpenAI Developers: OpenAI API, Agents SDK, ChatGPT Apps work.
- Supabase: project database/Auth/Storage work.
- ClickUp: project task/workflow work.
- Notion: docs, tasks, and knowledge capture.
- Google Drive: Drive, Docs, Sheets, Slides.
- GitHub: repositories, issues, pull requests, CI.
- Figma: design implementation and design system work.
- Canva: design creation/editing/export workflows.

## Approval Rules

Read-only inspection is allowed.

Human approval required:

- create/update/delete in external SaaS
- Git push, PR creation, issue creation
- Supabase writes or migrations
- Google Drive/Notion/ClickUp writes
- Figma/Canva writes or exports
- paid API calls
- public deployment
