# Active Focus Local Runbook - 2026-07-03

## Scope

Active work is limited to `sirinx.co` and AGM AutoFlow:

- `@sirinx/site` in `apps/sirinx-site`
- `@agm/site` in `apps/agm-site`
- `@sirinx/agm-autoglow-dashboard` in `apps/agm-autoglow-dashboard`
- `@sirinx/autoglow-core` in `packages/autoglow-core`

Kusala and Phitsanulok News are paused/out-of-focus. Do not include them in active build, UAT, commit, push, deploy, or Cloudflare/R2 lanes unless a separate gate reopens them.

## Local Verification

```bash
pnpm active-focus:preview-uat
```

This command builds the active static sites, runs the AGM browser smoke check, starts two local-only preview servers, probes routes/API, writes evidence, and shuts the servers down.

Default local URLs during the UAT:

- `sirinx.co` preview: `http://127.0.0.1:18732`
- AGM AutoGlow dashboard: `http://127.0.0.1:18733`

Evidence:

- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json`
- `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json`
- `reports/mission/A2A2A_ACTIVE_FOCUS_LOCAL_PREVIEW_UAT_20260703.md`

## Manual Preview Commands

Use separate ports because both apps default to `8730`.

```bash
pnpm --filter @sirinx/site build
SIRINX_SITE_DIR=dist SIRINX_SITE_PORT=18732 pnpm --filter @sirinx/site preview
```

```bash
AUTOGLOW_DASHBOARD_PORT=18733 \
AUTOGLOW_DASHBOARD_DATA_DIR=.ghostclaw_runtime/a2a2a/tmp/active-focus-autoglow-dashboard \
pnpm --filter @sirinx/agm-autoglow-dashboard dev
```

```bash
pnpm --filter @agm/site build
pnpm --filter @agm/site test:smoke
pnpm --filter @sirinx/autoglow-core test
```

## Closed Gates

This runbook is local-only. It does not approve commit, push, deploy, Cloudflare/R2 mutation, provider calls, Telegram live sends, customer-data routing, key printing, package install, or `.env` reads.
