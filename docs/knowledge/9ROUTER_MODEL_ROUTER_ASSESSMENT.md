# 9router Model Router Assessment

Tool: `decolua/9router`
Lane: `MODEL_ROUTER_GATEWAY`
Default Gate: `YELLOW`, escalates to `RED` when credentials or paid providers
are involved.

## Capability Snapshot

Operator-provided source summary describes 9router as an AI router and token
saver for coding tools such as Claude Code, Cursor, Antigravity, Copilot,
Codex, Gemini, OpenCode, Cline, and OpenClaw, with routing across many providers
and models.

Fresh primary-source verification was not executed in this packet. Before
runtime adoption, re-check the upstream README and license directly.

## GhostClaw Fit

Useful for:

- provider abstraction research
- OpenAI-compatible routing policy design
- model fallback design
- token and cost monitoring design

Blocked for now:

- provider key storage
- paid model calls
- public endpoint exposure
- multi-account rotation
- customer data routing

## Required Controls Before Runtime Use

- env-only credentials
- no secret logging
- provider allowlist
- model allowlist
- cost ceiling
- provider terms review
- local bind only by default
- receipt per config change
- human gate for paid provider calls
