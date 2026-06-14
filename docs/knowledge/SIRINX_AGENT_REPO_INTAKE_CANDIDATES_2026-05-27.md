# SIRINX Agent Repo Intake Candidates - 2026-05-27

Status: READ-ONLY INTAKE COMPLETE

Stop point: REPO CANDIDATES REVIEWED - NO CLONE, NO INSTALL, NO EXECUTION

## Scope

User supplied these candidates:

- `simular-ai/Agent-S`
- `supercog-ai/agentic`
- `langgenius/dify`
- `curl -fsSL https://antigravity.google/cli/install.sh | bash`

This note records metadata and a safe integration decision. No repository was cloned. No package was installed. No postinstall script ran. No MCP server was started. No secrets were read. No paid API was called.

## Intake Gate Result

All three GitHub repositories passed URL parsing for read-only review only:

| Candidate | Repo Intake Status | Clone | Install | Execute |
| --- | --- | --- | --- | --- |
| Agent-S | `dry-run-repo-intake-review-ready` | blocked | blocked | blocked |
| supercog agentic | `dry-run-repo-intake-review-ready` | blocked | blocked | blocked |
| Dify | `dry-run-repo-intake-review-ready` | blocked | blocked | blocked |

The Antigravity installer is not a repo URL. It is a remote shell installer and must remain blocked until a separate install approval exists.

## Candidate Matrix

### simular-ai/Agent-S

Source: https://github.com/simular-ai/Agent-S

Observed metadata:

- Description: open agentic framework that uses computers like a human
- Primary language: Python
- Stars observed: 11649
- Forks observed: 1376
- Topics include computer automation, GUI agents, RAG, memory, computer-use
- License from GitHub metadata: null

Recommended SIRINX lane:

- `computer-use-research-candidate`
- `mobile-desktop-agent-watch`
- `sandbox-only-gui-agent-evaluation`

Blocked until approval:

- GUI control
- desktop automation
- dependency installation
- model/provider connection
- reading local app state beyond explicit screenshots or test fixtures

### supercog-ai/agentic

Source: https://github.com/supercog-ai/agentic

Observed metadata:

- Description: opinionated framework for building sophisticated AI Agents
- Primary language: Python
- Stars observed: 128
- Forks observed: 37
- License from GitHub metadata: MIT

Recommended SIRINX lane:

- `agent-framework-review-candidate`
- `python-agent-patterns`
- `local-sandbox-prototype-only`

Blocked until approval:

- dependency installation
- tool/plugin activation
- external connector wiring
- executing sample agents

### langgenius/dify

Source: https://github.com/langgenius/dify

Observed metadata:

- Description: production-ready platform for agentic workflow development
- Primary language: TypeScript
- Stars observed: 142844
- Forks observed: 22472
- Topics include workflow, RAG, automation, low-code, MCP, Next.js
- License from GitHub metadata: null

Recommended SIRINX lane:

- `enterprise-workflow-platform-reference`
- `rag-workflow-ux-reference`
- `self-host-review-only`

Blocked until approval:

- Docker compose startup
- database startup
- worker startup
- MCP activation
- workflow connector activation
- public exposure

### Antigravity CLI Installer

Source: https://antigravity.google/cli/install.sh

Read-only installer review:

- Shell script detects OS and architecture
- Manifest base URL: `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app`
- Default target directory: `$HOME/.local/bin`
- Default binary path: `$HOME/.local/bin/agy`
- Downloads release payload from manifest URL
- Verifies SHA512 before install
- Copies binary to target directory
- Runs `chmod +x`
- On macOS, removes quarantine attribute
- Runs `agy install`

Observed manifest:

- Platform: macOS local platform
- Version: `1.0.2`
- Payload host: `storage.googleapis.com`
- Manifest includes URL and SHA512

Verdict:

`curl | bash` is blocked. It performs install and executable handoff. Use a separate approval packet if installation is still desired.

## Enterprise Selection

Recommended order for SIRINX:

1. Dify as enterprise workflow and RAG product reference
2. Agent-S as GUI/computer-use research candidate
3. supercog agentic as lightweight Python framework pattern candidate
4. Antigravity CLI as manual watch lane after install approval

## Next Safe Actions

1. Create a sandbox clone approval packet for exactly one candidate repo.
2. Review license, manifests, postinstall/prepare scripts, Docker files, and network behavior.
3. Run secret scan against downloaded source before dependency installation.
4. Require separate approval for install, postinstall, MCP startup, provider setup, and external connector activation.

## Blocked Actions

- clone repo
- install packages
- run postinstall
- execute repo code
- start MCP server
- read or print secrets
- send messages
- deploy
- push
- publish
- activate external connectors
- call paid APIs

---

## 2026-05-27 Mac Mini Skill + High-Star Agent Repo Expansion

Status: READ-ONLY LOCAL INVENTORY + PUBLIC METADATA REVIEW

Stop point: MAC MINI AGENT REPO QUEUE READY - NO INSTALL, NO CLONE, NO EXECUTION

### Local Skill Surface

Observed local skill definitions:

- `/Users/sirinx/.codex/skills`: 57 skill definitions
- `/Users/sirinx/.agents/skills`: 9 skill definitions

Active SIRINX/Hermes guardrail skills:

- `sirinx-spec-first-swarm`
- `agent-team-orchestration`
- `start-run-debug`
- `website-browser-automation`
- `hermes-project-planning`

Applicable rule:

- Use `sirinx-spec-first-swarm` before any source-code implementation, package install, MCP start, provider call, message send, deploy, push, publish, connector activation, or automatic agent launch.

### Local Repo Surface

Read-only repo scan found these relevant local roots:

- `/Users/sirinx/sirinx-os`
- `/Users/sirinx/sirinx-sovereign-swarm`
- `/Users/sirinx/OZ-CORP-MONOREPO`
- `/Users/sirinx/OZ-CORP-MONOREPO/external/openclaw-continuity`
- `/Users/sirinx/OZ-CORP/services/openclaw-worker`
- `/Users/sirinx/.hermes/hermes-agent`
- `/Users/sirinx/.hermes/hermes-office`
- `/Users/sirinx/thClaws`
- `/Users/sirinx/Documents/Codex/2026-05-09/vibeallcoding-in-this-mac-to-1`
- `/Users/sirinx/restore-sources/github-audit/*`

`/Users/sirinx/sirinx-os` current branch observed: `codex/urgent-backlog-execution`.

The worktree is dirty and contains many local-only SIRINX/Hermes feature files. Do not run broad refactors, resets, checkout commands, or automated formatting until the pending work ledger is reviewed.

### High-Star Agent Repo Queue

Public GitHub metadata was fetched read-only. No repo was cloned or installed.

| Candidate | Stars observed | Language | License metadata | SIRINX lane | Intake decision |
| --- | ---: | --- | --- | --- | --- |
| `langgenius/dify` | 142884 | TypeScript | NOASSERTION | enterprise workflow/RAG platform reference | review only |
| `google-gemini/gemini-cli` | 104655 | TypeScript | Apache-2.0 | Antigravity/Gemini CLI comparison lane | review only |
| `browser-use/browser-use` | 95851 | Python | MIT | browser automation research lane | review only |
| `OpenHands/OpenHands` | 75047 | Python | NOASSERTION | coding-agent architecture reference | review only |
| `cline/cline` | 62408 | TypeScript | Apache-2.0 | IDE/CLI coding-agent reference | review only |
| `microsoft/autogen` | 58458 | Python | CC-BY-4.0 | multi-agent framework reference | review only |
| `crewAIInc/crewAI` | 52302 | Python | MIT | role-agent orchestration pattern reference | review only |
| `continuedev/continue` | 33423 | TypeScript | Apache-2.0 | source-controlled AI checks / CLI reference | review only |
| `simular-ai/Agent-S` | 11654 | Python | Apache-2.0 | computer-use GUI agent research | review only |
| `supercog-ai/agentic` | 128 | Python | MIT | lightweight Python agent framework pattern | review only |

### Recommended Install Order After Separate Approval

1. `simular-ai/Agent-S`: highest relevance to computer-use agent research; keep sandbox-only.
2. `browser-use/browser-use`: useful for browser automation patterns; block cloud/profile sync paths by default.
3. `google-gemini/gemini-cli`: compare against Antigravity CLI behavior and permission model; do not use OAuth callback URLs as evidence.
4. `continuedev/continue`: inspect source-controlled AI check patterns for SIRINX repo quality gates.
5. `Dify`: use as product/workflow reference first; self-hosting is heavy and should not be first install.

### Required Approval Packet Before Any Install

For each selected repo, require:

- `metadata_review_approval`
- `license_security_review_approval`
- `sandbox_clone_approval`
- `dependency_install_approval`
- `postinstall_execution_approval`

Default blocked actions remain:

- no `git clone`
- no `npm install`, `pnpm install`, `pip install`, `uv sync`, `cargo install`, or `brew install`
- no lifecycle script execution
- no app launch
- no MCP start
- no provider/API key setup
- no OAuth flow
- no connector activation
- no message sending
- no deploy, push, publish, or upload
