# Cloudflare Remote MCP Permission Matrix

Status: DRAFT ONLY - NO REMOTE MCP REGISTRATION

## Transport

Remote MCP must use Streamable HTTP where supported. Legacy SSE is not the default target.

## Initial Tools

| Tool | Read | Write | Mutation risk | Status |
| --- | --- | --- | --- | --- |
| `read_project_state` | Project state summary | None | Low | Allowed after auth |
| `list_approval_requests` | Approval queue | None | Low | Allowed after auth |
| `write_evidence_summary` | Existing evidence paths | Evidence summary only | Medium | Requires approval ID |
| `query_memory` | Distilled memory only | None | Low | Allowed after auth |
| `draft_cloudflare_plan` | Plans and config examples | Draft file only | Medium | Local-first only |

## Forbidden Before Approval

- `deploy_worker`
- `edit_dns`
- `change_access_policy`
- `create_secret`
- `delete_secret`
- `cloudflare_api_execute_mutation`
- `publish_artifact_publicly`
- `send_external_message`
- `export_token`

## Required Fields Per Tool Call

```json
{
  "correlation_id": "corr_YYYYMMDD_slug",
  "approval_id": "approval_or_null",
  "actor": "m2-bridge-or-human",
  "tool": "tool_name",
  "scope": "read-only|draft|approved-mutation",
  "evidence_path": "06_OUTPUTS/logs/...",
  "redaction_policy": "no-secrets"
}
```

