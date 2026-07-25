# GhostClaw Unified Project Operating System

## Overview

The GhostClaw Unified Project Operating System is a registry-driven, retrieval-based operating layer for all SIRINX, Hermes, Codex, and related projects. It replaces full-memory-dump prompting with compact registry lookups and targeted retrieval.

## Architecture

- **Registry Layer**: Project Registry, Agent Registry, Knowledge Vault Index, Route Matrix, Domain Pack Index
- **Policy Layer**: Action Tiers (A/B/C/D/X), Hard Blocks, Gate Policies
- **Runtime Layer**: A2A2A Queues, Receipts, Leases, Mission Envelopes
- **Retrieval Layer**: Knowledge Vault Index with targeted source retrieval
- **Agent Layer**: 15 defined agent roles with lane isolation

## Core Principles

1. Bootstrap first, registry second, retrieval third, build last.
2. Never load full knowledge base into prompt context.
3. Use compact mission envelopes and file-based memory.
4. Hermes owns command intake, queue, routing, memory sync, final report.
5. Codex is the only mutating builder unless separately leased.
6. OpenCode is review/QA only, must not mutate source files.
7. Policy Guardian has final authority.
8. Validator must verify schemas, receipts, leases, and local-safe execution.
9. requester_agent must never equal approver_agent.
10. No task is complete without receipt.
11. No file mutation without lease.
12. No push, deploy, provider call, secret read, customer send, Telegram live send, migration, install, or cloud mutation without D-tier approval.

## Action Tiers

| Tier | Scope | Requirements |
|------|-------|-------------|
| **A (READ ONLY)** | Repo map, file search, diff inspection, registry read, policy read, context retrieval | None |
| **B (LOCAL DOC CONFIG)** | Docs, registry YAML, queue items, policy templates, domain packs | Lease + diff + receipt |
| **C (LOCAL CODE SCRIPT)** | Validators, schema checkers, queue helpers | Lease + diff + validator + receipt |
| **D (HIGH IMPACT)** | Install, migration, merge, provider call, Telegram send, cloud mutation | Blocked by default; requires explicit approval |
| **X (FORBIDDEN)** | Secret access, push, deploy, destructive deletion, customer send, credential handling | Never permitted |

## Canonical Master Plan Flow

```
Source -> Verify -> Reverse_Engineer -> Spec -> Architecture -> Knowledge_Vault -> Build_Packet -> Validate -> Receipt -> Handoff
```

Every project must enter through this flow. No jumping from idea to code.

## Project Registry

Projects indexed by 5 domain categories with 28 total entries. Each project has constraints, routes, build order, agent lanes, and retrieval keys stored in `.ghostclaw/registries/project-registry.v1.yaml`.

## Agent Registry

15 agents with defined lanes, mutation rights, ownership, and forbidden actions stored in `.ghostclaw/registries/agent-registry.v1.yaml`.

## Route Matrix

10 task-type routes mapping task types to primary/review/architect/validator agents stored in `.ghostclaw/registries/route-matrix.v1.yaml`.

## Knowledge Vault Index

32 indexed knowledge artifacts across policy, architecture, operations, and research stored in `.ghostclaw/registries/knowledge-vault-index.v1.yaml`.

## Domain Pack Index

12 domain packs with project-specific rules, constraints, design tokens, and brand text stored in `.ghostclaw/registries/domain-pack-index.v1.yaml`.

## Retrieval Protocol

1. Identify project_id
2. Identify action_tier
3. Read project-registry.v1.yaml for constraints
4. Read domain-pack-index.v1.yaml for domain rules
5. Read route-matrix.v1.yaml for lane assignment
6. Read knowledge-vault-index.v1.yaml for relevant source pointers
7. Retrieve only needed files
8. Create mission envelope
9. Create lease
10. Execute local-safe action
11. Validate
12. Write receipt

## Operating Rules

- No cross-file overwrite or blind replacement — edit only what is scoped.
- Block only the unsafe action, continue safe remaining work.
- Sidebar is UI convenience only; source of truth is file-based A2A2A queue and receipts.
- Every mutation requires a lease; every completed task requires a receipt.
- If a registry entry contradicts an earlier instruction, the registry wins.
- Never chain agent calls without a receipt closing the prior step.
- When in doubt, fall back to read-only (Tier A) and escalate.
