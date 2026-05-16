# www.sirinx.co Cloudflare Setup Plan

Status: prepared for local review
Date: 2026-05-16
Scope:

- `apps/sirinx-site/**`
- `docs/knowledge/SIRINX_CO_CLOUDFLARE_SETUP.md`
- root package scripts for local verification

## Purpose

Prepare the `www.sirinx.co` public web page for Cloudflare Pages, with `sirinx.co` reserved as an apex redirect to `www`.

This is a local preflight package only. It does not create a Cloudflare project, change DNS records, deploy assets, use API tokens, or read `.env` values.

## Local Site

Package:

```text
@sirinx/site
```

Local source:

```text
apps/sirinx-site/src
```

Build output:

```text
apps/sirinx-site/dist
```

Commands:

```bash
pnpm site:check
pnpm site:dev
```

Local preview:

```text
http://127.0.0.1:8730
```

## Cloudflare Pages Values

Use these values when human approval is given to create the Cloudflare Pages project.

```text
Project name: sirinx-co
Framework preset: None / static
Build command: pnpm --filter @sirinx/site build
Build output directory: apps/sirinx-site/dist
Environment variables: none required
Production branch: main, unless release policy says otherwise
Primary custom domain: www.sirinx.co
Apex redirect domain: sirinx.co
```

Repository config:

```text
apps/sirinx-site/wrangler.jsonc
```

The Wrangler config contains:

```text
name = sirinx-co
pages_build_output_dir = ./dist
compatibility_date = 2026-05-16
send_metrics = false
```

## Prepared Cloudflare Files

Cloudflare Pages reads static headers and redirects from plain files in the build output.

Prepared files:

```text
apps/sirinx-site/public/_headers
apps/sirinx-site/public/_redirects
apps/sirinx-site/public/robots.txt
apps/sirinx-site/public/sitemap.xml
```

Rules:

- `_headers` adds baseline browser security headers and cache rules.
- `_redirects` only handles path-level redirects such as `/home` and `/index.html`.
- `sirinx.co` to `www.sirinx.co` must be handled through Cloudflare Redirect Rules or Bulk Redirects and DNS, not through `_redirects`.

## Official Cloudflare References

- Cloudflare Pages build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Cloudflare Pages headers: https://developers.cloudflare.com/pages/configuration/headers/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- Cloudflare Pages Wrangler configuration: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- Redirect root to `www`: https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/

## Approval Checklist Before Cloudflare Mutation

Before doing any real Cloudflare operation, confirm:

- Human approval explicitly allows Cloudflare login and Pages setup.
- Correct Cloudflare account and zone for `sirinx.co` are selected.
- DNS records are reviewed before mutation.
- No real API tokens or secrets are added to the repo.
- Cloudflare Pages project name is `sirinx-co`.
- Build output directory is `apps/sirinx-site/dist`.
- `sirinx.co` redirects to `www.sirinx.co` through Cloudflare Redirect Rules or an approved equivalent.
- A rollback route is known before making DNS live.

## Not Performed

- No Cloudflare login.
- No Pages project creation.
- No Cloudflare deployment.
- No DNS record changes.
- No API token creation.
- No secret reads.
- No `.env` reads.
- No git push.

## Verification

Run:

```bash
pnpm site:check
pnpm verify
```

Expected result:

```text
site build passes
site secret-pattern scan passes
repository syntax checks pass
source code changes remain limited to the local static site package
```
