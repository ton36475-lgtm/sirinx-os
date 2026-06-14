# Repo Intake Gate

Status: local-only third-party repository review gate

## Purpose

Repo Intake Gate protects SIRINXDev before any outside repo, skill, package, or agent tool is installed. It produces a deterministic review packet and blocks execution paths.

## Local API

```text
GET /api/repo-intake-gate
POST /api/repo-intake-gate/review/dry-run
```

## Safe Flow

```text
repo URL
-> dry-run review packet
-> license / manifest / script / secret-scan checklist
-> human approval
-> optional sandbox clone approval
-> optional dependency install approval
-> optional postinstall approval
```

## Guardrails

- No clone.
- No install.
- No postinstall.
- No code execution.
- No secret read.
- No MCP start.
- No message send.
- No deploy, push, publish, upload, or release.
- No external connector activation.

## Example

```bash
curl -X POST http://127.0.0.1:8711/api/repo-intake-gate/review/dry-run \
  -H "Content-Type: application/json" \
  -d '{"requestId":"repo-intake-9armskill","repoUrl":"https://github.com/example/9armskill","purpose":"review enterprise skill repo before install"}'
```

## Verification

```bash
pnpm repo-intake-gate:test
pnpm audit:secrets
pnpm check
```

## Stop Point

```text
REPO INTAKE GATE READY - LOCAL ONLY - WAITING FOR REPO URL AND INSTALL APPROVAL
```
