# Enterprise AI Company

VoltAgent scaffold for an enterprise AI company modeled like a public limited company.

This app defines AI-agent roles for board governance, executive leadership, corporate control, product, engineering, revenue, operations, finance, risk, legal, audit, investor relations, and people functions.

## Safety Defaults

- No real `.env` is committed.
- Default model is `ollama/llama3.2` in `.env.example`.
- Public output, production deploy, provider calls, and secret reads require explicit approval.
- High-risk workflows suspend for human approval instead of self-approving.

## Run Later

Dependency install was not run during scaffold creation. Open a separate install-audit gate before dependency resolution.

```bash
cd /Users/sirinx/sirinx-os
pnpm --filter @sirinx/enterprise-ai-company verify:scaffold
```

Do not start the runtime during install review. Runtime start requires a separate approval gate:

```bash
SIRINX_ENTERPRISE_AI_COMPANY_RUNTIME_APPROVED=1 pnpm --filter @sirinx/enterprise-ai-company dev
```

## Structure

```text
src/company/org-chart.ts          Public-company role map
src/company/agent-factory.ts      VoltAgent Agent factory
src/tools/company-directory.ts    Internal company directory tool
src/tools/governance-policy.ts    Approval and risk policy tool
src/workflows/board-approval.ts   Human approval workflow
src/index.ts                      VoltAgent entrypoint
```

See [INSTALL_GATE.md](./INSTALL_GATE.md) before dependency install or runtime start.
