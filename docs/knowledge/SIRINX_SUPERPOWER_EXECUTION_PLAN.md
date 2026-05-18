# SIRINX Superpower Execution Plan

Date: 2026-05-19
Mode: local-safe execution plan
Status: active until local commits are reviewable; external gates remain closed

## Goal

Close the current local backlog in strict order without touching the live public homepage background or any production/external system.

## Hard Constraints

- Do not edit the recently updated live website background or homepage graphic system.
- Do not deploy to Cloudflare, Pages, Workers, DNS, or any production route.
- Do not push to GitHub or mutate a PR.
- Do not read, print, or write secrets.
- Do not create an OpenAI API key until the user explicitly confirms the key setup prompt.
- Do not call Supabase, Solis, Telegram, LINE, Notion, ClickUp, Google Drive, Figma, Canva, or Search Console with external writes.
- Do not send customer-facing messages.
- Do not change runtime configuration.

## File Scope

Allowed local paths:

- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/pages/HomeSolution.tsx`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/public/assets/home-solution/`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/App.tsx`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/components/Layout.tsx`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/contexts/LanguageContext.tsx`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/server/ogTags.ts`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/server/ogTags.test.ts`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/server/staticSeoBuild.ts`
- `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/server/_core/vite.ts`
- `/Users/sirinx/sirinx-os/apps/dev-dashboard/`
- `/Users/sirinx/sirinx-os/services/dev-control-api/`
- `/Users/sirinx/sirinx-os/docs/knowledge/`
- `/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md`

Forbidden local paths unless explicitly approved:

- Public homepage background/hero/slideshow files.
- `.env`, `.env.*`, secret stores, browser profiles, token files, key files.
- Cloudflare production config, DNS config, migration scripts, and deploy scripts.
- Any generated build output or dependency folder.

## Part 1: Public Website Home Solution

Current state:

- `/home-solution` exists locally.
- Static SEO, JSON-LD, sitemap, responsive image assets, and no-JavaScript fallback are implemented.
- Local test/debug already passed.
- No live background graphic files are in the public website diff.

Done means:

- Diff is reviewed.
- No background/homepage graphic files are changed.
- No secret-like text is present.
- Local commit exists and is not pushed.

## Part 2: Command Center And 47 Ronin

Current state:

- Command Center renders the 47 Ronin active profile summary and roster gates.
- Dashboard E2E issue was fixed by loading panels independently.
- Local test/debug already passed.

Done means:

- Diff is reviewed.
- `pnpm verify`, `pnpm dashboard:test`, `pnpm dashboard:e2e`, and `git diff --check` pass.
- Local commit exists and is not pushed.

## Part 3: External Gates

These remain blocked until explicit target approval:

1. GitHub push or PR update.
2. CodeRabbit autofix against the updated PR.
3. Cloudflare/Pages preview or production deploy.
4. Codex Mobile QR/MFA pairing.
5. Telegram/LINE target rotation and smoke send.
6. OpenAI API key setup for Hermes/thClaws.
7. Supabase schema or data work.
8. Solis read-only telemetry credential setup.

## Verification

Required local checks before reporting done:

```bash
cd /Users/sirinx/restore-sources/ton36475-lgtm-sirinx
corepack pnpm run check
corepack pnpm run test
corepack pnpm run build
git diff --check
```

```bash
cd /Users/sirinx/sirinx-os
pnpm verify
pnpm dashboard:test
pnpm dashboard:e2e
git diff --check
```

## Report Format

- Parts completed.
- Commits created locally.
- Tests run.
- Protected live-background confirmation.
- External gates still blocked.
