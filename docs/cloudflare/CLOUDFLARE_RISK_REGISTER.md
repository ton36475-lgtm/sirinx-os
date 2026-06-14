# Cloudflare Risk Register

Status: LOCAL-ONLY DRAFT

| Risk | Severity | Control |
| --- | --- | --- |
| Public internal agent endpoint | Critical | Access required for `dev`, `agents`, `mcp`, `n8n`, and `logs` |
| Remote MCP mutation without approval | Critical | Read-only default, approval ID required for any write |
| Token committed to repo | Critical | `.env*` ignored, no values in Wrangler config, use Workers secrets |
| Broad Cloudflare admin token | High | Scoped tokens only, per-lane service tokens |
| R2 evidence accidentally public | High | Private-by-default buckets and signed/manual release only |
| D1 production state mixed with dev | High | Separate dev/staging/prod bindings |
| AI Gateway cost runaway | High | Rate limits, cache policy, model fallback rules, cost ledger |
| Queue retry loop | Medium | Max retries, delay, DLQ, correlation IDs |
| Workflow stuck waiting for approval | Medium | Explicit wait state and operator-visible status |
| Workers logs leak private data | High | Redaction policy, no raw secrets, no raw credential logs |

