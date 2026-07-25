# AGENTS.md — SIRINX OS MillerDev Research Protocol

**Status:** Canonical operating file
**Scope:** SIRINX OS and all related systems except AGM
**Baseline:** Mac mini live test passed; SIRINX Live Agent Studio MVP works locally
**Next Mode:** Production Hardening → Safety Gates → Dry-run Integration → Staging → Production Approval

---

## 0. Prime Directive

SIRINX OS is not just a chatbot, not just a workflow, not just a RAG app, and not just a multi-agent diagram.

SIRINX OS is a **Full-Stack Agentic Production Platform** for AI-native business operations.

The operating goal is:

```text
CONTROLLED • SECURE • AUDITABLE • SCALABLE
```

Every agent, workflow, tool call, dashboard action, API route, release, and integration must be explainable, logged, bounded, reversible where possible, and approved when risk exists.

Every operator must be able to answer:

```text
What happened?
Who or what triggered it?
Which agent/tool/model acted?
What context was used?
Was it allowed?
Was it approved?
Can it be stopped?
Can it be reproduced?
Can it be rolled back?
```

---

## 1. In Scope

```text
SIRINX OS Core
dev.sirinx.co
SIRINX GOD AI / Sirinx Solar
OPAL ROI
SIRINX Live Agent Studio
Production AI Backend
GhostClaw
Zenith / n8n
Chrome DevTools MCP
Codex / Hermes / OpenClaw
Local AI / Ollama / llama.cpp / LM Studio
Image Studio
After Effects MCP / Creative Automation
GPU Research Lab
MySQL / Redis / R2 / Vector / Obsidian Memory
Release Gates
Kill Switches
Cost Guard
Defensive Security Scan
Observability
Backup / Restore / Rollback
```

## 2. Out of Scope

```text
AGM
Unauthorized third-party scanning
Credential attacks
Stealth scanning
Malware
Bypass systems
Unapproved cloud mutation
Unapproved customer messaging
Unapproved paid API calls
```

---

## 3. MillerDev Work Protocol

Every task must start with:

```text
Goal:
Constraints:
File Scope:
Expected Result:
Verification:
Report Format:
```

Every task must follow:

```text
Inspect → Plan → Implement → Verify → Report → Commit Ready
```

### Good Task Card Example

```text
Goal:
Add a dry-run approval queue for Live Agent Studio AI replies.

Constraints:
- Do not deploy.
- Do not push Git.
- Do not send real LINE/YouTube/CRM messages.
- Use mock adapter only.
- No secrets.

File Scope:
Allowed:
- apps/live-agent-studio/**
- services/compliance-api/**
- packages/types/**
- docs/live-approval-queue.md

Forbidden:
- infra/cloudflare/**
- .env
- production deploy scripts

Expected Result:
- AI replies enter approval queue.
- Unsafe replies are blocked.
- Approved replies proceed to mock overlay only.

Verification:
- Unit tests pass.
- Manual mock flow passes.
- No external calls.

Report Format:
- Summary
- Files changed
- Tests
- Risks
- Next task
```

---

## 4. Hard Safety Rules

```text
- Do not deploy without explicit human approval.
- Do not git push without explicit human approval.
- Do not mutate cloud resources without explicit human approval.
- Do not edit real .env files.
- Only create or update .env.example.
- Do not create real API keys, passwords, tokens, or secrets.
- Do not read, expose, copy, summarize, or upload secret files.
- Mask PII in logs, screenshots, dashboards, and reports.
- Do not send real customer messages without human approval.
- Do not trigger paid APIs unless PAID_API_ENABLED=true and human approval exists.
- Do not expose Ollama, llama.cpp, LM Studio, or local AI services publicly.
- Do not run real MCP destructive actions by default.
- Do not render/export from After Effects without human approval.
- Do not make guaranteed ROI, savings, revenue, no-ban, bypass, fake-proof, medical, legal, or zero-downtime absolute claims.
- Do not call arbitrary shell commands from free-text instructions.
- Do not scan third-party systems.
- Do not attempt exploitation, brute force, credential attacks, stealth scans, malware, or unauthorized public scans.
```

---

## 5. Pipeline vs Agent Doctrine

Do not call every workflow an agent.

### Pipeline / Workflow

A pipeline is a predefined path:

```text
Input → Validate → Retrieve → LLM Draft → Guardrail → Approval → Output
```

Use pipeline when:

```text
- Steps are predictable.
- Business rules are clear.
- Reliability matters more than autonomy.
- Debugging and auditability are critical.
- Cost and latency must be controlled.
```

Examples:

```text
Lead capture workflow
LINE handoff dry-run
Post-live summary
Security scan summary
Content idea workflow
Ads readiness checklist
Release gate checks
```

### Agent

An agent has a goal, state, tool access, feedback loop, and controlled autonomy.

Use agent when:

```text
- The number of steps is not known in advance.
- The task is open-ended.
- The agent must choose tools based on feedback.
- Planning and replanning are required.
- Human approval can stop risky actions.
```

Examples:

```text
Architect Agent planning a scoped PR
Browser QA Agent inspecting UI through Chrome DevTools MCP
Compliance Agent deciding safe/warning/blocked reply status
Research Analyst Agent exploring a bounded research task
Creative Agent producing an animation plan before MCP execution
```

### Hybrid Production Default

```text
Pipeline controls deterministic steps.
Agent handles flexible reasoning inside bounded sections.
Human approval controls external or destructive actions.
```

---

## 6. Autonomy Classification

Every feature must be assigned an autonomy level.

```text
A0: Static UI or documentation
A1: Deterministic script / no model
A2: LLM-assisted draft only
A3: LLM inside deterministic workflow
A4: Bounded agent chooses tools inside allowlist
A5: Agent can trigger external action after human approval
A6: Agent can execute external action automatically under strict policy
A7: Prohibited unless separately approved
```

Default maximums:

```text
Production default: A3
Internal developer tools: A4
External customer-facing workflows: A3 + human approval
Cloud/deploy/write actions: A5 minimum, never A6 by default
```

Examples:

```text
Post-live summary → A3
Chrome DevTools QA → A4
Image mock generation → A3
Real image generation → A5
LINE customer send → A5
Cloudflare mutation → A5
Production deploy → A5
Unbounded shell tool → A7 prohibited
```

---

## 7. System Map

### Public Layer

```text
sirinx.co / www.sirinx.co
```

Purpose:

```text
Public website
Brand
Content
Articles
Trust pages
```

Forbidden:

```text
Admin routes
Secrets
Internal APIs
Private dashboards
```

### Solar Layer

```text
opal.sirinx.co
```

Purpose:

```text
SIRINX GOD AI
OPAL ROI
Solar ROI calculator
AI Load Control explanation
Dynamic ROI dashboard
Predictive Maintenance explanation
Free ROI analysis lead capture
```

### Live Layer

```text
live.sirinx.co
```

Purpose:

```text
AI Avatar live sales
YouTube / Facebook / LINE chat ingestion
TTS / Avatar / OBS overlay
Lead capture
Post-live summary
```

### Operator Layer

```text
studio.sirinx.co
```

Purpose:

```text
Live operator control
Approval queue
Blocked replies
Campaign control
Lead review
```

Default:

```text
Read-only + approval required
```

### Developer Layer

```text
dev.sirinx.co
```

Purpose:

```text
Developer Command Center
Mission Control
Release Gates
Kill Switches
Agent Queue
DevTools MCP QA
Logs / Traces / Cost
Security Scan
Cost Guard
Service Health
n8n dry-runs
Image jobs
Local AI status
Creative automation status
GPU research status
```

Must be protected by:

```text
Cloudflare Access
MFA
IP allowlist where possible
No anonymous access
No public indexing
Read-only by default
```

### API Layer

```text
api.sirinx.co
```

Purpose:

```text
API Gateway
REST / GraphQL / tRPC / Webhook
Auth
Rate limit
Logging
Service routing
```

Required:

```text
/health
/ready
/version
correlation_id
rate limit
CORS whitelist
structured logs
```

### Automation Layer

```text
n8n.sirinx.co
```

Purpose:

```text
n8n workflows
Cron
Webhook
Integration
Post-live summary
Lead routing
LINE handoff dry-run
Report automation
```

Default:

```text
Dry-run first
External send disabled
```

### Monitoring Layer

```text
grafana.sirinx.co
```

Purpose:

```text
Metrics
Logs
Alerts
Uptime
Cost
Latency
System health
```

### Local AI Internal Layer

```text
local-ai.sirinx.internal
```

Purpose:

```text
Ollama
llama.cpp
LM Studio
Local classifier
Local summary
Offline assistant
```

Forbidden:

```text
Public exposure
Autonomous deploy
Customer send
Secret reading
```

### Creative Automation Internal Layer

```text
creative.sirinx.internal
```

Purpose:

```text
Creative Studio
After Effects MCP
Animation planning
Render queue
Asset registry
```

Default:

```text
Dry-run
No render/export without approval
```

---

## 8. Repository Structure

Root repository:

```text
sirinx-os/
```

Required structure:

```text
sirinx-os/
├── AGENTS.md
├── CLAUDE.md
├── PROJECT_STATE.md
├── RULES_FOR_CODEX.md
├── NEXT_ACTIONS.md
├── RELEASE_GATE.md
├── VALIDATION_MATRIX.md
├── HANDOFF_PROTOCOL.md
├── LIVE_TEST_REPORT.md
├── MAC_BASELINE.md
├── RUNBOOK_LIVE_START.md
├── KNOWN_ISSUES.md
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
│
├── apps/
│   ├── web-sirinx/
│   ├── web-opal/
│   ├── live-agent-studio/
│   ├── avatar-overlay/
│   ├── studio-operator/
│   ├── dev-dashboard/
│   ├── image-studio/
│   ├── creative-studio/
│   ├── admin-dashboard/
│   └── docs/
│
├── services/
│   ├── api-gateway/
│   ├── dev-control-api/
│   ├── api-opal/
│   ├── api-logistics/
│   ├── api-marketing/
│   ├── ai-backend/
│   ├── live-chat-gateway/
│   ├── compliance-api/
│   ├── avatar-reply-api/
│   ├── image-gateway/
│   ├── local-ai-gateway/
│   ├── creative-orchestrator/
│   └── worker-zenith/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── database/
│   ├── config/
│   ├── logger/
│   ├── security/
│   ├── solar-kms/
│   ├── agent-sdk/
│   ├── asset-registry/
│   ├── provider-adapters/
│   ├── auth-profiles/
│   └── devtools-qa/
│
├── infra/
│   ├── docker/
│   ├── cloudflare/
│   ├── traefik/
│   ├── mysql/
│   ├── redis/
│   ├── monitoring/
│   └── scripts/
│
├── workflows/
├── prompts/
├── kms/
├── docs/
├── devtools/
├── security/
├── research/gpu-scaling/
├── memory/live/
└── tests/
```

---

## 9. Root Config Standards

### .gitignore

```gitignore
node_modules
.turbo
.next
dist
build
.env
.env.*
!.env.example
.DS_Store

infra/docker/.data
data/generated-assets
data/creative-renders
memory/private

*.log
logs/

*.pem
*.key
*.p12
*.enc.unlocked
```

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {},
    "test": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 10. Environment Defaults

`.env.example` must contain safe defaults only.

```env
NODE_ENV=development
APP_ENV=local

# External Action Kill Switches
LIVE_SPEAK_ENABLED=false
EXTERNAL_SEND_ENABLED=false
LINE_SEND_ENABLED=false
YOUTUBE_REPLY_ENABLED=false
PAID_API_ENABLED=false
IMAGE_GENERATION_ENABLED=false
CODEX_CLI_ENABLED=false
HERMES_ENABLED=false
ALLOW_REAL_CUSTOMER_SEND=false
ALLOW_REAL_YOUTUBE_REPLY=false
ALLOW_REAL_LINE_SEND=false
ALLOW_CLOUD_MUTATION=false

# Dev Command Center
DEV_DASHBOARD_ENABLED=true
DEV_DASHBOARD_HOST=dev.sirinx.co
DEV_CONTROL_API_URL=http://localhost:3600
DEV_ACCESS_REQUIRED=true
DEV_ALLOWED_EMAILS=change-me@example.com
DEV_READ_ONLY_MODE=true
DEV_ALLOW_DRY_RUN=true
DEV_ALLOW_REAL_DEPLOY=false
DEV_ALLOW_REAL_CLOUD_MUTATION=false
DEV_ALLOW_REAL_CUSTOMER_SEND=false
DEV_ALLOW_SECRET_VIEW=false

# Auth Isolation
AUTH_PROFILE=codex
CODEX_CONFIG_DIR=.sirinx/auth/codex
HERMES_CONFIG_DIR=.sirinx/auth/hermes
CHROME_PROFILE_DIR=.sirinx/chrome/codex

# Database
MYSQL_ROOT_PASSWORD=change-me
MYSQL_DATABASE=sirinx
MYSQL_USER=sirinx
MYSQL_PASSWORD=change-me
MYSQL_REPL_USER=replicator
MYSQL_REPL_PASSWORD=change-me
DATABASE_URL=mysql://sirinx:change-me@localhost:3306/sirinx

# Redis
REDIS_PASSWORD=change-me
REDIS_URL=redis://:change-me@localhost:6379

# Storage
R2_ACCOUNT_ID=change-me
R2_ACCESS_KEY_ID=change-me
R2_SECRET_ACCESS_KEY=change-me
R2_BUCKET=sirinx-assets
GENERATED_ASSET_DIR=./data/generated-assets

# AI Gateway
LITELLM_BASE_URL=http://localhost:4000
OLLAMA_BASE_URL=http://localhost:11434

# Local AI Runtime
LOCAL_AI_ENABLED=true
LOCAL_AI_PROVIDER=ollama
LLAMA_CPP_BASE_URL=http://localhost:8080
LM_STUDIO_BASE_URL=http://localhost:1234
LOCAL_AI_PUBLIC_ACCESS=false
LOCAL_AI_ALLOW_EXTERNAL_TOOLS=false
LOCAL_AI_DEFAULT_MODEL=llama3.1
LOCAL_AI_CLASSIFIER_MODEL=gemma2
LOCAL_AI_MAX_CONTEXT_TOKENS=8192

# Creative Automation
CREATIVE_STUDIO_ENABLED=true
AFTER_EFFECTS_MCP_ENABLED=false
AFTER_EFFECTS_MCP_DRY_RUN=true
AFTER_EFFECTS_RENDER_ENABLED=false
AFTER_EFFECTS_OUTPUT_DIR=./data/creative-renders

# MCP Safety
MCP_TOOLS_ENABLED=true
MCP_DRY_RUN=true
MCP_ALLOWLIST_ONLY=true
MCP_ALLOW_SHELL=false
MCP_ALLOW_ENV_READ=false
MCP_ALLOW_EXTERNAL_SEND=false

# GPU Research
GPU_LAB_ENABLED=true
GPU_BENCHMARK_DRY_RUN=true
GPU_RESULTS_DIR=./research/gpu-scaling/test-results

# Observability
LOG_LEVEL=info
TRACE_ENABLED=true
COST_TRACKING_ENABLED=true

# Cost Guard
COST_GUARD_ENABLED=true
MAX_REPAIR_ATTEMPTS=2
MAX_SPEND_PER_TASK_USD=5
MAX_RUNTIME_MINUTES=60
STOP_ON_REPEATED_FAILURE=true
```

---

## 11. AGENTS.md Deep Research Notices

### 11.1 What AGENTS.md Is

`AGENTS.md` is not a README.

It is the operational constitution for AI coding agents and human developers.

It defines:

```text
What the system is
What is in scope
What is out of scope
How tasks must be framed
How agents must inspect, plan, implement, verify, and report
Which tools are allowed
Which actions require approval
Which claims are forbidden
Which systems must remain dry-run
How to handle memory, cost, evaluation, and release gates
```

A README explains the project.
`AGENTS.md` governs agent behavior.

### 11.2 What AGENTS.md Is Not

`AGENTS.md` is not:

```text
A place for secrets
A place for API keys
A place for environment-specific credentials
A place for vague hype
A place for unverified production claims
A prompt dump
A replacement for tests
A replacement for release gates
A license to let agents act autonomously without approval
```

### 11.3 Root Instruction Hierarchy

Agents should treat instructions in this order:

```text
1. System / platform safety rules
2. Current user task
3. AGENTS.md
4. Scoped folder instructions
5. PROJECT_STATE.md
6. RELEASE_GATE.md
7. Relevant source files
8. Docs / KMS / prompts
9. Long-term memory
```

If instructions conflict, use the stricter safety rule.

If project state conflicts with old memory, trust project state.

### 11.4 Companion File Set

```text
AGENTS.md
CLAUDE.md
RULES_FOR_CODEX.md
PROJECT_STATE.md
NEXT_ACTIONS.md
RELEASE_GATE.md
VALIDATION_MATRIX.md
HANDOFF_PROTOCOL.md
LIVE_TEST_REPORT.md
MAC_BASELINE.md
RUNBOOK_LIVE_START.md
KNOWN_ISSUES.md
.env.example
README.md
```

Purpose map:

```text
AGENTS.md              = operating law for agents
CLAUDE.md              = Claude-specific operating notes
RULES_FOR_CODEX.md     = Codex-specific tool and repo rules
PROJECT_STATE.md       = current verified state
NEXT_ACTIONS.md        = immediate task queue
RELEASE_GATE.md        = release checklist
VALIDATION_MATRIX.md   = what must be tested
HANDOFF_PROTOCOL.md    = human/agent handoff rules
LIVE_TEST_REPORT.md    = Mac live test proof
MAC_BASELINE.md        = known-good local baseline
RUNBOOK_LIVE_START.md  = start/stop/recover commands
KNOWN_ISSUES.md        = current limitations and risks
.env.example           = safe config template only
README.md              = human onboarding
```

### 11.5 Folder-Scoped Instructions

Optional local instruction files:

```text
apps/dev-dashboard/AGENTS.md
services/ai-backend/AGENTS.md
services/live-chat-gateway/AGENTS.md
services/image-gateway/AGENTS.md
services/creative-orchestrator/AGENTS.md
infra/AGENTS.md
security/AGENTS.md
```

Rules:

```text
Folder AGENTS.md can add stricter rules.
Folder AGENTS.md cannot weaken root rules.
Folder AGENTS.md cannot allow secrets, deploy, push, cloud mutation, or paid API by default.
Folder AGENTS.md must state allowed files and forbidden files clearly.
```

---

## 12. Context Engineering Standard

Context is finite. Treat context as scarce.

Every context packet must have:

```text
source
owner
freshness
permission
confidence
relevance
expiry
```

Priority:

```text
1. Current user instruction
2. Current task card
3. AGENTS.md
4. Project state
5. Relevant source files
6. Recent verified logs
7. KMS / docs
8. Long-term memory
9. Unverified notes
```

Rejection rules:

```text
Reject stale memory when newer project state conflicts.
Reject unsourced claims for production decisions.
Reject secrets or credentials from context.
Reject irrelevant long context that increases confusion.
Reject user-provided claims that violate safety gates.
```

---

## 13. Memory Architecture

Memory classes:

```text
M0: Ephemeral task context
M1: Session working memory
M2: Project state memory
M3: KMS / documentation memory
M4: Audit / provenance memory
```

Storage:

```text
M2 → PROJECT_STATE.md, NEXT_ACTIONS.md, MAC_BASELINE.md, LIVE_TEST_REPORT.md
M3 → kms/, docs/, prompts/, security/
M4 → audit logs, database audit tables, release gate records, agent runs, ai_runs, approval_queue
```

Memory write rules:

```text
Write only verified facts to project state.
Write useful patterns to KMS.
Write all actions to audit.
Never write secrets.
Never overwrite baseline without explicit update note.
```

### 13.1 SIRINX Obsidian Brain Sync

Use this rule for all substantive SIRINX/GHOSTCLAW work in Codex.

```text
Canonical vault: /Users/sirinx/Documents/Obsidian Vault/SIRINX
Digest note: /Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md
Codex config pointer: /Users/sirinx/.codex/obsidian-brain-sync.json
Repo sync doc: /Users/sirinx/SIRINXDev/sirinx-agent-native-os/docs/a2async/OBSIDIAN_BRAIN_SYNC.md
Repo sync script: /Users/sirinx/SIRINXDev/sirinx-agent-native-os/scripts/a2a/a2a_obsidian_sync.py
```

Default behavior:

```text
After meaningful local setup, architecture, runtime, deploy, recovery, or automation work, append one concise memory pulse to the digest note.
Include what changed, source/evidence path, and next safe action.
Keep detailed artifacts in repo/runtime folders and link their paths.
Do not write secrets, .env values, private keys, browser cookies, raw tokens, or large raw logs to Obsidian.
Do not rewrite Obsidian frontmatter or existing notes unless explicitly asked.
```

KOB/Codex split:

```text
KOB plans, routes, compresses context, and proposes memory summaries.
Codex local worker/session executes repo work and writes approved concise Obsidian pulses.
```

---

## 14. Agent Accountability Model

Every agent must declare:

```text
Role:
Allowed inputs:
Allowed tools:
Forbidden tools:
Allowed outputs:
Approval required for:
Memory read permissions:
Memory write permissions:
Cost budget:
Stop conditions:
Escalation path:
```

No agent can run without an Agent Card.

### Agent Card Template

```md
# Agent Card

## Role

## Purpose

## Allowed Inputs

## Allowed Tools

## Forbidden Tools

## Outputs

## Approval Required For

## Memory Permissions

## Cost Budget

## Stop Conditions

## Escalation
```

---

## 15. Tool Permission Model

Every tool must be classified.

```text
T0: Read-only local inspection
T1: Local file edit inside allowed scope
T2: Local test / lint / build
T3: Browser QA / screenshot / Lighthouse
T4: Local AI inference
T5: External API dry-run
T6: External API real write
T7: Cloud mutation / deploy / payment / customer send
T8: Prohibited
```

Default allowed without approval:

```text
T0, T1 within scope, T2, T3 dry-run, T4 local only
```

Approval required:

```text
T5 when it may cost money
T6 always
T7 always
```

Prohibited by default:

```text
T8
arbitrary shell
secret reading
credential extraction
unauthorized scanning
public exposure of internal services
```

---

## 16. Release Gates

SIRINX release requires 14 gates.

```text
01 Baseline
02 Security
03 Browser QA
04 AI Safety
05 Observability
06 Data
07 External Integration
08 Production Approval
09 Dev Dashboard
10 AI Agent Governance
11 Hermes HQ
12 Defensive Security Scan
13 Ads / Growth Readiness
14 Pre-Deploy Security
```

### Gate 01 — Baseline

```text
Mac live baseline documented
Working commands documented
Ports documented
Screenshots/video proof stored
Known issues documented
```

### Gate 02 — Security

```text
No hardcoded API keys
No real secrets
.env ignored
PII masking enabled
Admin routes protected
```

### Gate 03 — Browser QA

```text
Chrome DevTools MCP screenshots
Console checked
Network checked
Responsive checked
Lighthouse checked when relevant
```

### Gate 04 — AI Safety

```text
Claim guard active
No guaranteed ROI
No guaranteed savings
No no-ban
No zero-downtime absolute claim
```

### Gate 05 — Observability

```text
correlation_id
request_id
latency_ms
AI cost tracking
blocked actions logged
```

### Gate 06 — Data

```text
MySQL schema
Redis queue/cache
Backup script
Restore script
Migration script
```

### Gate 07 — External Integration

```text
YouTube dry-run
LINE dry-run
CRM dry-run
n8n dry-run
Paid APIs disabled
```

### Gate 08 — Production Approval

```text
Human approval
Rollback plan
Monitoring active
Emergency stop works
```

### Gate 09 — Dev Dashboard

```text
dev.sirinx.co protected
No anonymous access
Read-only default
No secrets visible
Real deploy disabled
Real customer send disabled
```

### Gate 10 — AI Agent Governance

```text
Agent roles defined
Tool allowlist
Approval queue
Memory update policy
No autonomous destructive action
```

### Gate 11 — Hermes HQ

```text
Codex/Hermes auth isolated
Agent queue visible
Cost guard active
Fallback behavior logged
```

### Gate 12 — Defensive Security Scan

```text
npm audit
Snyk
OWASP ZAP baseline
Dependency check
TLS/header check
```

### Gate 13 — Ads / Growth Readiness

```text
Landing page ready
Tracking dry-run
Offer reviewed
Consent/privacy ready
Launch locked until approval
```

### Gate 14 — Pre-Deploy Security

```text
Final secret scan
Final build
Final QA
Final rollback plan
Deployment approved
```

---

## 17. SIRINX GOD AI / Solar Claim Policy

SIRINX GOD AI is a Solar Intelligence product focused on:

```text
AI Load Control
Dynamic ROI
Predictive Maintenance
Real-time monitoring
Free ROI analysis lead capture
```

Allowed framing:

```text
วิเคราะห์จากข้อมูลจริง
ประเมินตามบิลค่าไฟ
ขึ้นกับพื้นที่ติดตั้ง
ขึ้นกับพฤติกรรมการใช้ไฟ
ทีมงานช่วยคำนวณ ROI ให้
```

Forbidden claims:

```text
ประหยัดแน่นอน
คืนทุนแน่นอน
ลดค่าไฟ 30% แน่นอน
Zero Downtime แน่นอน
กำไรทันที
รายได้การันตี
ติดแล้วรวย
```

Safe reply example:

```text
ระบบ SIRINX GOD AI จะช่วยประเมินพฤติกรรมการใช้ไฟและคำนวณ ROI จากข้อมูลจริง เช่น บิลค่าไฟ พื้นที่ติดตั้ง และรูปแบบการใช้ไฟครับ ถ้าส่งข้อมูลเบื้องต้น ทีม Sirinx สามารถช่วยวิเคราะห์ให้เหมาะกับหน้างานได้
```

---

## 18. Production AI Backend

Location:

```text
services/ai-backend/
```

Required modules:

```text
app/
components/
services/
prompts/
agents/
security/
evaluation/
observability/
data/
scripts/
tests/
```

Required capabilities:

```text
FastAPI
/health
Hybrid retriever
Reranker
RAG pipeline
Semantic cache
Prompt registry
Query router
Query rewriter
Conversation memory
Solar ROI engine
Live reply engine
Input guard
Content filter
Output filter
PII masker
Claim guard
Golden dataset
Offline eval
Online monitor
Tracer
Feedback
Cost tracker
Latency tracker
Correlation ID
```

Every AI answer should include enough trace data to debug:

```text
intent
retrieved sources
prompt version
model name
latency
cost estimate
guardrail verdict
correlation_id
```

---

## 19. Live Agent Studio

Flow:

```text
YouTube / Facebook / LINE Chat
→ Live Chat Gateway
→ Normalize Event
→ Intent Classifier
→ Lead Classifier
→ Solar KMS / RAG
→ AI Draft Reply
→ Compliance Filter
→ Human Approval Queue
→ TTS / Avatar / OBS Overlay
→ CRM / LINE Handoff
→ Post-Live Memory Summary
```

Required states:

```text
pending
approved
edited
rejected
blocked
```

Rules:

```text
Blocked replies never go live.
Warning replies require human approval.
Safe replies still require approval if customer-facing.
LINE CTA only when appropriate.
No real external send by default.
```

---

## 20. Data Model

Minimum MySQL tables:

```sql
CREATE TABLE live_chat_events (
  id VARCHAR(64) PRIMARY KEY,
  source VARCHAR(32) NOT NULL,
  stream_id VARCHAR(128),
  viewer_id_hash VARCHAR(128),
  display_name_masked VARCHAR(128),
  message_text TEXT NOT NULL,
  language VARCHAR(16),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  correlation_id VARCHAR(128) NOT NULL
);

CREATE TABLE solar_leads (
  id VARCHAR(64) PRIMARY KEY,
  chat_event_id VARCHAR(64),
  lead_grade VARCHAR(16),
  customer_type VARCHAR(64),
  monthly_bill_thb INT,
  wants_roi_analysis BOOLEAN DEFAULT FALSE,
  wants_callback BOOLEAN DEFAULT FALSE,
  line_handoff_status VARCHAR(32) DEFAULT 'not_sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  correlation_id VARCHAR(128) NOT NULL
);

CREATE TABLE ai_runs (
  id VARCHAR(64) PRIMARY KEY,
  chat_event_id VARCHAR(64),
  model_name VARCHAR(128),
  prompt_name VARCHAR(128),
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  cost_estimate DECIMAL(10,4),
  status VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  correlation_id VARCHAR(128) NOT NULL
);

CREATE TABLE approval_queue (
  id VARCHAR(64) PRIMARY KEY,
  chat_event_id VARCHAR(64),
  proposed_reply TEXT,
  compliance_status VARCHAR(32),
  risk_level VARCHAR(32),
  status VARCHAR(32) DEFAULT 'pending',
  approved_by VARCHAR(128),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  correlation_id VARCHAR(128) NOT NULL
);

CREATE TABLE image_jobs (
  id VARCHAR(64) PRIMARY KEY,
  prompt_hash VARCHAR(128),
  provider VARCHAR(64),
  auth_profile VARCHAR(64),
  model_family VARCHAR(64),
  status VARCHAR(32),
  output_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  correlation_id VARCHAR(128) NOT NULL
);
```

---

## 21. dev.sirinx.co Command Center

Required pages:

```text
/overview
/commands
/release-gates
/kill-switches
/services
/agents
/live
/image-jobs
/local-ai
/creative
/gpu-lab
/devtools-qa
/logs
/security
/cost-guard
/settings
```

Required panels:

```text
Service Health
Release Gates
Kill Switches
Agent Queue
Approval Queue
Logs / Traces / Cost
Security Checks
Cost Guard
DevTools MCP QA
Local AI Runtime
Creative Automation
GPU Research Lab
Quick Actions
```

Quick actions must be safe by default:

```text
View Logs
View Release Gates
View Agent Queue
Run Dry-Run QA
Run Security Scan
Open Cost Overview
Deploy only if approved
```

---

## 22. Chrome DevTools MCP QA

### dev Dashboard QA

```text
Target:
http://localhost:3200
Future:
https://dev.sirinx.co

Check:
- Dashboard loads
- No console errors
- No failed network
- Release gates visible
- Kill switches default safe
- Logs mask PII
- Deploy disabled
- Cloud mutation disabled
- Secret view disabled
```

### Live Studio QA

```text
Target:
http://localhost:3000/studio

Check:
- Chat panel
- Approval queue
- Compliance badge
- Unsafe reply cannot be spoken
- Paid API disabled
```

### OBS Overlay QA

```text
Target:
http://localhost:3001/obs

Check:
- 16:9 layout
- No clipping
- Bottom overlay readable
- Avatar visible
```

### Image Studio QA

```text
Target:
http://localhost:3100

Check:
- Dry-run image job
- No paid API unless enabled
- Queue status
- Gallery
```

---

## 23. Auth Isolation

Problem:

```text
Codex CLI + Hermes + localhost web app using same account/session can cause auth session collision.
```

Required isolation:

```text
.sirinx/auth/codex
.sirinx/auth/hermes
.sirinx/chrome/codex
.sirinx/chrome/qa
```

Worker roles:

```text
Codex Worker
Hermes Worker
Chrome QA Worker
Image Gateway Worker
```

Rules:

```text
No direct concurrent Codex CLI calls.
Use queue lock.
Audit every job.
Do not fallback silently without logging.
```

---

## 24. Image Studio

Flow:

```text
Image Studio UI
→ Image Gateway
→ Policy Filter
→ Queue Lock
→ Mock Provider
→ Asset Registry
→ Audit Log
```

Default:

```text
Mock provider only.
Paid generation disabled.
Codex CLI disabled.
Hermes disabled.
```

Allowed outputs:

```text
Infographic
Architecture diagram
Social media graphic
Solar roof illustration
AI command center
Product explainer
UI mockup
Carousel
Thumbnail
```

Forbidden:

```text
Deepfake without consent
Fraudulent identity content
Scam creative
Prompt injection to bypass policy
Reading local secret files
Sending generated content externally without approval
```

---

## 25. Local AI Runtime

Adapters:

```text
Ollama
llama.cpp
LM Studio
```

Use local AI for:

```text
Intent classification
Lead scoring draft
Post-live summary
FAQ draft
Local RAG fallback
Offline assistant
Memory cleanup
Dev command explanation
```

Do not use local AI for:

```text
Public endpoint
Customer send
Deploy decision
Secret reading
Final legal/financial approval
```

---

## 26. Creative Automation / After Effects MCP

Flow:

```text
User Prompt
→ Intent Parser
→ Animation Plan
→ Timeline Plan
→ MCP Tool Preview
→ Human Approval
→ After Effects MCP
→ Preview / Render Queue
→ Asset Registry
→ Memory Loop
```

Default:

```text
AFTER_EFFECTS_MCP_ENABLED=false
AFTER_EFFECTS_MCP_DRY_RUN=true
AFTER_EFFECTS_RENDER_ENABLED=false
```

Rules:

```text
No real AE command unless approved.
No render/export unless approved.
No overwrite of project files.
No arbitrary file path.
Every tool call requires correlation_id.
```

---

## 27. MCP Tool Policy

Default:

```text
All MCP tools run in dry-run mode.
```

Required:

```text
Tool allowlist
Command allowlist
File path allowlist
No shell from free text
Human approval for destructive actions
Human approval for render/export
Audit log for every tool call
```

Forbidden:

```text
Reading .env
Reading secret files
Arbitrary shell
Writing outside workspace
Uploading files externally
Sending customer messages
Deploy/cloud mutation
```

---

## 28. GPU Research Lab

Purpose:

```text
Track llama.cpp multi-GPU / AllReduce / consumer GPU scaling.
```

Status:

```text
Research only.
Not production dependency.
No performance claim before benchmark.
```

Metrics:

```text
tokens/sec
model size
quantization
VRAM per GPU
CPU RAM usage
first token latency
total latency
thermal stability
crash rate
```

Forbidden claims:

```text
รวม VRAM ได้แน่นอน
แรงเท่า NVLink
production-ready แล้ว
```

---

## 29. Security Threat Model

Threat categories:

```text
T1: Secret leakage
T2: Prompt injection
T3: Tool misuse
T4: Unauthorized external action
T5: PII exposure
T6: Cost exhaustion
T7: Agent runaway loop
T8: Memory poisoning
T9: Public exposure of internal service
T10: Unsafe marketing claims
T11: Unauthorized cloud mutation
T12: MCP tool abuse
T13: Auth session collision
T14: Data loss / backup failure
```

Mitigations:

```text
Secret scan
.env ignored
Allowlisted tools
Dry-run first
Human approval gates
PII masker
Cost guard
Max repair attempts
Memory provenance
Cloudflare Access
Solar claim guard
External action kill switches
MCP policy
Auth isolation
Backup / restore drill
```

---

## 30. Evaluation Framework

Evaluate the full system, not just the final answer.

Dimensions:

```text
Task completion
Tool selection accuracy
Retrieval quality
Reasoning coherence
Safety compliance
Permission compliance
Cost efficiency
Latency
Observability completeness
Human approval correctness
Rollback readiness
Regression stability
```

For each AI run, record:

```text
input
expected behavior
actual behavior
tool calls
retrieved context
model used
tokens
cost
latency
risk level
approval result
final verdict
```

Verdicts:

```text
PASS
PASS_WITH_WARNING
BLOCKED
FAIL_RETRY_ALLOWED
FAIL_HUMAN_REQUIRED
FAIL_POLICY_VIOLATION
```

Minimum evaluation datasets:

```text
evaluation/golden_dataset.json
evaluation/solar_claim_cases.json
evaluation/live_reply_cases.json
evaluation/tool_permission_cases.json
evaluation/rag_retrieval_cases.json
evaluation/security_prompt_injection_cases.json
evaluation/cost_guard_cases.json
evaluation/devtools_qa_cases.json
evaluation/creative_mcp_cases.json
```

---

## 31. Agent Workforce

Core agents:

```text
Architect Agent
Coder Agent
Tester Agent
Reviewer Agent
Doc Agent
Compliance Agent
Memory Agent
Release Agent
Browser QA Agent
Image Agent
Creative Agent
Local AI Runtime Agent
Cost Guard Agent
Security Scan Agent
```

Hermes Agent HQ roles:

```text
DevOps Watcher
Research Analyst
CRM & Sales Agent
Personal Assistant
Content Creator
Automation Orchestrator
```

Every agent must have:

```text
Role boundary
State boundary
Tool permission boundary
Cost guard
Audit log
Evaluation or verdict layer
Human approval for risky actions
```

---

## 32. Cost Guard

Rules:

```text
Max repair attempts
Max spend per task
Runtime limit
Stop on repeated failure
Human review required
Paid API requires approval
Real deployment requires approval
```

Recommended defaults:

```env
COST_GUARD_ENABLED=true
MAX_REPAIR_ATTEMPTS=2
MAX_SPEND_PER_TASK_USD=5
MAX_RUNTIME_MINUTES=60
STOP_ON_REPEATED_FAILURE=true
```

Cost event schema:

```json
{
  "correlation_id": "sirinx-cost-001",
  "task_id": "task_001",
  "actor": "Coder Agent",
  "provider": "model_provider",
  "estimated_cost_usd": 0.12,
  "runtime_seconds": 33,
  "attempt": 1,
  "status": "allowed"
}
```

---

## 33. Defensive Security Scan Governance

Allowed:

```text
Owned assets only
Authorized internal targets
Dependency check
TLS / headers / config check
Non-invasive baseline scans
Masked findings
```

Blocked:

```text
Third-party targets
Exploitation
Brute force
Credential attacks
Stealth scans
Malware
Public unauthorized scans
```

Tools:

```text
npm audit
Snyk
OWASP ZAP Baseline
Dependency Check
TLS / Headers Check
Secrets Scan
```

---

## 34. Ads / Growth Readiness

Use for GhostClaw / Marketing only. Excludes AGM.

Checklist:

```text
Landing Page
Tracking
Offer
Consent / Privacy
Creative Review
Dry-run tracking
```

Launch locked until:

```text
Tracking ready
Privacy ready
Offer approved
Cost guard active
Human approval
```

---

## 35. n8n Workflows

Required workflows:

```text
n8n-youtube-live-chat
n8n-lead-routing
n8n-line-handoff
n8n-post-live-summary
n8n-content-idea-agent
n8n-ads-readiness
n8n-dev-command-dry-run
n8n-security-scan-summary
n8n-cost-guard-alert
```

Rule:

```text
Dry-run first.
No customer send by default.
No cloud mutation by default.
```

---

## 36. PR Roadmap

```text
PR-001: bootstrap governance + monorepo
PR-002: freeze Mac live baseline
PR-003: add dev.sirinx.co command dashboard
PR-004: add safety kill switches
PR-005: add human approval queue
PR-006: add solar claim guard
PR-007: add production AI backend
PR-008: add MySQL / Redis foundation
PR-009: add Chrome DevTools MCP QA
PR-010: add n8n dry-run workflows
PR-011: add Codex/Hermes auth isolation
PR-012: add Image Gateway mock provider
PR-013: add staged external adapters
PR-014: add local AI runtime gateway
PR-015: add creative automation studio scaffold
PR-016: add After Effects MCP dry-run adapter
PR-017: add MCP tool policy and audit log
PR-018: add GPU research lab and benchmark templates
PR-019: add dev dashboard pages for local AI, creative automation, GPU lab
PR-020: add cost guard
PR-021: add defensive security scan governance
PR-022: add ads/growth readiness dashboard
PR-023: add observability and feedback loop
PR-024: add backup / restore / rollback
PR-025: staging release
PR-026: production approval gate
```

---

## 37. System Readiness Levels

Use readiness levels instead of vague “production ready.”

```text
SRL-0: Idea / sketch
SRL-1: Local mock
SRL-2: Local working baseline
SRL-3: Dry-run integrated
SRL-4: Staging with test data
SRL-5: Staging with real credentials but no external send
SRL-6: Limited production with human approval
SRL-7: Production monitored
SRL-8: Production with rollback and restore tested
SRL-9: Mature operating system with audit, cost, security, and evaluation loops
```

Current status:

```text
Mac Live Agent Studio: SRL-2
SIRINX OS overall: SRL-1 to SRL-2 depending on module
Target next: SRL-3
```

---

## 38. Immediate Implementation Order

Do not start production deployment now.

Start with:

```text
PR-001 + PR-002 + PR-003
```

Meaning:

```text
1. Governance + Monorepo
2. Mac Live Baseline
3. dev.sirinx.co Command Center
```

Only after that continue:

```text
PR-004: Kill Switches
PR-005: Approval Queue
PR-006: Solar Claim Guard
PR-007: Production AI Backend
```

---

## 39. Master Command for Agents

```text
You are the SIRINX OS Full-Stack Agentic Developer.

Scope:
Build and harden SIRINX OS excluding AGM.

Current Status:
Mac mini live test has passed.
Live Agent Studio MVP works locally.
dev.sirinx.co must become the internal Developer Command Center.

Included Systems:
- SIRINX OS Core
- dev.sirinx.co
- SIRINX GOD AI / Sirinx Solar
- OPAL ROI
- Live Agent Studio
- Production AI Backend
- GhostClaw
- Zenith / n8n
- Chrome DevTools MCP
- Codex / Hermes / OpenClaw
- Local AI / Ollama / llama.cpp
- Image Studio
- After Effects MCP / Creative Automation
- GPU Research Lab
- MySQL / Redis / R2 / Vector / Obsidian Memory
- Release Gates
- Kill Switches
- Cost Guard
- Security Scan

Excluded:
- AGM

Operating Workflow:
Goal + Constraints + File Scope + Expected Result
Inspect → Plan → Implement → Verify → Report

Hard Rules:
- Do not deploy.
- Do not push Git.
- Do not mutate cloud resources.
- Do not edit real .env.
- Only update .env.example.
- Do not create real secrets.
- Do not trigger paid APIs.
- Do not send real customer messages.
- Do not expose local AI publicly.
- Do not run real MCP destructive tools by default.
- Do not render/export in After Effects without approval.
- No guaranteed ROI, savings, revenue, no-ban, bypass, fake-proof, or zero-downtime claims.
- Mask PII.
- Human approval required before external write actions.
- Cost guard required before expensive tasks.

First Tasks:
1. Bootstrap governance and monorepo.
2. Freeze Mac live baseline.
3. Add dev.sirinx.co dashboard.
4. Add kill switches.
5. Add approval queue.
6. Add solar claim guard.
7. Add Production AI Backend.
8. Add Chrome DevTools MCP QA.
9. Add n8n dry-run workflows.
10. Add auth isolation.
11. Add Image Gateway mock provider.
12. Add Local AI runtime.
13. Add Creative Automation Studio.
14. Add GPU Research Lab.
15. Add Cost Guard.
16. Add Defensive Security Scan.
17. Add Observability.
18. Add Backup / Restore / Rollback.

Return:
- file tree
- files created
- commands to run
- verification checklist
- release gate status
- risks
- next PR
```

---

## 40. Final Reminder

```text
SIRINX OS must be honest about architecture.

Pipeline when predictable.
Agent when open-ended.
Hybrid when production.
Human approval when risky.
Audit log always.
Cost guard always.
No secrets always.
Dry-run first always.
```

AGM is out of scope.

SIRINX OS is the system.

dev.sirinx.co is the command center.

Mac live test passed is the baseline.

Everything else must pass gates before production.

---

## Appendix A — Coding Model Router Addendum V2.1

For model selection, coding worker routing, OpenRouter integration, local model integration, Claude Code subagents, Codex peer review, OpenCode review lanes, and Hermes orchestration, see:

- `AGENTS_MODEL_ROUTER_ADDENDUM.md`
- `CLAUDE_MODEL_ROUTER_ADDENDUM.md`
- `docs/model-routing/MODEL_REGISTRY.md`
- `docs/model-routing/ROUTING_MATRIX.md`
- `docs/model-routing/PROVIDER_POLICY.md`
- `config/model-router/model_router.registry.yaml`

Core rule: cheapest safe model first; paid models only behind budget gate; T4 (deploy/secret/customer) requires human gate.

---

## Appendix B — Omnigent Hermes Command Center

The project-local Omnigent bundle is:

- `integrations/omnigent/ghostclaw-command-center/`
- `.omnigent/config.yaml`
- `scripts/omnigent-ghostclaw-command-center`

Role ownership is fixed: Hermes coordinates, Claude produces read-only
architecture, Codex is the sole repository writer, and OpenCode plus Hermes
perform independent read-only review. Never dispatch overlapping write scopes.
Antigravity is attended-only and is not registered as a headless worker.

Safe local checks:

```text
scripts/omnigent-ghostclaw-command-center validate
scripts/omnigent-ghostclaw-command-center status
```

The loopback server is a local control plane only. Starting a provider session,
Antigravity session, push, deploy, publish, secret access, or cloud mutation
requires its own exact gate. Omnigent worker output is evidence, not permission
to stage or commit.
