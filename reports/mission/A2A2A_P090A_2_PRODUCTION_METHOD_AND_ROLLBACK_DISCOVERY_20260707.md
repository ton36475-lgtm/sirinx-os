# A2A2A P090A-2 Production Method And Rollback Discovery

Packet: `P090A_2_PRODUCTION_METHOD_AND_ROLLBACK_DISCOVERY`  
Status: `P090A2_METHOD_DISCOVERY_READY_FOR_P090C_EXACT_HUMAN_APPROVAL`  
Mode: read-only discovery; no deploy, push, Cloudflare mutation, DNS mutation, live send, provider call, or secret read.

## Scope

Target site: `www.sirinx.co`  
Cloudflare Pages project: `sirinx-co`  
Local workspace: `/Users/sirinx/sirinx-os/apps/sirinx-site`  
Current repo HEAD: `79cc2252a3d8bbbc036b9c8272c2d4f7c181126b`  
Current branch: `staging/godmode-master-os-v2`

## Read-Only Evidence

### Local Configuration

`apps/sirinx-site/wrangler.jsonc`:

```json
{
  "name": "sirinx-co",
  "compatibility_date": "2026-05-16",
  "pages_build_output_dir": "./dist",
  "send_metrics": false
}
```

`apps/sirinx-site/package.json` defines the production build as:

```text
pnpm build
```

which runs:

```text
node scripts/build.mjs
```

### Cloudflare Pages Project

Read-only `wrangler pages project list --json` confirms:

```json
{
  "Project Name": "sirinx-co",
  "Project Domains": "sirinx-co.pages.dev, www.sirinx.co",
  "Git Provider": "No",
  "Last Modified": "48 minutes ago"
}
```

Interpretation: `sirinx-co` is a Cloudflare Pages Direct Upload project, not a Git-provider project.

### Latest Production Deployment

Read-only `wrangler pages deployment list --project-name sirinx-co --environment production --json` confirms the current production deployment:

```json
{
  "Id": "6bdf4746-2c34-429b-b0d5-88f6dfed3f66",
  "Environment": "Production",
  "Branch": "main",
  "Source": "9d2e081",
  "Deployment": "https://6bdf4746.sirinx-co.pages.dev",
  "Status": "1 week ago"
}
```

Production branch is therefore frozen as `main`.

### Latest Preview Deployment

Read-only `wrangler pages deployment list --project-name sirinx-co --environment preview --json` confirms the P089E preview deployment:

```json
{
  "Id": "49d66d7f-98c5-4c18-b7a6-6e26886563a2",
  "Environment": "Preview",
  "Branch": "staging/godmode-master-os-v2",
  "Source": "f1cec05",
  "Deployment": "https://49d66d7f.sirinx-co.pages.dev",
  "Status": "48 minutes ago"
}
```

The release candidate site-code commit remains:

```text
f1cec05d89d82d35f9cf5616c91a13d6d2870962
```

P089G/P090B evidence commits are intentionally separate evidence commits and did not change the `apps/sirinx-site` release artifact.

### URL Reachability

Read-only GET checks returned HTTP 200 for:

```text
https://www.sirinx.co/
https://6bdf4746.sirinx-co.pages.dev/
https://49d66d7f.sirinx-co.pages.dev/
https://staging-godmode-master-os-v2.sirinx-co.pages.dev/
```

All responses were `text/html; charset=utf-8`.

## Frozen Production Deploy Method

Production deployment remains blocked until exact P090C approval. If approved, the frozen method is Cloudflare Pages Direct Upload through Wrangler:

```bash
cd /Users/sirinx/sirinx-os/apps/sirinx-site
pnpm build
pnpm exec wrangler pages deploy dist \
  --project-name sirinx-co \
  --branch main \
  --commit-hash f1cec05d89d82d35f9cf5616c91a13d6d2870962 \
  --commit-message "fix(site): restore focus after closing contact panels"
```

Why this commit hash: `f1cec05d89d82d35f9cf5616c91a13d6d2870962` is the preview deployment source that passed the P089C remote UAT. Later commits are evidence-only commits for gate records.

## Rollback Target

Rollback target frozen to the current production deployment:

```text
deployment_id: 6bdf4746-2c34-429b-b0d5-88f6dfed3f66
source: 9d2e081
branch: main
deployment_url: https://6bdf4746.sirinx-co.pages.dev
production_url: https://www.sirinx.co/
```

Cloudflare documentation states Pages rollbacks apply to successful production deployments; preview deployments cannot be used as rollback targets. Therefore the preview deployment `49d66d7f-98c5-4c18-b7a6-6e26886563a2` is not a rollback target.

### Rollback Procedure Candidate

Do not run unless a separate rollback gate is approved.

Dashboard procedure:

1. Open Cloudflare Dashboard.
2. Select Pages project `sirinx-co`.
3. Open production deployment `6bdf4746-2c34-429b-b0d5-88f6dfed3f66`.
4. Trigger Cloudflare Pages rollback for that production deployment.
5. Verify `https://www.sirinx.co/` after rollback.

API procedure candidate, not executed:

```bash
curl --request POST \
  "https://api.cloudflare.com/client/v4/accounts/4b35e17c8966dc88f57aa8019ebae2bb/pages/projects/sirinx-co/deployments/6bdf4746-2c34-429b-b0d5-88f6dfed3f66/rollback" \
  --header "Authorization: Bearer <CLOUDFLARE_API_TOKEN>"
```

This API command is documented as the Pages deployment rollback endpoint. It requires an explicit rollback gate and a valid Cloudflare token. No token was read or printed during this discovery.

## Rollback Verification

Rollback verification should be read-only GET checks only:

```text
https://www.sirinx.co/
https://6bdf4746.sirinx-co.pages.dev/
```

Expected minimum:

- HTTP 200
- `text/html` response
- no POST/PUT/PATCH/DELETE
- no webhook activation
- no CRM/customer storage write
- no Telegram/LINE/email/customer live send
- no DNS or Cloudflare settings mutation

Recommended post-rollback route smoke list:

```text
/
/line/
/contact/
/trust-center/
/projects/
/quote/
/roi-calculator/
```

## P090C Human Approval Packet Inputs

P090C should include these exact fields:

```yaml
project_name: sirinx-co
production_branch: main
deploy_method: cloudflare_pages_direct_upload_wrangler
workspace: /Users/sirinx/sirinx-os/apps/sirinx-site
build_command: pnpm build
deploy_command: pnpm exec wrangler pages deploy dist --project-name sirinx-co --branch main --commit-hash f1cec05d89d82d35f9cf5616c91a13d6d2870962 --commit-message "fix(site): restore focus after closing contact panels"
release_candidate_site_code_commit: f1cec05d89d82d35f9cf5616c91a13d6d2870962
current_evidence_head: 79cc2252a3d8bbbc036b9c8272c2d4f7c181126b
current_production_deployment_id: 6bdf4746-2c34-429b-b0d5-88f6dfed3f66
rollback_target_deployment_id: 6bdf4746-2c34-429b-b0d5-88f6dfed3f66
rollback_target_source: 9d2e081
rollback_verification_urls:
  - https://www.sirinx.co/
  - https://6bdf4746.sirinx-co.pages.dev/
```

## Blocked Actions Confirmed

- No production deploy.
- No preview deploy.
- No git push.
- No Cloudflare/R2/D1/KV/DNS mutation.
- No LINE webhook activation.
- No CRM/customer storage write.
- No Telegram/LINE/email/customer live send.
- No provider/model call.
- No secret read or print.

## Source Links

- Cloudflare Pages rollback documentation: https://developers.cloudflare.com/pages/configuration/rollbacks/
- Cloudflare Pages deployment rollback API: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/rollback/
- Cloudflare Wrangler Pages deploy command help was verified locally with `pnpm exec wrangler pages deploy --help`.

## Final Status

`P090A2_METHOD_DISCOVERY_READY_FOR_P090C_EXACT_HUMAN_APPROVAL`

Production remains blocked until the operator grants an exact P090C production deploy approval.
