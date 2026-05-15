# AI Team Runbook

## Local Model Roles

- `hermes-prime-lite`: primary agentic tool model for Hermes and thClaws.
- `deepseek-r1-lite`: lightweight reasoning sidecar for brain and planning tasks.
- `qwen2.5:latest`: fallback local tool-capable model.
- `llama3.2:3b`: lightweight chat fallback.

## Start

```bash
cd /Users/sirinx/sirinx-os
./scripts/start-sirinx-local-ai.sh
```

## Verify

```bash
./scripts/test-local-ai.sh
npm run verify
hermes doctor
hermes mcp list
hermes kanban boards list
```

## thClaws Team

Project settings live in `.thclaws/settings.json`.

Team agents live in `.thclaws/agents/`:

- `lead`
- `backend`
- `frontend`
- `brain`
- `qa`

Start:

```bash
thclaws --cli
```

Then ask:

```text
Create a team with backend, frontend, brain, and qa using plan approval. Spawn them now for local-only PR-001 to PR-003 work.
```

## External Connectors

Codex has connected plugin surfaces for Chrome, Computer Use, Browser, OpenAI Developers, Supabase, ClickUp, Notion, Google Drive, GitHub, Figma, and Canva.

The local config does not store SaaS tokens. Use the Codex connector in this chat for external actions, and require approval before any write/mutation.
