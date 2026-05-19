# SIRINX Agent Runtime Extraction Plan

Date: 2026-05-20
Source repo: `/Users/sirinx/restore-sources/github-audit/oz-corp-omega-dual-node`
Target system: `/Users/sirinx/sirinx-os`
Mode: quarantine reference, bounded extraction only
External writes: none
Secrets read or printed: none

## Goal

Extract the useful Hermes/OpenClaw/agent-runtime ideas from `oz-corp-omega-dual-node` without importing the large experimental repo into SIRINX OS.

This repo has useful concepts for safe commands, agent continuity memory, SIRINX app dashboards, ESS monitor, embedded skills, and agent orchestration. It is not safe as a bulk import because it is large, contains duplicated app structures, nested skill bundles, many runtime assumptions, and likely mixed experimental artifacts.

## Reviewed Source Files

| Source | Finding | Extraction decision |
| --- | --- | --- |
| `services/hermes-agent/src/tools/safe-command-tool.ts` | Defines an allowlisted command runner for `git_status`, `ozwarp_audit`, `ollama_list`, and `repo_tree`. | Use as policy reference for safe command categories. |
| `services/hermes-agent/src/index.ts` | Boots Hermes local agent, tracks continuity, checks Ollama, and asks a local model. | Do not import runtime; local LLM availability must be doctor-checked first. |
| `services/hermes-agent/src/memory/continuity.ts` | Continuity tracking pattern exists. | Candidate for Obsidian/Hermes memory policy mapping. |
| `services/openclaw-worker/src/memory/continuity-manager.ts` | Worker continuity concepts exist. | Candidate reference only; no worker execution. |
| `apps/sirinx-app/src/app/command-center/page.tsx` | Contains separate command-center UI ideas. | Reference for future UI lanes only. |
| `apps/sirinx-app/src/app/ess-monitor/page.tsx` | Contains ESS monitoring concept. | Candidate for Solis/ESS telemetry planning after credentials/consent. |
| `apps/sirinx-app/src/agents/**/skills/**/SKILL.md` | Many embedded agent skills exist. | Do not import bundles until scope, licensing, and path ownership are reviewed. |

## Safe Command Policy Extraction

| Category | Source command | SIRINX decision |
| --- | --- | --- |
| Git inspection | `git status --short` | Allowed as read-only local check. |
| Runtime audit | `ozwarp audit status` | Reference only; command unavailable unless tool is installed and approved. |
| Local LLM inventory | `ollama list` | Allowed only as local doctor check; no model install. |
| Repo tree | `find . -maxdepth 2 -type d` | Allowed for inventory if secrets and node_modules are excluded. |

SIRINX OS should keep the allowlist concept, not the exact implementation, because current tooling already uses local scripts and external-gate checks.

## Agent Memory Extraction

Candidate memory fields:

| Field | Use |
| --- | --- |
| `type` | Classify event such as `watchful_state`, `decision`, `blocker`, `verification`. |
| `context_before` | What state existed before the event. |
| `event_core` | The event or command result. |
| `immediate_result` | What changed locally. |
| `followup_focus` | The next specific task. |

Mapping target:

- Obsidian digest summaries
- Command Center backlog updates
- Hermes 12-profile operating rules
- External-gate evidence records

Do not store raw chat logs, secrets, or hidden chain-of-thought as memory.

## Implementation Sequence

1. Keep `oz-corp-omega-dual-node` read-only.
2. Extract safe-command categories into documentation first.
3. Compare categories with current SIRINX external-gate scripts:
   - `external-gates:check`
   - `external-gates:evidence-check`
   - `dashboard:e2e`
   - `verify`
4. Add a SIRINX safe-command policy module only if a runtime caller needs it.
5. Extract memory continuity as a schema proposal, not a runtime store.
6. Do not import embedded skill bundles until each target role has a file ownership boundary.

## Acceptance Gates

| Gate | Required evidence |
| --- | --- |
| Quarantine | No bulk copy from `oz-corp-omega-dual-node`. |
| Runtime safety | No command runner can execute arbitrary shell. |
| LLM safety | No install or paid API use during extraction. |
| Memory safety | No raw chat logs, secrets, or private credentials stored. |
| Messaging safety | LINE/Telegram code remains blocked until token/recipient evidence exists. |
| Solis safety | ESS/Solis monitor ideas stay planning-only until consent and credentials exist. |

## Next Local Task

Create a SIRINX safe-command and memory-policy proposal under docs, then map it to Command Center agent-team responsibilities before writing runtime code.
