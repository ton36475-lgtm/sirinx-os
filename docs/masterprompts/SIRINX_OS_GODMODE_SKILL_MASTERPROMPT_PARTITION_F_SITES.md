# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_F_SITES.md
**Part F — Cloudflare Sites Integration Layer (Deployments & Hosting)**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## F.1 Cloudflare Sites Capabilities (Research Summary)

### Core Functions
- **Cloudflare Pages**: Static site hosting with git integration
- **Wrangler**: CLI for deployments and Bindings
- **Build Settings**: GitHub/GitLab connection, build commands, output directory
- **Preview Deployments**: Auto-generated per branch/PR

### API Endpoints
```
GET    /client/v4/pages/projects              # List projects
GET    /client/v4/pages/projects/{project_id}/deployments
POST   /client/v4/pages/projects/{project_id}/deployments
GET    /client/v4/pages/projects/{project_id}/domains
DELETE /client/v4/pages/projects/{project_id}/environments/{env_id}
GET    /client/v4/accounts/{account_id}/workers/clusters
```

### Wrangler Commands
- `wrangler pages deploy`: Deploy static assets
- `wrangler deploy`: Deploy Worker
- `wrangler secret put`: Add secrets
- `wrangler kv:key put`: KV operations
- `wrangler d1 migrations apply`: Database migrations

---

## F.2 Deployment State Schema

### Site Deployment Mapping
```typescript
interface SiteDeploymentState {
  project_name: string;
  environment: 'preview' | 'production';
  branch: string; // hermes/gc-xxxx
  deployment_id: string;
  url: string; // pages.dev URL
  status: 'processing' | 'success' | 'failed' | 'cancelled';
  created_at: string;
  sirinx_task_id?: string; // Link to task
  rollback_version?: string; // Previous deployment ID
}
```

### Deployment Configuration
```
pages:
  sirinx-dashboard:
    directory: dashboard/
    build_command: npm run build
    build_output: dist/
  ghostclaw-docs:
    directory: docs/knowledge/
    build_command: python3 scripts/docs-build.py
```

---

## F.3 Godmode Sites Commands

### /sites-deploy [project] [environment]
- Action: Deploy to Cloudflare Pages
- Risk Tier: MED (preview) / HIGH (production)

### /sites-rollback [project] [version]
- Action: Rollback to previous deployment
- Risk Tier: MED (preview) / HIGH (production)

### /sites-preview [branch]
- Action: Get preview URL
- Risk Tier: LOW (read-only)

### /sites-status [project]
- Action: Deployment status
- Risk Tier: LOW (read-only)

### /sites-domains [project]
- Action: List custom domains
- Risk Tier: LOW (read-only) / HIGH (add/remove domains)

### /sites-logs [deployment_id]
- Action: Get build logs
- Risk Tier: LOW (read-only)

---

## F.4 Integration Points
- **D1 Metadata**: Deployments table for rollback tracking
- **Telegram Deploy Bot**: Status notifications
- **GODMODE Auto-deploy**: LOW tier → auto preview deploy
- **Evidence Chain**: Deployment SHA links to approval
- **Mission Control**: Live dashboard deployments feed