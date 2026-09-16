# SIRINX All-Chat Export Intake Contract

Status: `ALL_CHAT_EXPORT_INTAKE_CONTRACT_LOCAL_ONLY`
Date: `2026-06-29`
Boundary: `no_export_loaded`

This contract does not import any chat export.

It prepares the shape for future all-chat consolidation when the operator
provides a ChatGPT export or connector-backed source. Until that source exists,
the active goal remains incomplete and all-chat coverage must not be claimed.

## Guardrails

```text
claims_all_chats_read=false
raw_chat_content_stored=false
provider_call=false
external_upload=false
runtime_queue_execution=false
deploy=false
push=false
cloud_mutation=false
customer_send=false
secret_read=false
```

## Allowed Input Sources

| Source | Requirement |
| --- | --- |
| `chatgpt_export` | Operator-supplied local export path, export timestamp, hash, and read permission. |
| `connector_backed_source` | Explicit connector authorization, query scope, and read-only boundary. |

## Required Mapping Fields

Every accepted source row must map to:

```text
repo/path/status/blocker/next_action/source
```

Machine-readable records should include:

- `source_id`
- `source_kind`
- `conversation_id_hash`
- `title_redacted`
- `source_path`
- `repo`
- `paths`
- `status`
- `blockers`
- `next_action`
- `evidence`
- `permission`
- `freshness`
- `confidence`

## Redaction Rules

- Do not store message bodies in this repo.
- Hash conversation identifiers before writing records.
- Redact titles that contain names, accounts, credentials, customer data, or private project labels.
- Store only mapping fields needed for local work routing.
- Keep source files local unless the operator authorizes a connector-backed read.

## Current Status

`BLOCK-CHAT-EXPORT` remains open because no ChatGPT export or connector-backed
conversation source is present as current local evidence.

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_all_chat_export_intake_contract -v
python3 -m json.tool data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json > /dev/null
node scripts/check-operating-files.mjs
git diff --check
```

## Non-Actions

No raw chat content was loaded or written. No provider call, external upload,
runtime queue execution, deploy, push, cloud mutation, customer send, install,
migration, wallet action, live send, or secret read is authorized by this
contract.
