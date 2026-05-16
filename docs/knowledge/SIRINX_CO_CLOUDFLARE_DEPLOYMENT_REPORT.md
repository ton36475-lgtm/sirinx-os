# sirinx.co Cloudflare Deployment Report

Status: Pages deployed and www-first domain routing active
Date: 2026-05-16

## Summary

The SIRINX public company website was built locally and deployed to Cloudflare Pages as a real production deployment. The primary `www.sirinx.co` host is active and serving the Pages deployment through the Cloudflare Worker bridge.

The primary public website is now defined as:

```text
www.sirinx.co
```

The apex domain should redirect to the primary website:

```text
sirinx.co -> https://www.sirinx.co
```

No `.env` files were read. No secrets were printed.

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
ae89807a-a1e7-45b7-9f6d-b69994dc3c7f
```

Deployment URL:

```text
https://ae89807a.sirinx-co.pages.dev
```

Stable Pages URL:

```text
https://sirinx-co.pages.dev
```

Build source:

```text
apps/sirinx-site/dist
```

## Verification

Local verification before deploy:

```bash
pnpm site:check
```

Cloudflare verification after deploy:

```text
https://sirinx-co.pages.dev returned HTTP 200
https://www.sirinx.co returned HTTP 200
https://sirinx.co returned HTTP 301 to https://www.sirinx.co/
Deployed HTML contains company-facing SIRINX content
Deployed HTML does not contain dev, preflight, Cloudflare status, or DNS-pending copy
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
www.sirinx.co: active HTTP validation, primary website
sirinx.co: pending HTTP validation, apex redirect source
```

Active DNS records:

```text
Type: CNAME
Name: www
Target: sirinx-co.pages.dev
Proxy status: Proxied
TTL: Auto
```

## Active Redirect Bridge

The apex redirect is currently handled by `sirinx-main-router`:

```text
sirinx.co/* -> https://www.sirinx.co/*
```

Keep this bridge until `sirinx.co` Pages custom domain validation becomes active and a later routing change explicitly replaces it.
