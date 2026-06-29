# SIRINX All-Chat Export Request Packet

Status: `ALL_CHAT_EXPORT_REQUEST_PACKET_LOCAL_ONLY`
Date: `2026-06-29`
Boundary: `no_export_loaded`

```text
status=request_packet_ready_no_export_loaded
next_outbox_packet=packet_020
claims_all_chats_read=false
raw_chat_content_stored=false
real_export_loaded=false
connector_read_performed=false
provider_call=false
external_upload=false
runtime_queue_execution=false
deploy=false
push=false
cloud_mutation=false
customer_send=false
secret_read=false
```

This packet requests the missing source for the active all-chat consolidation
requirement. It does not import a ChatGPT export, query a connector, or claim
that all chats were read.

## Required Operator Input

Provide one of:

- local ChatGPT export path supplied by the operator
- explicit read-only connector scope authorized by the operator

The receipt must include:

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

## Evidence

- `data/pathspecs/sirinx_all_chat_export_intake_contract_2026-06-29.json`
- `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_CONTRACT_2026-06-29.md`
- `data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json`
- `docs/knowledge/SIRINX_ALL_CHAT_EXPORT_INTAKE_MAPPER_2026-06-29.md`
- `docs/knowledge/SIRINX_ACTIVE_GOAL_COMPLETION_REQUIREMENTS_MATRIX_2026-06-29.md`
- `docs/knowledge/SIRINX_ACTIVE_GOAL_SOURCE_FILE_RECEIPT_2026-06-29.md`

## Next Safe Action

Operator provides a local export path or an explicitly authorized read-only
connector scope. Codex then records receipt metadata and runs the metadata-only
mapper before any claim about all-chat coverage.

## Non-Actions

No raw chat content was loaded or written. No provider call, connector read,
external upload, runtime queue execution, deploy, push, cloud mutation,
customer send, install, migration, wallet action, live send, paid call, or
secret read is authorized by this packet.
