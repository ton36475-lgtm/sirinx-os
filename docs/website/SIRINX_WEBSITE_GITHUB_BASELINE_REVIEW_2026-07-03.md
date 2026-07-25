# SIRINX Website GitHub Baseline Review

Status: local read-only GitHub review
Date: 2026-07-03T01:42:51+0700
Scope: `apps/sirinx-site`, `docs/website`, `docs/specs`, `docs/runbooks`, `_A2A_QUEUE/outbox`
Repository: `ton36475-lgtm/sirinx-os`
Local branch: `staging/godmode-master-os-v2`
Upstream branch: `origin/staging/godmode-master-os-v2`
Default branch reported by GitHub: `codex/urgent-backlog-execution`
Deploy status: not deployed
Push status: not pushed

## Purpose

This review uses GitHub/origin code as an additional baseline check before any deployment or push approval. It records what the current local website work changes relative to GitHub and which risks still require human review.

## Read-Only GitHub Evidence

- `git fetch origin --prune`: passed
- Local upstream: `origin/staging/godmode-master-os-v2`
- Current local branch status: ahead of upstream by 33 commits
- GitHub connector compare: `codex/urgent-backlog-execution...staging/godmode-master-os-v2`
  - Status: `ahead`
  - Ahead by: 25 commits
  - Behind by: 0 commits
  - Base commit: `a5de5858989a3c258acaf9c41a97c9b65cb0856b`
- No GitHub write action was performed.

## GitHub Baseline Finding

The upstream GitHub version of `apps/sirinx-site/src/index.html` is still the older controlled-AI operations homepage:

- Title: `SIRINX - Controlled AI Operations`
- Hero heading: `SIRINX`
- CTA: `Work with SIRINX`
- Contact target: page anchor/email path

The current local website replaces that baseline with the SIRINX Solar/LINE conversion site:

- Homepage hero: `เปลี่ยนที่จอดรถ` / `เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์`
- Primary CTA: `ขอใบเสนอราคา Solar Carport`
- Contact route: `/contact?interest=solar-carport`
- LINE Official route, QR, floating contact cluster, quote readiness, ROI readiness, projects, trust center, and local guardrails

## Local Difference Summary Against GitHub Baseline

- Tracked website files changed against upstream: 10
- Local untracked website/evidence/spec/outbox files in this review scope: 73
- Website scripts added locally:
  - `test:line`
  - `test:closed-gates`
  - `test:server`
- New local pages and components include:
  - `/line`
  - `/contact`
  - `/projects`
  - `/trust-center`
  - `/quote`
  - `/roi-calculator`
  - floating LINE/inquiry contact cluster
  - central LINE Official config
- New local evidence includes packets `packet_039` through `packet_052` and website/spec/runbook documents.

## Risk Review

Current risk: medium until human review is complete.

Primary risks:

- The GitHub baseline does not yet contain the local website upgrade surface, so this is a broad website change set.
- Several required website files are untracked locally and would be absent from any push/deploy unless intentionally added after approval.
- Human review is still required because the previous design/copy direction was rejected by the operator.
- Real-device LINE QR scan remains unverified.
- Existing bot or inquiry behavior still needs manual confirmation beyond automated route checks.

## Safe Conclusion

The GitHub baseline review supports continuing local QA and human review. It does not support deploy or push yet.

The local website upgrade is materially different from the GitHub baseline and must be reviewed as a deliberate website migration/update, not a small patch.

## Closed Gates

Still blocked until separate explicit approval:

- Deploy
- Push
- LINE webhook activation
- Production analytics
- CRM/customer data storage
- Customer data collection through website forms
- External message send
- Provider call
- Paid provider call
- Public tunnel
- Package install
- Database write or migration
- Secret or real `.env` read

## Next Safe Action

Human review the local preview, compare current local homepage against the current live website and GitHub baseline, scan LINE QR on a real device, manually confirm existing bot/inquiry behavior, and only then decide whether to approve a controlled push/deploy path.

This review is not deploy approval and not push approval.
