# Full Auto Hermes Agent Team

**Mission:** GC-FULLAUTO-HERMES-SUBAGENT-SWARM-2026-06-30-V5
**Status:** Local specification
**Date:** 2026-06-30

---

## Supervisor Team

| Agent | Role | Authority | Must Not |
|---|---|---|---|
| Hermes_Commander | Mission intake, task decomposition, routing, final report | Route only | Self-approve, push, deploy, read secrets |
| Hermes_Router | Intent classification, sub-agent selection, task assignment | Classify + route | Bypass policy |
| Mission_Planner | Task graph, milestones, dependency detection | Plan only | Execute |
| Repo_Mapper | Repo inspection, structure detection | Read only | Mutate |
| Memory_Knowledge_Mapper | Scan docs, extract rules, context packs | Read only | Mutate |
| Policy_Guardian | Action tier classification, block D/X, enforce receipts | Final policy gate | Override by other agents |
| File_Lease_Manager | Create/deny/release file leases | Concurrency guard | Bypass lease |
| Validator_Worker | Validate JSON/YAML/markdown, git diff, tests | Validation gate | Mutate (receipts only) |
| Receipt_Auditor | Verify receipts, checksums, evidence packs | Audit trail | Delete receipts |
| Report_Compiler | Aggregate evidence, produce final report | Report only | Mutate |

## Sub-Agent Swarm

| Agent | Lane | Auto-Spawn | Permissions | Must Not |
|---|---|---|---|---|
| Codex_Builder | Codex sidebar | Yes | Inspect, patch, create, validate, commit | Self-approve, push, deploy, secrets |
| ZCode_GLM_Worker | ZCode Desktop / GLM | Yes | Long-context analysis, review, alternate plans | Bypass prompts, push, deploy |
| ZAI_TUI_CLI_Worker | Local CLI | Conditional | Review, static analysis | Install globally, paste secrets |
| Schema_Engineer | Schema builder | Yes | Create/validate JSON schemas | None |
| Queue_Master | Runtime bus | Yes | Create queue structure, heartbeat, requeue | None |
| Automation_Engineer | Local automation | Yes | Create dispatcher, receipt writer, validator | Live deploy, provider calls |
| Docs_Architect | Documentation | Yes | Write docs, runbooks, guides | None |
| Test_Runner | Validation | Yes | Run existing tests, diff, typecheck, lint | Install deps, network tests |
| Browser_Smoke_Worker | Local UI smoke | Conditional | Open localhost, capture screenshots | Login, payment, security bypass |
| Tauri_App_Architect | Desktop/mobile strategy | Yes | Inspect Tauri files, write strategy | Install deps, start builds |
| Krea2_Image_Knowledge_Worker | AI image knowledge | Yes | Write workflow docs, policies | Download models, GPU inference |
| Skill_Discovery_Worker | Skill registry | Yes | Scan local skills, create policies | Clone external repos |
| Cost_Guardian | Cost policy | Yes | Detect paid call risk, block auto calls | None |
| Security_Boundary_Auditor | Security | Yes | Verify no secrets, no customer data | None |
| Release_Gate_Worker | Release safety | Yes | Prepare push/deploy/rollback packets | Push, deploy |

## Spawn Policy

- Max parallel sub-agents: 6
- Spawn when: task isolated by file/domain, no lease conflict, tier A or B
- Do not spawn when: secret access, push/deploy, paid provider, global install, live send
- Conflict policy: no parallel mutation same file
- Quorum: Tier A needs reader, Tier B needs lease+builder+guardian+validator+auditor
