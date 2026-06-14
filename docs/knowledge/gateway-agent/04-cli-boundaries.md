# Gateway Agent CLI Boundaries

Status: manual CLI representation only

## Codex

Allowed in this phase:

- Local file edits inside the approved task scope.
- Local tests and checks.
- Local API dry-run calls.

Blocked in this phase:

- Git push or PR creation.
- Deploy or publish.
- Secret value reads or prints.
- External connector writes.

## Hermes TUI

Hermes TUI is a manual operator surface. Gateway Agent may report its readiness, but must not invoke `hermes --tui` or start Hermes gateways automatically.

## Ollama Launch Commands

Ollama app launch commands are inventory records only. Gateway Agent may display `ollama launch ...` commands and dry-run a manual smoke plan, but must not execute those commands through API routes, dashboard controls, scripts, MCP, or connectors.

## Gemini CLI

Gemini CLI is a manual review lane. Gateway Agent may assign review intent to Gemini, but must not run `gemini` automatically.

## A2A2LoopSync

A2A2LoopSync produces local evidence packets and next steps only. It does not send messages, run connectors, or mutate external systems.
