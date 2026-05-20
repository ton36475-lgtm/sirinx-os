# Cloudflare Bot Management Review Evidence

Gate: Cloudflare Bot Management official review
Status: pending dashboard/API permission and reversible rule evidence
External writes: false
Secret storage: not applicable for this evidence file

## Required Evidence

- [ ] Cloudflare zone and permission scope confirmed
- [x] current CSP mitigation acknowledged
- [x] admin/API/auth/webhook/telemetry protection preserved
- [x] candidate rule and rollback path recorded
- [x] post-change smoke matrix recorded

## Operator Record

- Date/time: 2026-05-20 15:34:00 +0700
- Operator: Codex local preflight; human operator still required for Cloudflare zone/permission confirmation before any dashboard/API mutation
- Zone masked label: pending
- Permission scope: pending
- Current CSP state: current CSP allows deployed `/assets/` scripts and blocks `/cdn-cgi/challenge-platform`
- Candidate Bot/WAF rule: draft only; use Managed Challenge on selected browser-only public conversion paths after first HTML request, using `cf.bot_management.js_detection.passed` plus bot-score/verified-bot guardrails if the zone plan supports it
- Affected public paths: draft public-only review scope: `/assessment/`, `/contact/`, `/pricing/`, `/home-solution/`; do not target first-entry root `/` until official rule behavior is proven
- Protected internal paths: admin, API, auth, dashboard, webhook, and telemetry paths must remain protected
- Rollback plan: disable/delete only the new candidate WAF/Bot rule and keep the current CSP mitigation in place until live smoke proves the official rule is safe
- Post-change smoke matrix: HTTP header check, Playwright mobile/desktop smoke for `/`, `/home-solution/`, `/contact/`, asset-load check, no `/api`/admin/auth/webhook/telemetry path match, no console/runtime errors, Lighthouse sample after propagation

## Verification Output

Do not paste Cloudflare API tokens, account secrets, zone secrets, cookies, or private account identifiers.

```text
Local preflight:
- Official Cloudflare JavaScript Detections docs reviewed: https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/
- Live `www.sirinx.co` headers currently show `server: cloudflare`.
- Live CSP currently allowlists deployed `/assets/` scripts and Cloudflare Insights, but does not allow `/cdn-cgi/challenge-platform`.
- Candidate rule is a draft only; no Cloudflare WAF/Bot/DNS/Access/Pages change was made.
- Blocked external actions remain: Cloudflare WAF mutation, Bot Management setting change, DNS change, Access policy change, Pages route change.

Pending human verification:
- Cloudflare zone masked label
- permission scope with Bot Management/WAF write capability
- dashboard/API target confirmation
```

## Stop Rule

Stop if the candidate rule weakens admin/API/auth/webhook/telemetry protection, lacks rollback, or lacks a live smoke matrix.
