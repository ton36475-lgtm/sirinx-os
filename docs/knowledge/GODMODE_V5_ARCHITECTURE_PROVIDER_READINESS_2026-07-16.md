# GODMODE V5 Architecture Provider Readiness

## Verdict

`READY_FOR_EXACT_GATE_NOT_EXECUTED`

The Claude architecture lane now has a local, packet-bound control surface. No
Claude/provider call, secret read, repo output promotion, Telegram send, Git action,
Cloudflare mutation, push, or deploy occurred in this readiness run.

## Bound Target

- Request: `GODMODE-V5-ARCH-20260715-001`
- Command: `godmode_v5_claude_architecture_read_only`
- Route/model: `claude-code/first-party` / `opus`
- Tool allowlist: `Glob,Grep,Read`
- Permission mode: `plan`
- CLI session ceiling: `1`
- Model turn ceiling: `6`
- Budget ceiling: `USD 2.00`
- Post-call output character cap: `32,768`
- Provider-side token ceiling: not asserted by this wrapper
- Automatic retries: disabled
- Output: runtime evidence only

The target digest binds the task/correlation IDs, request/state/prompt digests,
Claude executable digest, working directory, output path, route, mode, tool set,
turn and budget ceilings, post-call output cap, and one-session limit. The exact
gate literal is pinned in production code rather than accepted from request input.

## Control Flow

1. Grant dry-run builds the canonical target without reading a signing key.
2. A stored grant requires the exact gate through stdin and a local approval signing
   key; the raw gate and key are never stored or printed.
3. The runner atomically claims the short-lived signed receipt before execution.
4. The runner invokes the pinned Claude executable once with safe mode, plan
   permission, strict MCP isolation, no browser, no persistent session, bounded turns,
   and bounded cost.
5. Child stdout/stderr are not echoed. Digests and validation results are written
   through descriptor-pinned, no-follow storage under the fixed runtime result root.
6. Invalid output is rejected without retry. Valid output remains `READY_FOR_REVIEW`
   and is not promoted into the repository automatically.

The receipt reports CLI invocation attempted, process started, CLI session count,
and provider/API visibility separately. It never infers an internal provider call
count from a successful process spawn.

The CLI restrictions follow Anthropic's documented `--tools`,
`--permission-mode plan`, `--strict-mcp-config`, `--no-session-persistence`,
`--max-turns`, and `--max-budget-usd` controls:
<https://code.claude.com/docs/en/cli-usage>

## Evidence

- Plan receipt:
  `.ghostclaw_runtime/a2a2a/evidence/godmode-v5-provider-results/GODMODE-V5-ARCH-20260715-001.6f45860225ad.6bece9bf691a.plan.json`
- Plan receipt SHA-256:
  `aab96e4ebe8f8cb3ab86d9a4035fcba138f09ec43385b704be2c8c70e2a18897`
- Target digest:
  `6f45860225ad8f52be3453e5a50b385906a81d61ca21482142fc1f9f2bc5c845`
- Focused tests: `18/18` passed.
- Full `@sirinx/dev-control-api` validation: `303/303` passed
  (`290` Vitest + `13` native Node tests).
- Descriptor-pinned storage tests: `6/6` passed, including symlink-root rejection,
  parent-directory replacement-race protection, and cleanup after an injected
  post-create write failure.
- Package verify: passed.
- Scoped whitespace validation: passed.
- Fail-closed CLI probes: missing signing key and missing exact-gate stdin both
  stopped before provider execution. A non-empty but too-short signing key is
  reported as read without being reported as bound to an approval.
- Independent reviewer verdict: `VERIFIED` for the current working-tree snapshot.
  The reviewed source now matches commit `71e77a0`; this readiness-document update
  remains unstaged.

## Exact Next Gate

The provider call remains closed until the operator supplies exactly:

`APPROVE_CLAUDE_CODE_PROVIDER_CALL_GODMODE_V5_ARCH_20260715_001`

That gate authorizes one short-lived approval receipt and one bounded Claude CLI
session only. It does not authorize architecture-packet promotion, Hermes acceptance,
implementation, Telegram send, Git stage/commit/push, Cloudflare mutation, or deploy.

Cloudflare OAuth retry remains a separate lane and requires:

`APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_CF-R4-PREREQUISITES-20260716-002`
