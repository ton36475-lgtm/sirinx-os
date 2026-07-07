# Design - P000A Repo Intake Readonly

Change ID: `gc-sf-re-os-v1-p000a`

## Operating Formula

```text
Source -> Verify -> Reverse Engineer -> Spec -> Architecture
-> Knowledge Vault -> Build Packet -> Validate -> Receipt -> Handoff -> Learn
```

## Control Plane

```text
User / Android Hermes-agent / Telegram / Local Command
  -> Hermes Single Inbox
  -> Policy Guardian
  -> Source Intake + Verification
  -> Reverse Engineering Engine
  -> OpenSpec Source of Truth
  -> AI Second Brain / Knowledge Vault
  -> Task Packet Queue
  -> File Lease Manager
  -> Worker Dispatch
  -> Validation / Receipt / Audit
  -> Handoff Packet
  -> Knowledge Extraction
```

## Worker Role Lock

| Worker | Role | Default Gate |
|---|---|---|
| Hermes | commander, single inbox, queue, receipt | Green |
| Policy Guardian | block unsafe actions | Green |
| OpenSpec | source of truth before build | Green |
| AI Second Brain | memory, MOC, decision rules | Green |
| Codex Builder | source mutation after file lease | Yellow |
| OpenCode Reviewer | read-only review, one packet lag | Green until provider call |
| Validator | test, lint, schema, receipt checks | Green |
| Agency Agents | role taxonomy and curated registry | Yellow |
| 9Router | model routing/provider abstraction | Yellow/Red |
| Logto | auth/RBAC boundary | Yellow |
| n8n | workflow automation lane | Yellow |
| video-use | content render pipeline | Yellow |
| Stagehand | local/staging UAT only | Yellow |
| OpenClaw / Android Hermes-agent | companion/control node | Yellow |
| GPU / Float16 | compute burst | Red |

## Build Order

Build cannot begin until source verification and OpenSpec are accepted.

1. Backend Core
2. Database / Domain Schema
3. Service Logic
4. API Contract
5. API Route / Handler
6. API Client Wiring
7. Frontend State / Hooks
8. Components
9. Pages one by one
10. Local UAT
11. Validation
12. Receipt
13. Commit Gate Review

## Safety Design

`APPROVE_ALL_SAFE_LOCAL_SPEC_WORK_ONLY` allows documentation/spec artifacts and
receipts. Runtime actions, provider calls, installs, source mutation, secrets,
push, deploy, external workflows, and high-risk browser/security activity
remain blocked without exact scoped gates.
