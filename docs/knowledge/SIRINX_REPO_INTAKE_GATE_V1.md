# SIRINX Repo Intake Gate v1

Status: local-only review gate

## Purpose

Repo Intake Gate is the safety boundary before adding third-party GitHub repos, skills, plugins, CLIs, MCP servers, or agent packages into SIRINXDev.

It reviews intent and repository identity only. It does not clone, install, run postinstall, execute code, read secrets, activate connectors, send messages, deploy, push, or publish.

## Local API

```text
GET  /api/repo-intake-gate
POST /api/repo-intake-gate/review/dry-run
```

## Dry-Run Input

```json
{
  "requestId": "repo-intake-9armskill",
  "repoUrl": "https://github.com/example/9armskill",
  "purpose": "review enterprise skill repo before install"
}
```

## Dry-Run Output Contract

The route returns JSON only:

- `commandExecuted: false`
- `externalNetworkCall: false`
- `canCloneRepo: false`
- `canInstallPackages: false`
- `canRunPostinstall: false`
- `canExecuteCode: false`
- `canReadSecrets: false`
- `requiresHumanApproval: true`

## Review Checklist

- `repo_url_required`
- `license_check`
- `readme_scope_check`
- `package_manifest_check`
- `postinstall_script_check`
- `secret_scan_plan`
- `network_side_effect_review`
- `external_execution_block`
- `human_install_approval_required`

## Blocked Actions

- clone repo from API
- install packages
- run postinstall, prepare, or lifecycle scripts
- execute repo code
- start MCP servers
- read or print secrets
- send messages
- deploy, push, publish, upload, or release
- activate external connectors
- call paid APIs

## Manual Approval Phases

```text
metadata_review_approval
license_security_review_approval
sandbox_clone_approval
dependency_install_approval
postinstall_execution_approval
```

Each phase must be approved separately. A read-only metadata review does not imply install approval.

## Verification

```bash
pnpm repo-intake-gate:test
pnpm verify:workspace
pnpm audit:secrets
pnpm check
git diff --check
```

## Stop Point

```text
REPO INTAKE GATE READY - LOCAL ONLY - WAITING FOR REPO URL AND INSTALL APPROVAL
```
