# GhostClaw External Tooling Intake V1.4

Mission ID: `GC-EXTERNAL-TOOLING-INTAKE-V1-4-20260701-001`
Mode: `docs_only_policy_gated_intake`

## Purpose

This packet classifies a new batch of external tools, workflow ideas, compute
offers, model/news claims, and content prompts for GhostClaw without installing,
executing, provisioning, or connecting anything.

## Classification

| Item | Lane | Gate | Default Mode |
| --- | --- | --- | --- |
| `vibheksoni/stealth-browser-mcp` | Authorized Browser QA | Red | policy assessment only |
| `Fission-AI/OpenSpec` | Spec-Driven Workflow | Green/Yellow | docs workflow reference |
| `decolua/9router` refresh | Model Router Gateway | Yellow/Red | policy refresh only |
| Matt Pocock `/handoff` skill | Context Handoff | Yellow | reviewed import only |
| H100 / GPU instance pitch | Compute Provider | Yellow/Red | budget review only |
| Claude Sonnet 5 claim | AI News Intake | Yellow | unverified knowledge card |
| n8n basics post | Automation Curriculum | Green | course/content note |
| Google Omni video prompt post | Creative Workflow Intake | Yellow | prompt workflow note |

## Hard Blocks

- anti-bot bypass execution
- CAPTCHA or Cloudflare evasion
- stealth browsing against third-party sites
- installing MCP/browser tooling
- provisioning GPU instances
- provider or paid model calls
- credential storage or secret reads
- OpenSpec or handoff skill install without review
- customer data routing
- push, deploy, or cloud mutation

## Integration Verdict

Add the items as reference docs, policies, schemas, and runbooks only. Treat all
marketing/news claims as unverified until checked from primary sources. Keep
Policy Guardian above every lane.
