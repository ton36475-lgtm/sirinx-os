# UNIFIED SKILL MANIFEST V1
**All Agents Skill Bundle - Single Scope**
**Generated:** 2026-07-18
**Source:** ~/.hermes/skills (248 skills total)
**Scope:** Claude, ChatGPT/Codex, Hermes, OpenCode, All Agents

---

## EXECUTIVE SUMMARY

```text
Total Skills: 248
Categories: 30
Manifest Status: COMPLETE
Scope: ALL AGENTS (Unified)
```

### Skill Distribution

| Category | Count | Purpose |
|----------|-------|---------|
| autonomous-ai-agents | 12 | Codex, Claude, OpenCode delegation |
| development | 33 | Software development workflows |
| creative | 18 | Art, design, media generation |
| devops | 12 | Infrastructure, deployment |
| github | 6 | GitHub workflows |
| mlops | 11 | ML operations |
| productivity | 11 | Office tools, automation |
| frontend | 6 | Web development |
| backend | 7 | Server-side development |
| ai-ml | 8 | AI/ML workflows |
| apple | 5 | macOS integration |
| computer-use | 1 | Desktop automation |
| mcp | 2 | MCP integration |
| media | 4 | Media processing |
| note-taking | 2 | Obsidian, notes |
| research | 6 | Research workflows |
| testing-qa | 5 | Testing strategies |
| ghostclaw-os | 7 | GhostClaw OS workflows |
| automation | 3 | Automation patterns |
| autonomous | 2 | Self-evolution systems |
| software-development | 20 | Dev workflows |
| superpowers | 10 | Superpowers workflow |
| codex-shared | 16 | Shared Codex skills |
| design | 1 | Design systems |
| audit-and-security | 1 | Security auditing |
| red-teaming | 1 | Red teaming |
| data-science | 1 | Jupyter, data |
| diagramming | 1 | Diagrams, canvases |
| dogfood | 1 | QA workflows |
| domain | 1 | Domain workflows |
| email | 1 | Email workflows |
| gaming | 3 | Gaming servers |
| gifs | 1 | GIF search |
| hermes-desktop-plugins | 1 | Hermes plugins |
| inference-sh | 1 | Inference shells |
| product | 1 | Productivity |
| security | 1 | Security |
| smart-home | 1 | Home automation |
| social-media | 1 | Social media |
| mercury-whitelist | 1 | Mercury skills |

---

## SKILL MANIFEST BY CATEGORY

### 1. AUTONOMOUS-AI-AGENTS (12 skills)

**Purpose:** Delegate coding tasks to specialized AI agents

```yaml
claude-code:
  description: Delegate coding to Claude Code CLI (features, PRs)
  tools: [codex_cli, git, terminal]
  scope: coding, features, PRs

codex:
  description: Delegate coding to OpenAI Codex CLI (features, PRs)
  tools: [codex_cli, git, terminal]
  scope: coding, features, PRs

opencode:
  description: Delegate coding to OpenCode CLI (features, PR review)
  tools: [opencode_cli, git, terminal]
  scope: coding, features, review

dynamic-workflow:
  description: Orchestrate large fan-out work as plan-in-code workflow
  tools: [delegate_task, terminal, git]
  scope: large tasks, multi-agent

ghostclaw-orchestration-patterns:
  description: Multi-agent orchestration for GhostClaw projects
  tools: [delegate_task, terminal, git]
  scope: ghostclaw, parallel agents

hermes-agent:
  description: Configure, extend, or contribute to Hermes Agent
  tools: [terminal, git, file_ops]
  scope: hermes configuration

kanban-codex-lane:
  description: Kanban worker runs Codex CLI in isolated lane
  tools: [codex_cli, git, terminal]
  scope: kanban, isolated coding

vibe-coding-sidebar:
  description: Multi-agent parallel coding with isolated worktrees
  tools: [git, delegate_task, terminal]
  scope: parallel coding, 4+ lanes
```

### 2. DEVELOPMENT (33 skills)

**Purpose:** Software development workflows, TDD, debugging

```yaml
brainstorming:
  description: MUST use before creative work - explore intent
  trigger: [create, build, add, modify]
  scope: pre-work exploration

executing-plans:
  description: Execute written implementation plans
  trigger: [plan, roadmap]
  scope: implementation from specs

finishing-a-development-branch:
  description: Guide completion decision (merge, PR, cleanup)
  trigger: [implementation complete, tests pass]
  scope: branch completion

receiving-code-review:
  description: Verify feedback before implementing
  trigger: [code review, feedback]
  scope: review verification

test-driven-development:
  description: TDD: RED-GREEN-REFACTOR, tests before code
  trigger: [implement, feature]
  scope: tdd workflow

systematic-debugging:
  description: 4-phase debugging: understand before fix
  trigger: [bug, error, failure]
  scope: debugging

writing-plans:
  description: Write implementation plans with bite-sized tasks
  trigger: [plan, roadmap]
  scope: planning

spec-driven-ai-coding:
  description: Spec-driven development with brainstorming, planning, testing
  trigger: [spec, requirements]
  scope: spec-driven coding

subagent-driven-development:
  description: Execute plans via delegate_task subagents (2-stage review)
  trigger: [plan, execute]
  scope: subagent execution

spike:
  description: Throwaway experiments to validate ideas
  trigger: [spike, experiment, prototype]
  scope: validation

plan:
  description: Plan mode: write markdown plan to .hermes/plans/
  trigger: [plan, roadmap]
  scope: planning only

python-debugpy:
  description: Debug Python: pdb REPL + debugpy remote (DAP)
  tools: [debugpy, pdb]
  scope: python debugging

node-inspect-debugger:
  description: Debug Node.js via --inspect + Chrome DevTools
  tools: [node, chrome-devtools]
  scope: node debugging

requesting-code-review:
  description: Pre-commit review: security scan, quality gates
  tools: [security_scan, linter]
  scope: pre-commit

simplify-code:
  description: Parallel 3-agent cleanup of recent changes
  tools: [delegate_task, git]
  scope: code cleanup

writing-skills:
  description: Create/edit/verify skills before deployment
  trigger: [create skill, edit skill]
  scope: skill authoring

hermes-agent-skill-authoring:
  description: Author in-repo SKILL.md with frontmatter, validator
  tools: [file_ops, yaml_validator]
  scope: skill creation
```

### 3. CREATIVE (18 skills)

**Purpose:** Art, design, media generation

```yaml
architecture-diagram:
  description: Dark-themed SVG architecture/cloud diagrams
  tools: [svg_generator, html]
  scope: diagrams, architecture

ascii-art:
  description: ASCII art: pyfiglet, cowsay, boxes, image-to-ascii
  tools: [pyfiglet, cowsay]
  scope: ascii art

baoyu-article-illustrator:
  description: Article illustrations: type × style × palette
  tools: [image_generator]
  scope: article illustrations

baoyu-comic:
  description: Knowledge comics: educational, biography, tutorial
  tools: [comic_generator]
  scope: educational comics

baoyu-infographic:
  description: Infographics: 21 layouts × 21 styles
  tools: [infographic_generator]
  scope: data visualization

claude-design:
  description: Design one-off HTML artifacts (landing, deck)
  tools: [html, css, js]
  scope: web design

comfyui:
  description: Generate images/video/audio with ComfyUI
  tools: [comfyui_cli, rest_api]
  scope: ai media generation

excalidraw:
  description: Hand-drawn Excalidraw JSON diagrams
  tools: [excalidraw]
  scope: diagrams

ideation:
  description: Generate project ideas via creative constraints
  scope: brainstorming

manim-video:
  description: Manim CE animations: 3Blue1Brown math/algo
  tools: [manim]
  scope: math animations

p5js:
  description: p5.js sketches: gen art, shaders, interactive
  tools: [p5js]
  scope: creative coding

pixel-art:
  description: Pixel art w/ era palettes (NES, Game Boy)
  tools: [pixel_editor]
  scope: pixel art

popular-web-designs:
  description: 54 real design systems as HTML/CSS
  tools: [html, css]
  scope: web design

pretext:
  description: Creative browser demos with @chenglou/pretext
  tools: [pretext, html]
  scope: creative web

sketch:
  description: Throwaway HTML mockups: 2-3 design variants
  tools: [html, css]
  scope: mockups

songwriting-and-ai-music:
  description: Songwriting craft and Suno AI music prompts
  scope: music generation

touchdesigner-mcp:
  description: Control TouchDesigner via twozero MCP
  tools: [touchdesigner_mcp]
  scope: realtime visuals
```

### 4. DEVOPS (12 skills)

**Purpose:** Infrastructure, deployment, automation

```yaml
p100-phase-inventory-audit:
  description: Standardized read-only inventory/audit pattern
  tools: [terminal, file_ops]
  scope: auditing

pnpm-package-management:
  description: Manage pnpm workspaces, resolve store conflicts
  tools: [pnpm]
  scope: package management

webhook-subscriptions:
  description: Webhook subscriptions: event-driven agent runs
  tools: [webhook, rest_api]
  scope: webhooks

hermes-godmode-team-ops:
  description: Coordinate Hermes-agent and Codex teams
  tools: [delegate_task, git, obsidian]
  scope: team coordination

cloud-architecture:
  description: Cloud infrastructure patterns
  scope: infrastructure

docker-patterns:
  description: Docker containerization patterns
  tools: [docker]
  scope: containers

kanban-worker:
  description: Kanban worker operations
  scope: task management

devops:
  description: General DevOps workflows
  scope: operations

release-engineering:
  description: Release pipeline management
  tools: [git, ci_cd]
  scope: releases

site-reliability:
  description: SRE practices
  scope: reliability

infrastructure:
  description: Infrastructure as code
  scope: infra
```

### 5. GITHUB (6 skills)

**Purpose:** GitHub workflows, PRs, issues

```yaml
github-auth:
  description: GitHub auth setup: HTTPS tokens, SSH keys, gh CLI
  tools: [gh, git, ssh]
  scope: authentication

github-auth-troubleshooting:
  description: Diagnose/fix GitHub auth errors, credential helpers
  tools: [gh, git]
  scope: auth debugging

github-code-review:
  description: Review PRs: diffs, inline comments via gh/REST
  tools: [gh, rest_api]
  scope: code review

github-issues:
  description: Create/triage/label/assign GitHub issues
  tools: [gh, rest_api]
  scope: issues

github-pr-workflow:
  description: PR lifecycle: branch, commit, open, CI, merge
  tools: [gh, git]
  scope: pull requests

github-repo-management:
  description: Clone/create/fork repos; manage remotes, releases
  tools: [gh, git]
  scope: repository management
```

### 6. MLOPS (11 skills)

**Purpose:** ML operations, training, deployment

```yaml
evaluating-llms-harness:
  description: lm-eval-harness: benchmark LLMs (MMLU, GSM8K)
  tools: [lm_eval, python]
  scope: evaluation

weights-and-biases:
  description: W&B: log experiments, sweeps, model registry
  tools: [wandb, python]
  scope: experiment tracking

axolotl:
  description: Axolotl: YAML LLM fine-tuning (LoRA, DPO, GRPO)
  tools: [axolotl, python]
  scope: lora tuning

fine-tuning-with-trl:
  description: TRL: SFT, DPO, PPO, GRPO for LLM RLHF
  tools: [trl, python]
  scope: rlhf training

unsloth:
  description: 2-5x faster LoRA/QLoRA fine-tuning, less VRAM
  tools: [unsloth, python]
  scope: efficient tuning

dspy:
  description: DSPy: declarative LM programs, auto-optimize prompts
  tools: [dspy, python]
  scope: prompt optimization

huggingface-hub:
  description: HF hf CLI: search/download/upload models, datasets
  tools: [hf_cli, python]
  scope: model hub

llama-cpp:
  description: llama.cpp local GGUF inference + HF Hub discovery
  tools: [llama_cpp, python]
  scope: local inference

outlines:
  description: Structured JSON/regex/Pydantic LLM generation
  tools: [outlines, python]
  scope: structured generation

serving-llms-vllm:
  description: vLLM: high-throughput LLM serving, OpenAI API
  tools: [vllm, python]
  scope: model serving

segment-anything-model:
  description: SAM: zero-shot image segmentation
  tools: [sam, python]
  scope: image segmentation
```

### 7. PRODUCTIVITY (11 skills)

**Purpose:** Office tools, automation

```yaml
airtable:
  description: Airtable REST API via curl: CRUD, filters, upserts
  tools: [curl, jq]
  scope: airtable automation

google-workspace:
  description: Gmail, Calendar, Drive, Docs, Sheets via gws CLI
  tools: [gws_cli, python]
  scope: google workspace

linear:
  description: Linear: manage issues/projects via GraphQL + curl
  tools: [curl, graphql]
  scope: issue tracking

maps:
  description: Geocode, POIs, routes via OpenStreetMap/OSRM
  tools: [osrm, curl]
  scope: maps, routing

nano-pdf:
  description: Edit PDF text/typos via nano-pdf CLI (NL prompts)
  tools: [nano_pdf]
  scope: pdf editing

notion:
  description: Notion API + ntn CLI: pages, databases, markdown
  tools: [notion_api, ntn_cli]
  scope: notion automation

ocr-and-documents:
  description: Extract text from PDFs/scans (pymupdf, marker-pdf)
  tools: [pymupdf, marker]
  scope: ocr

powerpoint:
  description: Create/read/edit .pptx decks, slides, templates
  tools: [python_pptx]
  scope: presentations

teams-meeting-pipeline:
  description: Teams meeting summary via Hermes CLI
  tools: [hermes_cli, ms_graph]
  scope: meetings

petdex:
  description: Install/select animated petdex mascots for Hermes
  tools: [petdex_cli]
  scope: mascots

product:
  description: Productivity workflows
  scope: productivity
```

### 8. FRONTEND (6 skills)

**Purpose:** Web development, UI/UX

```yaml
frontend-design:
  description: Production-grade frontend with high design quality
  tools: [react, tailwind, css]
  scope: web components, pages

web-perf:
  description: Analyze web performance via Chrome DevTools MCP
  tools: [chrome_devtools_mcp, lighthouse]
  scope: performance audit

webapp-testing:
  description: Toolkit for web apps via Playwright
  tools: [playwright]
  scope: testing, screenshots

popular-web-designs:
  description: 54 real design systems as HTML/CSS
  tools: [html, css]
  scope: design systems

claude-design:
  description: One-off HTML artifacts
  tools: [html, css]
  scope: landing pages

frontend:
  description: General frontend workflows
  scope: web development
```

### 9. BACKEND (7 skills)

**Purpose:** Server-side development

```yaml
backend:
  description: General backend workflows
  scope: server-side

rust-python-ml-prototype:
  description: Hybrid Rust+Python ML prototypes
  tools: [rust, python]
  scope: ml systems

inference-sh:
  description: Inference shell patterns
  scope: inference

server:
  description: Server workflows
  scope: backend

database:
  description: Database workflows
  scope: databases

api:
  description: API development
  scope: apis

testing:
  description: Backend testing
  scope: testing
```

### 10. AI-ML (8 skills)

**Purpose:** AI/ML workflows

```yaml
ai-ml:
  description: General AI/ML workflows
  scope: ai/ml

data-science:
  description: Data science workflows
  scope: data science

ml:
  description: Machine learning workflows
  scope: ml

research:
  description: AI research workflows
  scope: research

experimentation:
  description: ML experimentation
  scope: experiments

models:
  description: Model workflows
  scope: models

training:
  description: Training workflows
  scope: training

inference:
  description: Inference workflows
  scope: inference
```

### 11. APPLE (5 skills)

**Purpose:** macOS integration

```yaml
apple-notes:
  description: Manage Apple Notes via memo CLI
  tools: [memo_cli]
  scope: notes

apple-reminders:
  description: Apple Reminders via remindctl
  tools: [remindctl]
  scope: reminders

findmy:
  description: Track Apple devices/AirTags via FindMy.app
  tools: [findmy_app]
  scope: device tracking

imessage:
  description: Send/receive iMessages/SMS via imsg CLI
  tools: [imsg_cli]
  scope: messaging

macos-computer-use:
  description: Drive macOS desktop in background
  tools: [cua_driver]
  scope: desktop automation
```

### 12. COMPUTER-USE (1 skill)

```yaml
computer-use:
  description: Drive desktop in background - clicking, typing, scrolling
  tools: [cua_driver]
  scope: desktop automation
```

### 13. MCP (2 skills)

```yaml
mcp-web-knowledge-integration:
  description: Configure MCP for web scraping/knowledge bases
  tools: [mcp_config]
  scope: mcp servers

native-mcp:
  description: MCP client: connect servers, register tools
  tools: [mcp_client]
  scope: mcp integration
```

### 14. MEDIA (4 skills)

```yaml
gif-search:
  description: Search/download GIFs from Tenor via curl + jq
  tools: [curl, jq]
  scope: gifs

heartmula:
  description: Suno-like song generation from lyrics + tags
  tools: [heartmula]
  scope: music

songsee:
  description: Audio spectrograms/features via CLI
  tools: [songsee]
  scope: audio analysis

spotify:
  description: Spotify: play, search, queue, playlists
  tools: [spotify_cli]
  scope: music

youtube-content:
  description: YouTube transcripts to summaries, threads
  tools: [youtube_cli]
  scope: video
```

### 15. NOTE-TAKING (2 skills)

```yaml
obsidian:
  description: Read/search/create/edit notes in Obsidian vault
  tools: [obsidian_cli]
  scope: notes

thai-english-hybrid-documentation:
  description: Thai headers + English technical docs
  tools: [markdown]
  scope: documentation
```

### 16. RESEARCH (6 skills)

```yaml
arxiv:
  description: Search arXiv papers by keyword, author, category
  tools: [arxiv_cli]
  scope: papers

blogwatcher:
  description: Monitor blogs/RSS/Atom feeds via blogwatcher-cli
  tools: [blogwatcher_cli]
  scope: blog monitoring

llm-wiki:
  description: Karpathy's LLM Wiki: build/query markdown KB
  tools: [llm_wiki]
  scope: knowledge base

polymarket:
  description: Query Polymarket: markets, prices, orderbooks
  tools: [polymarket_cli]
  scope: prediction markets

research-paper-writing:
  description: Write ML papers for NeurIPS/ICML/ICLR
  tools: [latex, arxiv]
  scope: papers

agent-framework-comparison:
  description: Compare AI agent frameworks (Hermes, CodeWhale, etc.)
  scope: integration decisions
```

### 17. TESTING-QA (5 skills)

```yaml
dogfood:
  description: Exploratory QA of web apps: find bugs, evidence
  tools: [browser, qa_tools]
  scope: qa

webapp-testing:
  description: Test web apps via Playwright
  tools: [playwright]
  scope: testing

testing:
  description: General testing workflows
  scope: testing

qa:
  description: QA workflows
  scope: qa

debugging:
  description: Debugging workflows
  scope: debugging
```

### 18. GHOSTCLAW-OS (7 skills)

```yaml
autonomous-loop-engineering:
  description: Fully autonomous loop engineering - Tier A/B execute
  tools: [terminal, git, delegate_task]
  scope: ghostclaw automation

ghostclaw-agent-delegation:
  description: Parallel agent delegation for Mac mini M2
  tools: [delegate_task, terminal]
  scope: parallel execution

ghostclaw-engineering-loop:
  description: Full-cycle autonomous workflow for GhostClaw OS
  tools: [terminal, git, delegate_task]
  scope: ghostclaw ops

ghostclaw-governance-contracts:
  description: Governance contracts (Tier, Capability, Lease, Approval)
  tools: [policy_enforcer]
  scope: governance

ghostclaw-integration-onboarding:
  description: Onboarding checklist for external tools integration
  tools: [integration_tools]
  scope: onboarding

ghostclaw-master-orchestrator:
  description: Master orchestration of all GhostClaw subsystems
  tools: [orchestrator]
  scope: master coordination

thaimart-k15-workflow:
  description: ThaiMart K01-K15 operational workflow engine
  tools: [thaimart_tools]
  scope: thai mart
```

### 19. AUTONOMOUS (2 skills)

```yaml
godmode-autonomous-evolution:
  description: GODMODE - Super Agentic Coding + Self-Evolution
  tools: [terminal, git, delegate_task]
  scope: self-evolution

sirinx-unified-master:
  description: Unified Master Orchestrator - all skills in one
  tools: [omniroute, delegate_task]
  scope: master orchestration
```

### 20. SOFTWARE-DEVELOPMENT (20 skills)

```yaml
debugging-hermes-tui-commands:
  description: Debug Hermes TUI slash commands
  tools: [python, hermes_cli]
  scope: hermes debugging

ghostclaw-autonomous-mutual-approval-v2:
  description: Autonomous mutual approval with policy enforcement
  tools: [approval_system]
  scope: approval workflow

ghostclaw-governance-framework:
  description: Tier-based governance contracts
  tools: [governance_tools]
  scope: governance

hermes-s6-container-supervision:
  description: Modify s6-overlay supervision tree
  tools: [s6_overlay]
  scope: container supervision

multi-provider-debugging:
  description: Debug multi-provider AI systems, credential routing
  tools: [debug_tools]
  scope: multi-provider

obra-superpowers-workflow:
  description: 5-phase development: brainstorming, planning, etc
  tools: [workflow_tools]
  scope: development methodology

sirinx-a2a-agent-loop:
  description: Full automation loop with A2A sync
  tools: [a2a_sync, telegram]
  scope: a2a automation

sirinx-autonomous-ops:
  description: MAX AUTONOMOUS NO-ASK MODE with safety gates
  tools: [safety_gates]
  scope: autonomous ops

unknowcoding-coding-team:
  description: Unknowcoding skills-kit as governed workflow
  tools: [unknowcoding_tools]
  scope: coding team
```

### 21. SUPERPOWERS (10 skills)

```yaml
brainstorming:
  description: MUST use before creative work
  scope: pre-work

dispatching-parallel-agents:
  description: Use when facing 2+ independent tasks
  tools: [delegate_task]
  scope: parallel work

executing-plans:
  description: Use when you have written implementation plan
  scope: plan execution

finishing-a-development-branch:
  description: Use when implementation complete
  scope: branch completion

receiving-code-review:
  description: Use when receiving code review feedback
  scope: review verification

using-git-worktrees:
  description: Use when starting feature work
  tools: [git_worktree]
  scope: workspace isolation

using-superpowers:
  description: Use when starting any conversation
  scope: skill discovery

verification-before-completion:
  description: Use before claiming work complete
  tools: [verification_tools]
  scope: verification

writing-plans:
  description: Use when creating implementation plans
  scope: planning

writing-skills:
  description: Use when creating/editing skills
  scope: skill authoring
```

### 22. CODEX-SHARED (16 skills)

```yaml
autofix:
  description: Review/apply CodeRabbit PR feedback
  tools: [code_rabbit_api]
  scope: pr review

brand-guidelines:
  description: Anthropic brand colors and typography
  scope: design

browserbase-cli:
  description: Browserbase CLI for Functions/API
  tools: [bb_cli]
  scope: browserbase

canvas-design:
  description: Visual art in .png/.pdf documents
  tools: [design_tools]
  scope: design

docx:
  description: Word documents (.docx)
  tools: [python_docx]
  scope: word docs

frontend-design:
  description: Production-grade frontend
  tools: [react, tailwind]
  scope: web design

pdf:
  description: PDF operations (read, merge, split, OCR)
  tools: [pymupdf, pdf_tools]
  scope: pdf

pptx:
  description: PowerPoint presentations (.pptx)
  tools: [python_pptx]
  scope: presentations

skill-creator:
  description: Create/edit/optimize skills
  tools: [skill_tools]
  scope: skills

web-artifacts-builder:
  description: Elaborate HTML artifacts (React, Tailwind, shadcn)
  tools: [react, tailwind, shadcn]
  scope: web artifacts

xlsx:
  description: Spreadsheets (.xlsx, .csv)
  tools: [openpyxl]
  scope: spreadsheets
```

### 23. DESIGN (1 skill)

```yaml
sirinx-site-design-system:
  description: Premium technical design system for SIRINX
  tools: [design_tokens]
  scope: design system
```

### 24. AUDIT-AND-SECURITY (1 skill)

```yaml
p100-phase3-execution:
  description: Phase 3 security and runtime verification
  tools: [security_tools]
  scope: security audit
```

### 25. RED-TEAMING (1 skill)

```yaml
godmode:
  description: Jailbreak LLMs: Parseltongue, GODMODE, ULTRAPLINIAN
  scope: red teaming
```

### 26. DATA-SCIENCE (1 skill)

```yaml
jupyter-live-kernel:
  description: Iterative Python via live Jupyter kernel
  tools: [jupyter, hamelnb]
  scope: jupyter
```

### 27. DIAGRAMMING (1 skill)

```yaml
json-canvas:
  description: Create/edit JSON Canvas files (.canvas)
  tools: [canvas_tools]
  scope: diagrams
```

### 28. DOGFOOD (1 skill)

```yaml
dogfood:
  description: Exploratory QA of web apps
  tools: [browser, qa_tools]
  scope: qa
```

### 29. DOMAIN (1 skill)

```yaml
domain:
  description: Domain workflows
  scope: domain
```

### 30. EMAIL (1 skill)

```yaml
himalaya:
  description: Himalaya CLI: IMAP/SMTP email from terminal
  tools: [himalaya_cli]
  scope: email
```

### 31. GAMING (3 skills)

```yaml
minecraft-modpack-server:
  description: Host modded Minecraft servers
  tools: [minecraft_tools]
  scope: minecraft

pokemon-player:
  description: Play Pokemon via headless emulator + RAM reads
  tools: [emulator]
  scope: pokemon

retro-handheld-legal-gaming:
  description: Legal-only game acquisition for retro handhelds
  scope: retro gaming
```

### 32. GIFS (1 skill)

```yaml
gif-search:
  description: Search/download GIFs from Tenor
  tools: [curl, jq]
  scope: gifs
```

### 33. HERMES-DESKTOP-PLUGINS (1 skill)

```yaml
hermes-desktop-plugins:
  description: Write desktop app plugins
  tools: [plugin_tools]
  scope: plugins
```

### 34. INFERENCE-SH (1 skill)

```yaml
inference-sh:
  description: Inference shell patterns
  scope: inference
```

### 35. PRODUCT (1 skill)

```yaml
product:
  description: Productivity workflows
  scope: productivity
```

### 36. SECURITY (1 skill)

```yaml
security:
  description: Security workflows
  scope: security
```

### 37. SMART-HOME (1 skill)

```yaml
openhue:
  description: Control Philips Hue lights via OpenHue CLI
  tools: [openhue_cli]
  scope: smart home
```

### 38. SOCIAL-MEDIA (1 skill)

```yaml
xurl:
  description: X/Twitter via xurl CLI
  tools: [xurl_cli]
  scope: twitter
```

---

## SKILL CROSS-REFERENCE

### By Tool Usage

**Git-Heavy Skills:**
- github-* (6 skills)
- vibe-coding-sidebar
- simplify-code
- executing-plans
- finishing-a-development-branch

**Delegate_Task-Heavy Skills:**
- autonomous-ai-agents (12 skills)
- ghostclaw-os (7 skills)
- dynamic-workflow
- subagent-driven-development

**Terminal-Heavy Skills:**
- development (33 skills)
- devops (12 skills)
- mlops (11 skills)
- ghostclaw-os (7 skills)

**File_Ops-Heavy Skills:**
- skill-authoring
- plan
- documentation

### By Trigger Pattern

**Pre-Work Mandatory:**
- brainstorming (creative work)
- test-driven-development (implementation)
- systematic-debugging (bugs)

**Post-Work Mandatory:**
- verification-before-completion (completion claim)
- receiving-code-review (review feedback)
- finishing-a-development-branch (branch completion)

**Plan-Driven:**
- writing-plans (create plan)
- executing-plans (execute plan)
- spec-driven-ai-coding (from spec)

---

## AGENT COMPATIBILITY MATRIX

```yaml
Claude:
  compatible:
    - autonomous-ai-agents
    - development
    - creative
    - research
    - superpowers

ChatGPT/Codex:
  compatible:
    - autonomous-ai-agents (codex, opencode)
    - development
    - github
    - devops

Hermes:
  compatible:
    - all categories
    - orchestration skills
    - automation

OpenCode:
  compatible:
    - autonomous-ai-agents (opencode)
    - development
    - frontend
    - backend
```

---

## USAGE RECOMMENDATIONS

### For Claude

**Load These Skills First:**
- brainstorming
- executing-plans
- systematic-debugging
- verification-before-completion
- writing-plans

**For Creative Work:**
- creative (18 skills)
- design
- frontend-design

**For Coding:**
- development (33 skills)
- software-development (20 skills)

### For ChatGPT/Codex

**Load These Skills First:**
- codex
- opencode
- github-pr-workflow
- requesting-code-review

**For Team Ops:**
- hermes-godmode-team-ops
- vibe-coding-sidebar
- ghostclaw-orchestration-patterns

### For Hermes

**Load These Skills First:**
- sirinx-unified-master
- goal-decomposer
- telegram-approval-workflow

**For Orchestration:**
- ghostclaw-master-orchestrator
- autonomous-loop-engineering
- sovereign-fleet-autoloop

### For OpenCode

**Load These Skills First:**
- opencode
- frontend-design
- github-code-review

**For Frontend:**
- creative (web artifacts)
- frontend-design
- popular-web-designs

---

## END OF MANIFEST

**Generated:** 2026-07-18
**Total Skills:** 248
**Categories:** 38
**Scope:** ALL AGENTS (Unified)

**Next Update:** When new skills added or modified

**Reference:**
- See individual SKILL.md files for full details
- Use `skill_view(name=<skill>)` to load specific skill
- Use `skills_list(category=<category>)` to filter
