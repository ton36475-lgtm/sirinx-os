# www.sirinx.co Main Website Incident

Status: Cloudflare Security challenge blocks custom domain before Pages/Worker
Date: 2026-05-16

## User Report

The main website shows an error on `www.sirinx.co`.

## Observed State

Working:

```text
https://sirinx-co.pages.dev -> HTTP 200
```

Blocked:

```text
https://www.sirinx.co -> Cloudflare challenge response
https://sirinx.co     -> Cloudflare challenge response
```

Response indicators:

```text
HTTP status: 403
cf-mitigated: challenge
server: cloudflare
```

The user may see this as a 503/error screen in the browser depending on challenge handling.

## Root Cause

The deployed Pages project is healthy. The failure happens at the Cloudflare zone security layer before traffic reaches Cloudflare Pages or the Worker router.

Evidence:

- Cloudflare Pages stable URL returns HTTP 200.
- Worker routes exist for `www.sirinx.co/*` and `sirinx.co/*`.
- Requests to custom domains are challenged before Worker response headers appear.

## Actions Completed

Created and deployed Cloudflare Worker:

```text
sirinx-main-router
```

Routes:

```text
www.sirinx.co/* -> sirinx-main-router
sirinx.co/*     -> sirinx-main-router
```

Worker behavior:

```text
www.sirinx.co/* -> proxy to https://sirinx-co.pages.dev/*
sirinx.co/*     -> 301 redirect to https://www.sirinx.co/*
```

Worker deployment version:

```text
24262c74-d8f1-4d79-ba6d-8066763db897
```

## Permission Blocker

Current Wrangler OAuth token can:

- Deploy Cloudflare Pages
- Deploy Workers
- Create Worker routes
- Read zone identity

Current token cannot:

- Edit DNS records
- Read or edit Security Level
- Read or edit Browser Integrity Check
- Read or edit Bot Fight Mode
- Read or edit WAF/rulesets

Observed API failures:

```text
DNS create: 403 Authentication error
Security settings read: 403 Unauthorized to access requested resource
Rulesets read: 403 Authentication error
```

## Required Cloudflare Fix

In Cloudflare Dashboard for `sirinx.co`:

1. DNS:

```text
CNAME  www  sirinx-co.pages.dev  Proxied
CNAME  @    sirinx-co.pages.dev  Proxied
```

2. Security/WAF:

Create a skip or allow rule for the main website:

```text
If hostname equals www.sirinx.co
Then skip/challenge bypass for WAF managed rules, browser integrity, and bot challenge
```

Also apply to apex redirect source if needed:

```text
If hostname equals sirinx.co
Then allow redirect traffic to reach Worker/Redirect Rule
```

3. Redirect:

```text
sirinx.co/* -> https://www.sirinx.co/$1
301 preserve path and query string
```

## Preferred Final State

Use direct Pages custom domains after DNS and security are corrected:

```text
www.sirinx.co -> Cloudflare Pages project sirinx-co
sirinx.co     -> redirect to https://www.sirinx.co
```

The Worker router is an emergency bridge and can be kept or removed after Pages custom domain validation completes.
