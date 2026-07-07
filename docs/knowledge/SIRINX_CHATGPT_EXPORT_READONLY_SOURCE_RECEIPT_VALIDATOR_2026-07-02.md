# SIRINX ChatGPT Export Read-Only Source Receipt Validator

Status: `VALIDATOR_READY_NO_EXPORT_LOADED`

This document records a metadata-only validator for the future ChatGPT export
read-only mapping gate. It supports `packet_035`; it does not grant approval.

## Boundary

- schema=`sirinx.chatgpt_export.readonly_source_receipt_validator.v1`
- approval_gate=`APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>`
- approval_status=`not_granted`
- source_loaded=false
- connector_read_performed=false
- raw_chat_content_stored=false
- claims_all_chats_read=false
- provider_call=false
- external_upload=false
- runtime_queue_execution=false
- deploy=false
- push=false

## Validator

Script:

`WORKSPACE_SCAFFOLD/scripts/validate_chatgpt_export_readonly_source_receipt.py`

The validator reads only an operator-supplied receipt metadata JSON. It does not
open a ChatGPT export path, call a connector, inspect `.env`, call a provider,
write a database, send a message, or execute a runtime queue item.

## Required Receipt Fields

- `source_kind`
- `local_path_or_connector_scope`
- `operator_supplied`
- `read_only`
- `source_hash_or_query_id`
- `redaction_confirmed`
- `raw_chat_content_stored`
- `claims_all_chats_read`
- `permission`
- `freshness`
- `confidence`
- `approval_phrase`

## Required False Fields

- `raw_chat_content_stored`
- `claims_all_chats_read`
- `connector_read_performed`
- `real_export_loaded`
- `external_upload`
- `provider_call`
- `runtime_queue_execution`
- `secret_read`
- `deploy`
- `push`

## Forbidden Raw Content Fields

The validator rejects receipt JSON that contains raw chat-like fields such as
`messages`, `conversation`, `conversations`, `transcript`, `content`, `parts`,
`text`, `message_body`, `message_text`, `raw_message`, or `raw_chat_content`.

## Use

```bash
python3 WORKSPACE_SCAFFOLD/scripts/validate_chatgpt_export_readonly_source_receipt.py \
  --receipt <operator-receipt.json> \
  --json
```

Valid receipt metadata only means the metadata envelope is acceptable. A
separate operator approval remains required before any export load, connector
read, or metadata-only mapping run.

## Next Safe Action

Operator may provide `APPROVE_CHATGPT_EXPORT_READONLY_MAPPING_<path>_<date>`
with a local read-only source receipt. Codex validates the receipt metadata
before loading or mapping anything.

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_chatgpt_export_readonly_source_receipt_validator -v
python3 -m json.tool data/pathspecs/sirinx_chatgpt_export_readonly_source_receipt_validator_2026-07-02.json > /dev/null
git diff --check
```
