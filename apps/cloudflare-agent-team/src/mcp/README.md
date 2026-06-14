# Remote MCP

Future remote MCP tools are read-only by default:

- read_project_state
- list_approval_requests
- write_evidence_summary
- query_memory
- draft_cloudflare_plan

Mutation tools are forbidden until an approval ID is present.
