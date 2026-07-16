# SKILLS_REGISTRY

Status: verified local skill registry seed
Date: 2026-05-20

## Rules

- Registry entries must be factual and path-backed.
- Do not add a skill as active unless its local path exists.
- A skill does not authorize external writes.
- Skill instructions are subordinate to `AGENTS.md`.

## Active Local Skills Used For Current Work

| Skill | Local Path | Use | Safety Boundary |
| --- | --- | --- | --- |
| `hermes-project-planning` | `/Users/sirinx/.agents/skills/hermes-project-planning/SKILL.md` | Plan Hermes/dashboard/agent work in phases. | Planning only; no deploy or external write. |
| `agent-team-orchestration` | `/Users/sirinx/.agents/skills/agent-team-orchestration/SKILL.md` | Design agent team responsibilities when explicitly requested. | Do not spawn agents unless user explicitly requests subagents. |
| `start-run-debug` | `/Users/sirinx/.agents/skills/start-run-debug/SKILL.md` | Start, run, and debug local services. | Local only unless deploy is approved. |
| `website-browser-automation` | `/Users/sirinx/.agents/skills/website-browser-automation/SKILL.md` | Browser QA and screenshots. | No account changes, sends, purchases, or deletes. |
| `doc-coauthoring` | `/Users/sirinx/.codex/skills/anthropics-doc-coauthoring/SKILL.md` | Structured docs, plans, specs, decision records. | No raw chat logs or secrets in docs. |
| `github:github` | `/Users/sirinx/.codex/plugins/cache/openai-curated/github/dc902811/skills/github/SKILL.md` | GitHub repository orientation and triage. | Push/PR requires exact approval. |
| `grid-guist` | `/Users/sirinx/sirinx-os/skills/grid-guist/run.js` | UI/Design review (Swiss Design, Editorial Grid, Technical Minimalism). | Read-only analysis; no file edits or external sends. |

## Candidate Skills For Later

| Skill | Use | Gate |
| --- | --- | --- |
| `supabase:supabase-postgres-best-practices` | Schema and query review. | No migration/write until approved. |
| `cloudflare` / `wrangler` | Workers/Pages review and deployment. | Cloudflare write approval required. |
| `web-perf` | PageSpeed/Core Web Vitals review. | Safe read-only unless deploying fixes. |
| `openai-developers:agents-sdk` | Agent app design. | API key setup and paid calls gated. |
