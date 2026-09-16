# Source Reliability Table - P000A Repo Intake Readonly

Mission: `GC-SF-RE-OS-V1-20260701-001`

| Source | Claim Type | Reliability | Evidence | Handling |
|---|---|---:|---|---|
| `README.md` | local project scope and safety rules | High | Read from current worktree | Use as current repo baseline |
| `package.json` | scripts, package manager, workspaces | High | Parsed current JSON | Use for detected stack and validation planning |
| `pnpm-workspace.yaml` | workspace boundaries | High | Read from current worktree | Use for repo structure summary |
| `openspec/README.md` | existing OpenSpec pattern | High | Read from current worktree | Use for change layout |
| `_SECOND_BRAIN/.../GC_SF_RE_OS_V1_LOCKED.md` | prior selected plan | Medium | Local note existed but had stale loop and Agency count | Refresh with operator's final lock |
| Operator 2026-07-01 plan text | final plan selection and gates | Medium-High | Direct operator instruction in current session | Treat as canonical plan intent |
| External repo descriptions for OpenSpec, 9Router, Agency, Logto, n8n, video-use, Stagehand, OpenClaw | third-party capability claims | Medium | Operator-provided summary only in this packet | Do not import or run; verify current upstream source before use |
| Agency count `232 agents / 16 divisions` | drift-prone external count | Medium | Operator says latest repo shows this | Mark dynamic; verify before import |
| Hermes-agent Android setup status | UI/device state | Low-Medium | Operator-described image/result, not locally verified here | Companion-node role only until live evidence exists |

## Reliability Rule

Local worktree files are authoritative for current repo state. Operator-provided
plan text is authoritative for intent. External repo/tool claims are planning
inputs only until verified from current upstream or local quarantine evidence.
