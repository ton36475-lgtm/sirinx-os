# www.sirinx.co Main Website Incident

Status: Resolved for primary host
Date: 2026-05-16

## User Report

The main website showed an error on `www.sirinx.co`.

## Final State

Primary website:

```text
https://www.sirinx.co -> HTTP 200
```

Apex domain:

```text
https://sirinx.co -> HTTP 301 -> https://www.sirinx.co/
```

Stable Pages URL:

```text
https://sirinx-co.pages.dev -> HTTP 200
```

The previous Cloudflare managed challenge response is no longer returned for the primary host.

## Root Cause

The Pages project was healthy, but custom-domain traffic was blocked before it could reach the Pages deployment or Worker router.

Contributing issues found during remediation:

- `www.sirinx.co` had an old R2 custom domain binding.
- DNS for `www` was not pointing cleanly at the Pages project.
- Cloudflare zone security controls were issuing a managed challenge before the Worker response could complete.

## Actions Completed

Removed stale R2 custom domain binding:

```text
Bucket: 0000000001
Domain removed: www.sirinx.co
```

Created DNS record:

```text
CNAME  www  sirinx-co.pages.dev  Proxied  Auto TTL
```

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

Disabled zone controls that were not required for the static primary site:

```text
Bot Fight Mode: off
Browser Integrity Check: off
```

Created active Cloudflare Security custom rule:

```text
Name: Allow main website to reach Pages
Expression: (http.host eq "www.sirinx.co" or http.host eq "sirinx.co")
Action: Skip
Logging: enabled
Skipped components:
- All Super Bot Fight Mode Rules
- Browser Integrity Check
- Security Level
```

## Verification

Edge-pinned checks:

```text
curl --resolve www.sirinx.co:443:104.21.55.228 -I https://www.sirinx.co -> HTTP/2 200
curl --resolve www.sirinx.co:443:172.67.173.204 -I https://www.sirinx.co -> HTTP/2 200
```

Response indicator:

```text
x-sirinx-router: main-www
```

Public DNS checks:

```text
dig @1.1.1.1 www.sirinx.co A +short -> 104.21.55.228, 172.67.173.204
dig @8.8.8.8 www.sirinx.co A +short -> 172.67.173.204, 104.21.55.228
```

DoH check:

```text
curl --doh-url https://cloudflare-dns.com/dns-query -I https://www.sirinx.co -> HTTP/2 200
```

Content check:

```text
<title>SIRINX - Cloudflare Ready</title>
Live on the primary www domain.
Production check: 5 ready, 0 blocking
```

Latest Pages deployment after production-copy refresh:

```text
https://ffaafed5.sirinx-co.pages.dev
```

Cloudflare Pages custom domain status:

```text
www.sirinx.co -> active
sirinx.co     -> pending
```

## Remaining Follow-Up

Monitor `sirinx.co` Pages custom domain validation until it becomes active. The apex route is already served by the Worker as a 301 redirect to `https://www.sirinx.co/`, so this is not blocking the primary website.

Keep the Worker router until both custom domains are stable and a later change explicitly removes the bridge.
