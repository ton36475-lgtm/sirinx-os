# P089 Exact Preview Deploy Approval Packet - 2026-07-07

Status: `READY_FOR_HUMAN_PREVIEW_DEPLOY_DECISION`

Mode: `APPROVAL_PACKET_ONLY_NO_DEPLOY`

This packet prepares the exact Cloudflare Pages preview deploy gate for `sirinx.co`. It does not run Wrangler deploy, mutate Cloudflare, change DNS, send messages, read secrets, push Git, or approve production.

## Release Candidate

| Field | Value |
|---|---|
| Repo | `/Users/sirinx/sirinx-os` |
| Branch | `staging/godmode-master-os-v2` |
| Remote | `origin` |
| Remote URL | `https://github.com/ton36475-lgtm/sirinx-os.git` |
| Candidate commit | `3e5420c82d762ed94e87af59e4b727af7dc95496` |
| Commit subject | `gate: record P087B auto visual bot pass evidence (2026-07-06)` |
| Local/remote parity | `PASS` (`0 0`, local HEAD equals origin) |
| Deploy-relevant paths clean | `PASS` |
| Broad dirty tree | `644` paths at packet time, outside the scoped release candidate |

The dirty tree is not cleaned by this packet. Preview deploy execution must repeat the scoped prechecks immediately before running any Cloudflare command.

## Evidence

| Evidence | Path / Result |
|---|---|
| P087B receipt | `/Users/sirinx/sirinx-os/reports/review/p087b/auto_visual_bot_receipt.json` |
| P087B result | `/Users/sirinx/sirinx-os/reports/review/p087b/auto_visual_bot_result.json` |
| P087B verdict | `auto_review_pass_bot_verified` |
| P087B second review | `/Users/sirinx/sirinx-os/reports/mission/A2A2A_P087B_OPENCODE_SECOND_REVIEW_PASS_20260706.md` |
| Release preflight | `/Users/sirinx/sirinx-os/_A2A_QUEUE/outbox/packet_071_sirinx_website_release_preflight.json` |
| P092A scoped commit report | `/Users/sirinx/sirinx-os/reports/mission/A2A2A_P092A_SCOPED_RELEASE_EVIDENCE_COMMIT_20260707.md` |
| P092B/P092C push alignment | `/Users/sirinx/sirinx-os/reports/mission/A2A2A_P092B_P092C_RELEASE_CANDIDATE_PUSH_AND_ALIGNMENT_20260707.md` |

## Cloudflare Pages Target

| Field | Value |
|---|---|
| Project | `sirinx-co` |
| Config | `/Users/sirinx/sirinx-os/apps/sirinx-site/wrangler.jsonc` |
| Build output | `/Users/sirinx/sirinx-os/apps/sirinx-site/dist` |
| Preview branch | `staging/godmode-master-os-v2` |
| Target | Cloudflare Pages preview deployment |

Local Wrangler help was checked for `wrangler pages deploy [directory]`. No deploy command was executed.

## Required Prechecks Before Execution

Run these immediately before any deploy execution:

```bash
git rev-parse HEAD
git rev-parse origin/staging/godmode-master-os-v2
git rev-list --left-right --count origin/staging/godmode-master-os-v2...HEAD
git status --short -- apps/sirinx-site/src apps/sirinx-site/public apps/sirinx-site/server.mjs apps/sirinx-site/package.json apps/sirinx-site/wrangler.jsonc pnpm-lock.yaml
pnpm --filter @sirinx/site build
python3 -m json.tool reports/review/p087b/auto_visual_bot_receipt.json >/dev/null
python3 -m json.tool reports/review/p087b/auto_visual_bot_result.json >/dev/null
```

Expected:

- Both `git rev-parse` values equal `3e5420c82d762ed94e87af59e4b727af7dc95496`.
- Ahead/behind output is `0 0`.
- Deploy-relevant path status is empty.
- Build passes.
- P087B receipt/result parse and still show `auto_review_pass_bot_verified`.
- Cloudflare authentication is present, but token values must not be printed.

## Exact Preview Deploy Command

This command is not authorized until the operator explicitly provides:

`APPROVE_P089_PREVIEW_DEPLOY_SIRINX_SITE_2026-07-07`

```bash
cd /Users/sirinx/sirinx-os/apps/sirinx-site
pnpm build
pnpm exec wrangler pages deploy dist --project-name sirinx-co --branch staging/godmode-master-os-v2 --commit-hash 3e5420c82d762ed94e87af59e4b727af7dc95496 --commit-message "gate: record P087B auto visual bot pass evidence (2026-07-06)"
```

## Rollback / Stop Plan

- This is preview-only. It does not authorize production promotion or DNS changes.
- If preview output is bad, do not promote it.
- Use Cloudflare Pages deployment history to select the previous known-good preview, or rerun a corrected preview deploy after a new packet.
- Stop immediately if a command targets production, DNS, R2, D1, KV, webhook activation, CRM/customer storage, live messaging, provider/model calls, or secret output.

## Blocked By This Packet

- Production deploy
- DNS mutation
- R2/D1/KV mutation
- LINE webhook activation
- CRM/customer data storage
- Live Telegram/LINE/email/customer send
- Git push
- Provider/model call
- Secret read/print

## Actions Performed

- Local repo state inspected: yes
- P087B JSON evidence parsed: yes
- Wrangler deploy help inspected: yes
- Local build run: yes, passed
- Cloudflare deploy executed: no
- Cloudflare/DNS mutation: no
- Git push: no
- Live send: no
- Secret read/print: no

Final status: `P089_EXACT_PREVIEW_DEPLOY_APPROVAL_PACKET_READY_FOR_HUMAN_DECISION`
