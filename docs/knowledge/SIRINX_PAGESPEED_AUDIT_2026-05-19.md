# SIRINX PageSpeed Audit - 2026-05-19

## Scope
- Target: `https://www.sirinx.co`
- Coverage: sitemap health for all 90 live URLs, Lighthouse mobile/desktop for 14 representative public routes, targeted retest for `projects` and `pricing`.
- Guardrail: homepage live background files were not modified. `Home.tsx`, `HeroSlideshow.tsx`, and homepage background assets were not edited.

## Commits And Deployments
- `86ef0e4 perf: optimize page speed and SEO canonicals`
- `2d5270a fix: polish pagespeed follow-up`
- Cloudflare Pages production deploys:
  - `https://ac25cb74.sirinx-co.pages.dev`
  - final: `https://fdacecc8.sirinx-co.pages.dev`

## Changes Implemented
- Added Cloudflare Image Resizing helper for remote CloudFront images.
- Replaced oversized remote image delivery on Solar Carport, Projects, Pricing, Assessment, Strategy, About, Solutions, Industries, and Investment pages with resized `cdn-cgi/image` URLs and responsive `srcSet`.
- Removed global hero image preload from every route and replaced it with route-specific static preload injection.
- Updated sitemap and canonical URLs to use final trailing-slash URLs.
- Fixed accessibility issues from Lighthouse:
  - Contact select controls now have accessible names.
  - Strategy icon-only controls now have accessible labels.
  - Assessment step/result tab controls now have accessible labels.
  - Pricing range inputs now have accessible labels and non-semantic subhead labels no longer break heading order.

## Test Results
- `corepack pnpm run check`: passed.
- `corepack pnpm run test`: passed, 16 files and 166 tests.
- `corepack pnpm run build`: passed, 90 SEO routes and 77 province routes generated.
- Live sitemap health: 90/90 URLs returned 200, 0 redirects from sitemap URLs, 0 failures.
- Cloudflare resized image smoke: `cdn-cgi/image` returned 200 and reduced representative carport image from about 422 KB to about 45 KB at width 640.
- Live screenshots verified:
  - `/tmp/sirinx-final-home-desktop-loaded.png`
  - `/tmp/sirinx-final-home-mobile-loaded.png`
  - `/tmp/sirinx-final-home-solution-desktop-loaded.png`

## Lighthouse Summary
- SEO remained 100 across tested pages.
- Accessibility is 100 on the targeted retest for `projects` and `pricing`; earlier non-100 findings on contact/strategy/assessment were fixed.
- Major network wins:
  - `solar-carport` mobile total weight: about 1,795 KiB to 550 KiB.
  - `projects` desktop total weight: about 8,676 KiB to about 1,053 KiB.
  - `assessment` mobile total weight: about 2,529 KiB to about 402 KiB.
  - `pricing` desktop total weight: about 2,174 KiB to about 630 KiB.
- Final targeted Lighthouse:
  - `projects` mobile: Performance 40, Accessibility 100, SEO 100.
  - `projects` desktop: Performance 74, Accessibility 100, SEO 100.
  - `pricing` mobile: Performance 32, Accessibility 100, SEO 100.
  - `pricing` desktop: Performance 65, Accessibility 100, SEO 100.

## Remaining External Gate
Mobile Lighthouse is still dominated by Cloudflare challenge JavaScript:
- Example `pricing` mobile bootup: `/cdn-cgi/challenge-platform/scripts/jsd/main.js` consumed about 7.36 s scripting time.
- This is not app bundle code and cannot be fixed safely in the repo.
- Next approval gate: review Cloudflare Bot Fight Mode / JavaScript Detections / WAF challenge settings for public marketing routes. Any security rule change must be explicit and reversible.

## Next Action
Open Cloudflare security/performance configuration review for `www.sirinx.co` and decide whether to skip JavaScript detections for public static marketing paths while keeping protection for admin/API routes.

## Follow-Up Pass - Mobile First Paint And Challenge Mitigation

Date: 2026-05-19

### Commits And Deployments
- `c26199f perf: improve mobile first paint`
- `41dced7 perf: restrict public scripts to assets`
- Cloudflare Pages production deployment: `70e67cd5-b3c9-4d29-af31-5008af0e6517`
- Production URL: `https://70e67cd5.sirinx-co.pages.dev`

### Changes Implemented
- Added static first-paint shells for `/` and `/home-solution/` so meaningful hero content exists before React hydration.
- Added local responsive AVIF/JPG variants for the main Solar Carport hero.
- Recompressed Home Solution responsive images.
- Updated route hero preload to mobile-first 960px AVIF selection.
- Reduced Google Fonts requested weights.
- Deferred Floating Chat and Toaster payloads until user interaction; the lightweight AI Avatar launcher still appears immediately.
- Kept global live energy background and AI avatar watermark active while reducing selected mobile animation layers.
- Updated CSP script policy to allow production `/assets/` scripts and Cloudflare Insights while preventing Cloudflare JavaScript Detection from executing on public marketing pages.

### Verification
- `git diff --check`: passed.
- `corepack pnpm check`: passed.
- `corepack pnpm test`: passed, 17 files and 174 tests.
- `corepack pnpm build`: passed, 94 SEO routes and 77 province routes generated.
- Live smoke passed for `/`, `/solar-carport/`, `/assessment/`, `/projects/`, `/pricing/`, `/contact/`, and `/home-solution/`.
- Live checks confirmed no horizontal overflow, robots `index, follow`, live energy/avatar present, main runtime loaded, AI Avatar chat opens, and `challengeLoaded=false`.

### Final Lighthouse Snapshot
- Homepage mobile: Performance 76, Accessibility 100, Best Practices 92, SEO 100, FCP 3.2s, LCP 4.9s, TBT 30ms, CLS 0.
- Home Solution mobile: Performance 77, Accessibility 100, Best Practices 92, SEO 100, FCP 3.3s, LCP 4.4s, TBT 10ms, CLS 0.
- Homepage desktop: Performance 59, Accessibility 100, Best Practices 92, SEO 100, TBT 10ms, CLS 0.

### Remaining Follow-Up
- Desktop LCP is still image/font timing dominated in lab runs and can be tuned separately.
- Cloudflare Bot Management should still be reviewed officially when dashboard/API write permission is available; current production mitigation is CSP-based and reversible.
