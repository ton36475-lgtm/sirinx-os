# AGM Creative Media Platform

Status: local scaffold, not deployed.

## Scope

`apps/agm-site` is the public-facing AGM Alpha Gene Record Media creative platform scaffold. It covers:

- Hero 3D AGM Core
- Identity
- Channel YouTube
- Artist Talent
- Releases
- Videos
- News
- Partner Grid
- Roadmap
- Founder CTA
- Academy

## Brand Lock

AGM uses a premium dark music-label aesthetic: black and charcoal base, violet-blue accents, minimalist AGM logo, editorial hero typography, and a 3D abstract AGM/arrow core visual. It is an original scaffold inspired by the locked style direction and does not copy any external website.

## Public Safety

- No backend details in public visuals.
- No unverifiable ranking, revenue, or streaming claims.
- No customer data, private paths, tokens, keys, or internal URLs.
- Public launch still requires owner approval, brand review, and privacy review.

## Local Commands

```bash
pnpm --filter @agm/site build
pnpm --filter @agm/site check
pnpm --filter @agm/site test:smoke
```

## Evidence

Browser smoke writes local screenshots to:

- `docs/creative/agm-site-mobile.png`
- `docs/creative/agm-site-desktop.png`

Lighthouse was not run because the local binary is not installed and this packet does not allow installs. The smoke test records a local no-external-request performance proxy instead.
