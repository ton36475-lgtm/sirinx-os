# SIRINX OS — 47 Ronin Autonomous Organization

## Concept

ระบบ SIRINX OS ทำงานเหมือนบริษัทจริง 47 ตำแหน่ง แบ่งเป็น 13 แผนก
แต่ละตำแหน่งสวมบทบาทผู้เชี่ยวชาญจริง ตามแนวทางของ Anthropic + OpenAI
ระบบอัพเกรดตัวเอง (Self-Evolution) ไม่มีวันตาย — เหมือนไวรัสกลายพันธุ์

## Organization Chart (47 Ronin)

### 🏛️ C-Suite (Executive) — 5 agents
| # | Role | Title | Model | Autonomy |
|---|------|-------|-------|----------|
| 01 | **shogun** | CEO / Mission Commander | GLM-5.2 | A5 |
| 02 | **planner** | COO / Chief Operating Officer | GLM-5.2 | A4 |
| 03 | **backend** | CTO / Chief Technology Officer | GLM-5.2 | A4 |
| 04 | **frontend** | CPO / Chief Product Officer | GLM-5.2 | A4 |
| 05 | **scribe** | CFO / Chief Financial + Audit Officer | GLM-5.2 | A3 |

### 🏗️ Engineering Division — 8 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 06 | **codex-captain** | VP Engineering | Repo execution, Rust, TypeScript |
| 07 | **claude-architect** | Principal Architect | System design, read-only analysis |
| 08 | **opencode-reviewer** | Staff Engineer | Security audit, code review |
| 09 | **devops-engineer** | SRE / Platform Engineer | Docker, Cloudflare, deployment |
| 10 | **backend-engineer-1** | Senior Backend Engineer | API design, database |
| 11 | **backend-engineer-2** | Backend Engineer | Microservices, queues |
| 12 | **frontend-engineer-1** | Senior Frontend Engineer | React, Next.js, UI |
| 13 | **frontend-engineer-2** | Frontend Engineer | CSS, animations, accessibility |

### 🎨 Creative & Design — 4 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 14 | **design-lead** | Design Director | Design system, brand |
| 15 | **ui-designer** | Product Designer | Figma, prototyping |
| 16 | **creative-producer** | Creative Engineer | Motion, video, AE |
| 17 | **content-writer** | Technical Writer | Docs, blog, marketing |

### 🔬 AI/ML Research — 4 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 18 | **ml-researcher** | ML Research Lead | Model training, fine-tuning |
| 19 | **data-scientist** | Data Scientist | Analytics, visualization |
| 20 | **prompt-engineer** | Prompt Engineer | Prompt design, evaluation |
| 21 | **ai-evaluator** | AI Safety Researcher | Red-teaming, evaluation |

### 🔒 Security & Compliance — 4 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 22 | **security-lead** | CISO | Security strategy, threat model |
| 23 | **pentester** | Security Engineer | Vulnerability scanning |
| 24 | **compliance-officer** | Compliance Manager | SOC2, GDPR, PDPA |
| 25 | **audit-agent** | Internal Auditor | Audit trail, evidence collection |

### 📊 Data & QA — 4 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 26 | **qa-lead** | QA Director | Test strategy, automation |
| 27 | **test-engineer-1** | Senior QA Engineer | E2E, integration tests |
| 28 | **test-engineer-2** | QA Engineer | Unit tests, regression |
| 29 | **data-engineer** | Data Engineer | Pipeline, ETL, warehouse |

### 🚀 Growth & Marketing — 3 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 30 | **growth-lead** | VP Growth | SEO, analytics, funnel |
| 31 | **marketing-agent** | Marketing Manager | Campaigns, social media |
| 32 | **ads-specialist** | Performance Marketer | Ads, A/B testing |

### 💰 Sales & Revenue — 3 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 33 | **sales-lead** | VP Sales | Strategy, pipeline |
| 34 | **solar-consultant** | Solar ROI Specialist | Sirinx Solar, OPAL |
| 35 | **crm-agent** | CRM Manager | Lead routing, LINE handoff |

### 🔧 Operations — 4 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 36 | **ops-lead** | VP Operations | Process, workflow |
| 37 | **sre-oncall** | SRE / On-Call | Incident response, uptime |
| 38 | **cost-guard** | Cost Controller | Budget tracking, spend alerts |
| 39 | **memory-keeper** | Knowledge Manager | Brain sync, Obsidian, memory |

### 🌐 Integration — 3 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 40 | **integration-lead** | Integration Director | OmniRoute, MCP, A2A |
| 41 | **line-operator** | LINE Bot Manager | Webhook, messaging, handoff |
| 42 | **webhook-manager** | Webhook Specialist | Event routing, n8n |

### 🧪 Innovation Lab — 2 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 43 | **gpu-researcher** | GPU Lab Engineer | llama.cpp, multi-GPU scaling |
| 44 | **local-ai-engineer** | Local AI Specialist | Ollama, LM Studio, inference |

### 🛡️ Autonomous Defense — 3 agents
| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 45 | **auto-healer** | Self-Healing Daemon | Error detection, auto-repair |
| 46 | **evolution-engine** | Dream Mode Agent | Self-improvement, mutation |
| 47 | **sentinel** | System Sentinel | Monitoring, alerting, kill switch |

---

## Self-Evolution Engine (Dream Mode)

### Concept
ระบบทำงานต่อเนื่อง — เมื่อพบ error หรือมีเวลาว่าง จะเข้าสู่ "Dream Mode"
เพื่อวิเคราะห์ อัพเกรด และกลายพันธุ์ตัวเอง

### Dream Mode Triggers
1. **Error Found** → auto-analyze → fix → test → commit
2. **Idle Time** (no tasks in queue > 5 min) → review code → optimize
3. **Daily Report** → analyze patterns → propose improvements
4. **Skill Gap** → detect missing capability → create new skill
5. **Performance Degradation** → benchmark → optimize → verify

### Evolution Rules
- กลายพันธุ์ได้เฉพาะ Tier A (local safe) — ไม่แตะ external
- ทุกการเปลี่ยนแปลงต้องผ่าน test suite
- เก็บ snapshot ก่อนทุก mutation
- Rollback อัตโนมัติถ้า test fail
- บันทึกทุก evolution ใน evolution log

### Mutation Types
1. **Skill Mutation** — สร้าง/แก้ skill ใหม่จาก pattern ที่เจอ
2. **Code Mutation** — refactor, optimize, fix dead code
3. **Config Mutation** — tune parameters, thresholds
4. **Architecture Mutation** — propose structural change (requires human approval)

---

## Dispatch Rules

### Goal → Agent Routing
```
/deploy, /push, /cloud         → devops-engineer (Tier C: human gate)
/fix, /bug, /test              → codex-captain (Tier A: auto)
/design, /architect            → claude-architect (Tier A: read-only)
/audit, /security              → opencode-reviewer (Tier A: auto)
/create, /build, /feature      → codex-captain → backend/frontend
/review                        → opencode-reviewer + claude-architect
/research, /analyze            → ml-researcher + data-scientist
/optimize, /performance        → gpu-researcher + backend-engineer
/document, /docs               → content-writer
/deploy-marketing              → marketing-agent (Tier C: human gate)
/goal (free text)              → planner decomposes → dispatches
```

### Parallel Execution
- สูงสุด 3 concurrent agents (จำกัดด้วย 8GB RAM)
- Task DAG กำหนดลำดับ dependencies
- Workers ไม่คุยกันโดยตรง — ผ่าน Hermes หรือ shared state

---

## Safety Inheritance
ทุก agent สืบทอดกฎจาก AGENTS.md:
- No secrets, no .env reads
- No push/deploy without human gate
- Dry-run first
- Cost guard active
- PII masking always
- Audit log always
