# Cloudflare Agent Team Research

Status: LOCAL-ONLY RESEARCH PACKET  
Version: SIRINXDev v8.2  
Date: 2026-05-30

## Summary

Cloudflare is suitable as the SIRINXDev edge agent runtime after approval, not as the local source of truth. The Mac mini M2 remains the control node. Cloudflare runs approved edge agents, durable workflows, queues, private evidence storage, and governed remote MCP endpoints.

## Official Anchors

- Agents SDK: https://developers.cloudflare.com/agents/
- Agent tools: https://developers.cloudflare.com/agents/api-reference/agent-tools/
- Sub-agents: https://developers.cloudflare.com/agents/api-reference/sub-agents/
- Workflows: https://developers.cloudflare.com/workflows/
- Queues retries and DLQ: https://developers.cloudflare.com/queues/configuration/batching-retries/
- Durable Objects: https://developers.cloudflare.com/durable-objects/
- Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Workers Logs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- Remote MCP transport: https://developers.cloudflare.com/agents/model-context-protocol/transport/

## Findings

- Agents SDK agents run on Durable Objects with state, scheduling, WebSocket support, and SQL storage.
- Agent tools and sub-agents support parent/child agent coordination with retained runs and isolated child state.
- Workflows are appropriate for multi-step jobs that need durable retries, sleep, and waiting for external events.
- Queues provide async buffering, retry delay, batching, and dead-letter queue patterns.
- Workers secrets should be used for sensitive values; plaintext Wrangler vars are not for secrets.
- Remote MCP should use Streamable HTTP and must be protected by authentication and scoped permission policy.

## SIRINX Decision

Use Cloudflare for approved edge execution only. Keep planning, approval, memory, and evidence control on the Mac mini M2 until a `PRE_APPROVAL_PACKET` is approved.

