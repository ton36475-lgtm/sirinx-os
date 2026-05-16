# sirinx.co Cloudflare Deployment Report

Status: Pages deployed, www-first domain routing pending DNS authorization
Date: 2026-05-16

## Summary

The SIRINX public static site was built locally and deployed to Cloudflare Pages as a real production deployment.

The primary public website is now defined as:

```text
www.sirinx.co
```

The apex domain should redirect to the primary website:

```text
sirinx.co -> https://www.sirinx.co
```

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
ecae0323-9fd3-4881-a102-d9f6473a9640
```

Deployment URL:

```text
https://ecae0323.sirinx-co.pages.dev
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
3412505 docs: define www primary domain routing
```

## Verification

Local verification before deploy:

```bash
pnpm site:check
```

Cloudflare verification after deploy:

```text
https://sirinx-co.pages.dev returned HTTP 200
Deployed HTML contains SIRINX and www.sirinx.co primary-domain content
Sitemap points to https://www.sirinx.co/
Robots.txt points to https://www.sirinx.co/sitemap.xml
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
www.sirinx.co: pending HTTP validation, primary website
sirinx.co: pending HTTP validation, apex redirect source
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
Name: www
Target: sirinx-co.pages.dev
Proxy status: Proxied
TTL: Auto

Type: CNAME
Name: @
Target: sirinx-co.pages.dev
Proxy status: Proxied
TTL: Auto
```

After DNS is set, Cloudflare Pages should complete HTTP validation and issue certificates for both custom domains.

## Remaining Optional Rule

To force `sirinx.co` to `www.sirinx.co`, add a Cloudflare redirect rule after both domains validate:

```text
If hostname equals sirinx.co
Then static redirect to https://www.sirinx.co/$1
Status code: 301
Preserve path and query string
```

This redirect should be configured in Cloudflare zone rules, not in the Pages `_redirects` file.
