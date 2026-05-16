# SIRINX Domain Routing Plan

Status: routing policy approved by operator request
Date: 2026-05-16

## Primary Rule

Use `www.sirinx.co` as the main public website.

Use subdomains for every other system.

```text
Main website: https://www.sirinx.co
Apex domain:  https://sirinx.co -> https://www.sirinx.co
```

## Cloudflare Pages

Current Pages project:

```text
sirinx-co
```

Primary custom domain:

```text
www.sirinx.co
```

Pages fallback:

```text
https://sirinx-co.pages.dev
```

## Required DNS

The active Wrangler OAuth token can deploy Pages and add Pages custom domains, but it cannot edit DNS records.

When DNS edit permission is available, configure:

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

Then add a redirect rule:

```text
If hostname equals sirinx.co
Then redirect to https://www.sirinx.co${uri}
Status code: 301
Preserve path and query string
```

## Subdomain Allocation

Reserved routing plan:

```text
www.sirinx.co       public main website
dev.sirinx.co       Developer Command Center, Cloudflare Access required
api.sirinx.co       backend/API entrypoint, Access/service auth required
solar.sirinx.co     Solar Intelligence frontend/API, Access or public policy required
ops.sirinx.co       operations status and runbooks, Access required
docs.sirinx.co      public or protected documentation, policy-dependent
assets.sirinx.co    static assets/R2/public media, policy-dependent
```

## Exposure Rules

- Do not expose local-only development servers directly to the public internet.
- Do not expose Dev Control API without Cloudflare Access or equivalent service auth.
- Do not publish admin dashboards without explicit access policy.
- Do not route AI/backend services to public DNS until safety gates and rate limits are documented.
- Keep `www.sirinx.co` as the only public main-site hostname.

## Current State

Completed:

- Cloudflare Pages project `sirinx-co` exists.
- Production deployment exists.
- `www.sirinx.co` and `sirinx.co` are registered as Pages custom domains.
- Site canonical and sitemap point to `https://www.sirinx.co/`.

Pending:

- DNS CNAME records require Cloudflare DNS edit permission.
- Apex-to-www redirect rule requires Cloudflare zone rule permission.
- Subdomain projects/routes require separate implementation and access policy.
