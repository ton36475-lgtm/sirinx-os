# Intake Stages and Stop Conditions

This reference distills the repository intake portion of
`docs/reverse_engineering/GHOSTCLAW_REVERSE_ENGINEERING_BUILD_PACKET.md`.

## Stage Model

| Stage | Allowed evidence/work | Exit evidence | Never implied |
|---|---|---|---|
| `S0_DISCOVERED` | URL/name, owner claim, intended use | Stable source identifier | Network access |
| `S1_METADATA_REVIEWED` | Public/owner-provided metadata, tree, SBOM, license, release evidence | Provenance and risk matrix | Clone |
| `S2_QUARANTINED_CONTENT` | Exact-revision static files in isolated path | Hash/revision and static inventory | Checkout scripts, hooks, LFS, submodules |
| `S3_PROMOTION_CANDIDATE` | Completed policy/license/supply-chain review | Signed review receipt and requested destination | Promotion, install, build, import, enable |
| `S4_PROMOTED_SOURCE` | Separate exact promotion gate and receipt | Source copied to approved destination | Install or execution |

## Static Risk Inventory

Inspect or account for:

- license and notices;
- exact revision, release/tag relationship, and content digest;
- package lifecycle scripts and native extensions;
- shell/PowerShell/Python/Node executables and executable bits;
- git hooks, symlinks, hardlink assumptions, gitlinks, and submodules;
- CI workflows, release automation, container files, and IaC;
- generated binaries, archives, vendored dependencies, and LFS pointers;
- network/download-on-build behavior;
- nested instruction files (`README`, `AGENTS.md`, `SKILL.md`, prompts);
- dependency lockfiles, SBOM, advisories, and maintainer continuity.

## Stop Conditions

Stop and return `REJECTED` or `QUARANTINED` when:

- access rights or source identity cannot be established;
- the source requests secret material, credential entry, auth bypass, or policy override;
- license/notice obligations conflict with intended use;
- immutable revision or integrity evidence is unavailable for promotion;
- static inspection requires executing unknown code;
- the destination overlaps a first-party dirty worktree;
- a requested action lacks its own exact task-specific gate.

## Exact Gate Shape

A usable external-action gate identifies all of:

`task_id`, `action`, `target`, `scope`, `exact_operation`, `approved_by`,
`approved_at`, and `expires_at`.

The gate covers one action. `repo_clone` does not cover `install`; `install`
does not cover `provider_call`; none covers `push` or `deploy`.
