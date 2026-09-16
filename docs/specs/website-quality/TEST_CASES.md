# Website Quality Test Cases

Status: local implementation support
Target: `apps/sirinx-site`

## Static Checks

Command:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
```

Expected:
- Build output includes homepage, `/line`, `/contact`, `styles.css`, `app.js`, `_headers`, `_redirects`, `robots.txt`, and sitemap.
- Build output includes `/trust-center` and `/projects`.
- Build output includes `/quote` and `/roi-calculator`.
- LINE config values match canonical data.
- Homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` include canonical, Open Graph URL, Open Graph image, Twitter image, robots, theme color, and JSON-LD metadata.
- `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` include `BreadcrumbList` JSON-LD with homepage as position 1 and the current route as position 2.
- `/line` includes `FAQPage` JSON-LD for the five visible FAQ questions and answers on the page.
- Required professional solar marketing copy exists for homepage positioning, LINE contact, project information readiness, ROI assumptions, trust gates, and project evidence policy.
- Required homepage, `/line`, `/contact`, CSS, and JS snippets exist.
- QR images include explicit dimensions, square aspect ratio, and preload or fetch-priority hints where visible.
- QR images include fallback copy for CDN load failure.
- Floating contact controls include `aria-controls` and `aria-expanded` wiring.
- Built homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` each include the floating contact cluster with LINE QR, Add Friend, Chat, mobile tray, and existing website inquiry path.
- Built pages include Thai document language, skip link, main target, labeled navigation, current-page nav state on subpages, image alt text, and stable image width/height attributes.
- Built subpage navigation uses the homepage-aligned labels and order: `ผลงาน`, `Trust`, `Quote`, `ROI`, `ติดต่อ`, `LINE`; legacy labels such as `หน้าแรก`, `ความสามารถ`, `ขอใบเสนอราคา`, `Trust Center`, and `LINE Official` do not return inside subpage nav.
- Required tracking placeholders exist as no-op/local event names only.
- Sitemap includes `/line` and `/contact`.
- No secret-like patterns are found in built static assets.

## Negative Closed-Gate Checks

Commands:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
pnpm --filter @sirinx/site test:server
pnpm --filter @sirinx/site test:closed-gates
```

Expected:
- Built pages do not include `<form>`, `method=`, or `action=` submit surfaces.
- Built pages do not link to `/api/` endpoints from `href`, `src`, or `action` attributes.
- Built pages do not load third-party scripts from `http://` or `https://` script sources.
- Built JavaScript does not use `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`.
- Built JavaScript does not call `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `navigator.sendBeacon`.
- Built JavaScript does not include production analytics SDK calls or Supabase/MongoDB runtime wiring.
- LINE links and QR image URLs are allowed as static outbound contact links only.
- Local preview server injects the floating contact cluster into source HTML routes that do not include it and does not duplicate the homepage cluster.
- Unit tests prove representative forbidden form, API, third-party script, storage, network, analytics, Supabase, and MongoDB examples are rejected.

## Browser UAT

Command:

```bash
pnpm --filter @sirinx/site test:line
```

Expected:
- Homepage loads on desktop and mobile.
- Homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` expose canonical SEO/AEO metadata on desktop and mobile.
- `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` expose breadcrumb JSON-LD route context.
- `/line` exposes FAQPage JSON-LD that matches visible FAQ copy.
- `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator` expose `aria-current="page"` on the current navigation item.
- `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator` render homepage-aligned navigation labels in the same order on desktop and mobile.
- Navigation LINE CTA is visible.
- Hero LINE CTA routes to `/line`.
- Work with SIRINX CTA routes to `/contact`.
- `/line` route includes QR, quick actions, trust links, FAQ, and final CTAs.
- `/line` and `/contact` visible QR images expose stable width and height attributes.
- `/line` QR fallback copy appears when the QR image enters an error state.
- `/contact` route includes LINE, email, prep checklist, and closed backend gates.
- `/trust-center` route includes evidence-first trust content and closed production gates.
- `/projects` route includes project-proof policy without fabricated case studies.
- `/quote` route includes quote preparation guidance without form submit or customer data storage.
- `/roi-calculator` route includes ROI input guidance without live calculation or guaranteed savings claims.
- `/quote` no-storage readiness validator updates status from `(0/5)` to ready copy without form submit or localStorage.
- `/roi-calculator` no-storage readiness validator updates status from `(0/4)` to ready copy without live calculation, analytics, or CRM write.
- `/quote` and `/roi-calculator` readiness interactions leave `localStorage` and `sessionStorage` counts unchanged.
- Footer includes LINE CTA.
- Floating desktop LINE panel opens and closes.
- Floating contact cluster is available from built route pages, not only the homepage.
- Floating desktop LINE and inquiry controls update `aria-expanded` when panels open and close.
- Existing inquiry path remains available.
- Mobile contact sheet opens and closes with scannable QR and `aria-expanded` updates.
- Mobile contact sheet uses transform-based motion when opened.
- LINE and quote CTAs carry no-op tracking placeholders without production analytics.
- Current expected result: `82 passed` across desktop and mobile projects.
- Local preview server regression expected result: `2 passed`.

## Repo Hygiene

Commands:

```bash
git diff --check
rg -n --hidden -S "(sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|xox[baprs]-|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----|mongodb(\\+srv)?://[^[:space:]]+)" apps/sirinx-site docs/website docs/specs docs/runbooks
```

Expected:
- `git diff --check` exits `0`.
- Secret scan exits `1` with no matches.

## Night Watch

Command:

```bash
pnpm night-watch
```

Expected:
- Read `.hermes/logs/night-watch-latest.md`.
- If Final Status is `WARN`, record the diagnosis and stop for approval.
- Do not restart services unless the operator explicitly approves that action.
