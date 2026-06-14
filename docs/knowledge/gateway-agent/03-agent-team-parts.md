# Gateway Agent Team Parts

Status: local-only part split

| Owner | Responsibility | Runtime lane | Stop rule |
| --- | --- | --- | --- |
| `shogun` | Final approval routing and stop point | Codex | No external execution |
| `planner` | Goal to PRD to issues to tasks | Codex | No hidden backlog |
| `backend` | Gateway API and contract tests | Codex | Local API only |
| `scribe` | Knowledge split and provenance docs | A2A2LoopSync | No raw chat logs or secrets |
| `qa` | Verification matrix and regression checks | Codex | Evidence before claims |
| `devops` | CLI readiness only | Hermes TUI | No per-profile gateway start |
| `security` | Blocked actions and secret boundary | A2A2LoopSync | Reject risky packets |

## Existing Team Reuse

Gateway Agent reuses the existing 12 active Hermes profiles and 47-role roster through `services/dev-control-api/src/agent-team.mjs`. This phase does not start per-profile gateways.
