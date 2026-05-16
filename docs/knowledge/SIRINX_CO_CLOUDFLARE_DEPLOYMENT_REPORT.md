# sirinx.co Cloudflare Deployment Report

Status: Pages deployed, custom domains pending DNS authorization
Date: 2026-05-16

## Summary

The `sirinx.co` static site was built locally and deployed to Cloudflare Pages as a real production deployment.

No `.env` files were read. No secrets were printed. No source files were changed during deployment.

## Cloudflare Pages

Project:

```text
sirinx-co
```

Production branch:

```text
main
```

Deployment ID:

```text
e3602602-58b3-4208-a42f-9940caa8e840
```

Deployment URL:

```text
https://e3602602.sirinx-co.pages.dev
```

Stable Pages URL:

```text
https://sirinx-co.pages.dev
```

Build source:

```text
apps/sirinx-site/dist
```

Repository commit metadata used for deployment:

```text
4de27ae chore: add local full-stack runner
```

## Verification

Local verification before deploy:

```bash
pnpm site:check
```

Cloudflare verification after deploy:

```text
https://sirinx-co.pages.dev returned HTTP 200
Deployed HTML contains SIRINX and sirinx.co Cloudflare readiness content
_headers uploaded
_redirects uploaded
```

## Custom Domains

Domains added to the Cloudflare Pages project:

```text
sirinx.co
www.sirinx.co
```

Current status:

```text
sirinx.co: pending HTTP validation
www.sirinx.co: pending HTTP validation
```

The active Cloudflare OAuth token has `pages:write` and `zone:read`, but DNS record creation returned:

```text
403 Authentication error
```

DNS records still need to be changed by a Cloudflare session or token with DNS edit permission.

## Required DNS Records

Create or update these DNS records in the `sirinx.co` zone:

```text
Type: CNAME
Name: @
Target: sirinx-co.pages.dev
Proxy status: Proxied
TTL: Auto

Type: CNAME
Name: www
Target: sirinx-co.pages.dev
Proxy status: Proxied
TTL: Auto
```

After DNS is set, Cloudflare Pages should complete HTTP validation and issue certificates for both custom domains.

## Remaining Optional Rule

To force `www.sirinx.co` to `sirinx.co`, add a Cloudflare redirect rule after both domains validate:

```text
If hostname equals www.sirinx.co
Then static redirect to https://sirinx.co/$1
Status code: 301
Preserve path and query string
```

This redirect should be configured in Cloudflare zone rules, not in the Pages `_redirects` file.
