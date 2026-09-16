# SIRINX GhostClaw v3.3 Artifact Gate Validator

Status: `GHOSTCLAW_V3_3_ARTIFACT_GATE_VALIDATOR_LOCAL_ONLY`
Date: `2026-06-29`
Boundary: `metadata-only zip inventory`

This validator does not merge the artifact.

```text
claims_artifact_present=false
artifact_gate_passed=false
merge_script_execution=false
feature_branch_creation=false
deploy=false
push=false
cloud_mutation=false
customer_send=false
secret_read=false
paid_provider_call=false
install=false
migration=false
```

## Expected Artifact

```text
/Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip
```

The validator requires the exact basename:

```text
ghostclaw_repo_merge_kit_v3_3.zip
```

## Required Archive Entry Kinds

- `routers.ts`
- `agentic.ts`
- `llmAnalysis.ts`
- `schema.ts`
- `db.ts`
- tests under `tests/*.test.mjs`
- CI or workflow files
- staging manifest JSON
- receipt JSON

## Required Policy Evidence

The validator also requires a local policy-test evidence file with:

```text
pass>=1
fail=0
```

The supplied review said the bundle previously had `pass: 11` and `fail: 0`.
That remains a review claim until the exact local artifact and local policy
evidence exist.

## Tool

```bash
python3 WORKSPACE_SCAFFOLD/scripts/validate_ghostclaw_v3_3_artifact_gate.py \
  /Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip \
  --policy-evidence /path/to/local-policy-evidence.json
```

If the artifact is missing, the tool exits fail-closed with code `2` and
`missing_v3_3_artifact`.

## Non-Actions

No merge script, feature branch, commit, push, deploy, cloud mutation, provider call, install, migration, wallet action, live send, or secret read is authorized.

The validator does not extract files into this repo, does not mutate the
current dirty checkout, does not create a worktree, and does not run bundle
tests itself.

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_v3_3_artifact_gate_validator -v
python3 -m json.tool data/pathspecs/sirinx_ghostclaw_v3_3_artifact_gate_validator_2026-06-29.json > /dev/null
python3 -m json.tool WORKSPACE_SCAFFOLD/templates/ghostclaw_v3_3_artifact_gate_packet.template.json > /dev/null
git diff --check
```
