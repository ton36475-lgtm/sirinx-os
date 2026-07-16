# OpenCode and Skills Runtime Recovery

Date: 2026-07-15
Mode: local-only validation

## Incident

OpenCode rejected six global Hermes agent definitions because `tools` used a
comma-separated string and `color` used unsupported color names. A second
Skills API launch also ignored `SKILLS_WS_PORT=8888`, fell back to port `3800`,
and collided with the existing runtime in the user's original launch context.

## Resolution

- Converted each Hermes `tools` value to the supported boolean object while
  preserving its original allowlist.
- Mapped UI colors to OpenCode theme tokens: `success`, `warning`, `error`,
  `accent`, and `info`.
- Kept `SKILLS_API_PORT` as the canonical combined REST/WebSocket listener
  setting and added `SKILLS_WS_PORT` as a compatibility alias.
- Defaulted new zero-dependency listeners to `127.0.0.1` and added a concise
  listener error instead of an unhandled Node stack trace.
- Added a Node standard-library regression test for the compatibility alias.

## Evidence

- `opencode debug config`: pass; 29 agents resolved.
- `opencode agent list`: all six `hermes-*` agents present.
- `node --check`: server and regression test pass.
- `node --test services/skills-api/src/server-zero-dep.test.mjs`: 1/1 pass.
- Local smoke at `http://127.0.0.1:8888/health`: `status=ok`,
  `service=ghostclaw-skills-api`, `dry_run=true`.
- Port `8888` test process was stopped after validation.
- Existing port `3800` runtime remained running and healthy.

Changed global config scope:

```text
/Users/sirinx/.config/opencode/agents/hermes-backend-integrator.md
/Users/sirinx/.config/opencode/agents/hermes-browser-automator.md
/Users/sirinx/.config/opencode/agents/hermes-code-reviewer.md
/Users/sirinx/.config/opencode/agents/hermes-devops-runner.md
/Users/sirinx/.config/opencode/agents/hermes-frontend-builder.md
/Users/sirinx/.config/opencode/agents/hermes-project-planner.md
```

Repo artifacts:

```text
services/skills-api/src/server-zero-dep.mjs
  sha256 084a1f0f750c0422c56f1adf25cbf9fd3ac4b2b5e2dc1ef80fb17aef49f41a29
services/skills-api/src/server-zero-dep.test.mjs
  sha256 3655eac4ab75b5e8ca7061a4c31d8b19dc4acd44af7e464282290cbcfc5e795c
```

No provider call, Telegram send, secret read, package install, deploy, push,
stage, or commit was performed.

## Operator Commands

Use the canonical setting for a second combined REST/WebSocket runtime:

```bash
SKILLS_API_PORT=8888 node services/skills-api/src/server-zero-dep.mjs
```

The previous command now remains compatible:

```bash
SKILLS_WS_PORT=8888 node services/skills-api/src/server-zero-dep.mjs
```

Do not start another default instance while the healthy port `3800` runtime is
already active.
