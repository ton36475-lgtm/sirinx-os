# SIRINX All-Chat Export Intake Mapper

Status: `ALL_CHAT_EXPORT_INTAKE_MAPPER_READY_NO_EXPORT_LOADED`
Date: `2026-06-29`
Boundary: `no_export_loaded`

This mapper does not claim all chats were read.

No raw chat content is written.

The mapper prepares a local-only metadata route from a future operator-supplied
ChatGPT export or connector-backed source into:

```text
repo/path/status/blocker/next_action/source
```

## Guardrails

```text
claims_all_chats_read=false
raw_chat_content_stored=false
real_export_loaded=false
provider_call=false
external_upload=false
runtime_queue_execution=false
deploy=false
push=false
cloud_mutation=false
customer_send=false
secret_read=false
```

## Tool

```bash
python3 WORKSPACE_SCAFFOLD/scripts/build_all_chat_export_intake_map.py \
  --export /path/to/operator-supplied/conversations.json \
  --source-id chatgpt-export-YYYY-MM-DD \
  --repo /Users/sirinx/sirinx-os \
  --output /path/to/local-metadata-map.json
```

If `--export` is missing or invalid, the script exits fail-closed with code `2`.

## Output Boundary

The generated map contains conversation ID hashes, redacted titles, source path,
repo path, status, blockers, next safe action, evidence paths, permission,
freshness, and confidence.

It does not store message bodies, raw transcripts, token values, cookies,
provider payloads, private keys, or `.env` values.

## Routing

| Source Evidence | Blocker |
| --- | --- |
| `packet_013`, `LANE_1`, `Opus`, `Hermes decision` | `BLOCK-LANE1-OPUS-PACKET` |
| `v3.3`, `merge kit`, `ghostclaw_repo_merge_kit_v3_3.zip` | `BLOCK-V3-3-ARTIFACT` |
| `R0`, `testnet`, `approval` | `BLOCK-R0-APPROVALS` |
| `ChatGPT export`, `all chats`, `all-chat` | `BLOCK-CHAT-EXPORT` |

## Current Status

The mapper contract is ready, but no real export has been loaded. The active
goal remains incomplete until an operator provides a ChatGPT export or
connector-backed source and the resulting metadata map is reviewed.

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_all_chat_export_intake_mapper -v
python3 -m json.tool data/pathspecs/sirinx_all_chat_export_intake_mapper_2026-06-29.json > /dev/null
node scripts/check-operating-files.mjs
git diff --check
```

## Non-Actions

No provider call, external upload, runtime queue execution, merge script,
feature branch creation, commit, push, deploy, cloud mutation, install,
migration, wallet action, live send, customer send, paid call, or secret read
is authorized by this mapper.
