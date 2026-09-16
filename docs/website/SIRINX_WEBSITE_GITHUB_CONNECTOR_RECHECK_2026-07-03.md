# SIRINX Website GitHub Connector Recheck

Status: read-only GitHub/local/live comparison
Date: 2026-07-03T02:28:11+0700
Scope: `apps/sirinx-site`
GitHub repository: `ton36475-lgtm/sirinx-os`
GitHub branch: `staging/godmode-master-os-v2`
Production mutation: none
GitHub mutation: none
Deploy: not run
Push: not run

## Purpose

This recheck uses the GitHub connector and local git metadata to avoid confusing three different sources:

- GitHub branch baseline
- Local working copy
- Current live website at `https://www.sirinx.co/`

The important finding is that the GitHub branch copy of `apps/sirinx-site/src/index.html` is still the older `Controlled AI Operations` page. It should not be copied over the local website upgrade because doing so would roll back the Solar Carport, LINE Official, `/line`, quote, ROI, and trust work.

## Read-Only Sources Checked

| Source | Evidence | Result |
| --- | --- | --- |
| GitHub connector branch lookup | `ton36475-lgtm/sirinx-os`, query `staging/godmode-master-os-v2` | Branch exists |
| GitHub connector file fetch | `apps/sirinx-site/src/index.html` on `staging/godmode-master-os-v2` | Fetched successfully, blob `4bff81afadf3994b886c61b060c66075fe4b4b52` |
| Git remote metadata | `git ls-remote --heads origin staging/godmode-master-os-v2` | Remote branch commit `02524464ea97931aea1a34c559ecdec6e431dc37` |
| Local git metadata | `git rev-parse HEAD` | Local HEAD `aa66f263b182dceafeb16562e36064bddf40c342` |
| Live website read | `https://www.sirinx.co/` | HTTP 200, Solar homepage detected |
| Local source read | `apps/sirinx-site/src/index.html` | Solar homepage with LINE route detected |

## Comparison

| Check | GitHub branch file | Live website | Local source |
| --- | --- | --- | --- |
| Page title | `SIRINX - Controlled AI Operations` | `SIRINX | Solar Carport วางแผนลดค่าไฟองค์กร พร้อม EV Charger, BESS & AI Energy` | `SIRINX | Solar Carport วางแผนลดค่าไฟองค์กร พร้อม EV Charger, BESS & AI Energy` |
| Solar content | No | Yes | Yes |
| LINE text/link data | No | Partial LINE signal detected, but no `/line` link on homepage | Yes |
| `/line` homepage link | No | No | Yes |
| Homepage QR URL | No | No | No, QR is provided through LINE/contact routes and floating component output |
| Primary contact route | `#contact` | `/contact?interest=solar-carport` | `/contact?interest=solar-carport` |
| Should copy into local now? | No | No automatic copy | Current local source is the working target |

## Decision

Do not replace the local `apps/sirinx-site/src/index.html` with the GitHub branch version. The GitHub branch version is older than both the current live website and the local upgrade direction.

Current safe direction:

- Keep local website code as the review target.
- Keep GitHub branch as a remote baseline only.
- Preserve closed gates: no push, no deploy, no LINE webhook, no production analytics, no CRM/customer data storage.
- Human review must happen before any exact deployment approval.

## Verification Run

- `pnpm --filter @sirinx/site test:closed-gates`: passed, 3 checks
- `pnpm --filter @sirinx/site test:release-readiness`: passed, 1 check
- `pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks
- `git diff --stat origin/staging/godmode-master-os-v2 -- apps/sirinx-site`: 8 website files differ locally from GitHub baseline
- `git diff --check origin/staging/godmode-master-os-v2 -- apps/sirinx-site docs/website _A2A_QUEUE/outbox/packet_05* _A2A_QUEUE/outbox/packet_06*`: passed

## Risk

Risk: medium if someone blindly copies the GitHub branch index over local work, because it would revert the site to the old AI operations page.

Risk is low for this recheck itself because it was read-only against GitHub and live website sources, with no push, deploy, provider write, webhook, analytics, or CRM mutation.

## Next Safe Action

Use local preview and the review board for human acceptance:

- Local preview: `http://127.0.0.1:8730/`
- Review board: `docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html`
- Manual result template: `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md`

After human review, deployment still needs a separate explicit approval.
