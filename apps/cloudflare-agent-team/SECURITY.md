# Cloudflare Agent Team Security

Status: LOCAL SKELETON ONLY

## Rules

- Do not commit `.dev.vars`, `.env`, tokens, account IDs, service token secrets, or API credentials.
- Do not put secrets in `wrangler.toml`.
- Keep `wrangler.toml.example` as an example until deploy approval exists.
- Use Cloudflare Access for private hosts.
- Use scoped service tokens for machine-to-machine access.
- Remote MCP is auth-required and read-only by default.
- All mutation tools require `approval_id`.
- R2 artifacts are private-by-default.
- Workers Logs must use correlation IDs and must not contain secrets.
- The local prototype must return `cloudflareApiCall: false`, `externalWrite: false`, and `secretRequired: false`.

## Blocked Commands Until Approval

```bash
wrangler deploy
wrangler secret put
wrangler d1 create
wrangler r2 bucket create
wrangler queues create
wrangler vectorize create
```
