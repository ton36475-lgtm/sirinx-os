# Gateway Agent Runtime Contract

Status: local-only

## Runtime Lanes

| Runtime | Gateway status | Role | Auto execution |
| --- | --- | --- | --- |
| Codex | `active-local` | Local file and test runner | No |
| Hermes TUI | `blocked-context-too-small` or `manual-ready` | Interactive CLI review and routing | No |
| Gemini CLI | `manual-review-runtime` | Secondary review and synthesis | No |
| A2A2LoopSync | `local-sync-contract` | Evidence, provenance, and next-step loop | No |

## Hermes Context Rule

Hermes TUI is marked `blocked-context-too-small` when the observed context window is below `64000`. The current local contract defaults to `8192`, matching the screenshot blocker, so Gateway Agent must not route real work through Hermes Agent until a larger-context model is selected and reviewed.

## Gemini Rule

Gemini CLI is represented as a manual review lane. Gateway Agent may include it in a plan, but must not invoke the CLI automatically.

## Codex Rule

Codex remains the local execution host for scoped file edits and verification commands. Gateway Agent still does not give Codex permission to deploy, push, publish, activate connectors, run real MCP, read secrets, send messages, call paid APIs, or write production databases.
