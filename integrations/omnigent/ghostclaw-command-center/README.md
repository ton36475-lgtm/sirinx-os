# GhostClaw Omnigent Command Center

This bundle integrates Omnigent with the existing local agentic coding team
without adopting the bundled Polly write/push defaults.

## Roles

- Hermes Command Center: plans, sequences, dispatches, and reports.
- Claude Architect: read-only architecture and design contract.
- Codex Builder: the only repository writer for an explicit path scope.
- OpenCode Reviewer: independent read-only diff and test review.
- Hermes Validator: read-only policy, receipt, and completion validation.
- Antigravity: attended observer only; it is not registered as a headless
  worker because unattended Antigravity can bypass interactive approvals.

## Local Operations

From the repository root:

~~~text
scripts/omnigent-ghostclaw-command-center validate
scripts/omnigent-ghostclaw-command-center status
scripts/omnigent-ghostclaw-command-center server-start
~~~

Starting an AI session is separately gated because it calls configured model
providers:

~~~text
APPROVE_OMNIGENT_GHOSTCLAW_PROVIDER_SESSION=1 \
  scripts/omnigent-ghostclaw-command-center run
~~~

An attended Antigravity observer uses its own gate:

~~~text
APPROVE_OMNIGENT_ANTIGRAVITY_SESSION=1 \
  scripts/omnigent-ghostclaw-command-center antigravity
~~~

## Boundaries

The bundle never stores provider keys. Configure credentials through the
provider CLI or Omnigent setup after rotating any key previously exposed in a
chat or log. A local server is a loopback control plane, not approval to call
providers, push, deploy, publish, or mutate cloud systems.
