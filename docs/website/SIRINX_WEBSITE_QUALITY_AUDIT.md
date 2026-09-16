# SIRINX Website Quality Audit

## Current Architecture
- **Type**: Static HTML/CSS/JS (no framework)
- **Build**: Custom build script -> /dist folder
- **Hosting**: Cloudflare Pages (wrangler.jsonc config)
- **Structure**: src/ -> build -> dist/

## Page Inventory

| Page | Source | Purpose |
| --- | --- | --- |
| Homepage | `apps/sirinx-site/src/index.html` | Live-index-aligned Solar Carport positioning, project proof, LINE CTA, and quote path |
| `/line` | `apps/sirinx-site/src/line/index.html` | LINE Official landing page with QR, Add Friend, Chat, quick actions, trust links, FAQ, and CTA |
| `/contact` | `apps/sirinx-site/src/contact/index.html` | Contact route with LINE QR, email path, preparation checklist, and no backend form storage |
| `/projects` | `apps/sirinx-site/src/projects/index.html` | Evidence-first project proof policy without fabricated case studies |
| `/trust-center` | `apps/sirinx-site/src/trust-center/index.html` | Trust gates, evidence policy, and blocked production integration disclosure |
| `/quote` | `apps/sirinx-site/src/quote/index.html` | Quote readiness route without customer data collection or CRM write |
| `/roi-calculator` | `apps/sirinx-site/src/roi-calculator/index.html` | Browser-only ROI estimate route without guaranteed savings claims, form submit, storage, network call, or CRM write |

## Existing Features ✅

### LINE Integration
- ✅ `/line` route มีอยู่แล้ว (224 บรรทัด)
- ✅ `/contact` route มีอยู่แล้ว พร้อม LINE Official CTA, email CTA, และ no-backend gate copy
- ✅ `/trust-center` route มีอยู่แล้ว พร้อม evidence-first trust content และ closed production gates
- ✅ `/projects` route มีอยู่แล้ว พร้อม project-proof policy โดยไม่สร้าง case study ปลอม
- ✅ `/quote` route มีอยู่แล้วแบบ readiness page โดยไม่มี form submit หรือ data storage
- ✅ `/roi-calculator` route มี browser-only ROI estimate แล้ว โดยไม่มี guaranteed savings claim, form submit, storage, network call หรือ CRM write
- ✅ LINE QR Code แสดงผลได้
- ✅ LINE CTA มีใน navigation
- ✅ LINE CTA มีใน hero section
- ✅ LINE CTA มีใน footer
- ✅ LINE CTA มีใน contact section
- ✅ Sitemap includes `/line` and `/contact`
- ✅ FloatingContactCluster มีอยู่ (desktop + mobile)
- ✅ Open/close LINE panel ทำงาน
- ✅ Mobile bottom sheet ทำงาน

### Website Bot
- **หน้าที่**: Inquiry panel (ไม่ใช่ bot แต่เป็น contact form alternative)
- **ทำงานแล้ว**: ✅
- **ทำแล้ว**: Desktop inquiry button, mobile sheet

## Existing Bot Location And Behavior

- Existing website bot equivalent: `#inquiry-panel` in `apps/sirinx-site/src/_partials/floating-contact.html`
- Trigger: `#inquiry-trigger`
- Location: Floating contact cluster beside the LINE Official mini button on desktop and inside the mobile contact sheet on mobile
- Behavior: Opens a local website inquiry panel with project-start links for Solar Carport, Rooftop Solar, LINE QR, and email contact
- Preservation boundary: The inquiry path stays local-only and must still be manually checked in a browser before deploy approval

## Component Inventory

| Component | Path | Status |
|----------|------|--------|
| FloatingContactCluster | inline HTML in index.html | ✅ Complete |
| LINE Panel | #line-panel | ✅ Complete |
| Inquiry Panel | #inquiry-panel | ✅ Complete |
| Mobile Panel | #mobile-panel | ✅ Complete |
| LINE Card (line/index.html) | inline | ✅ Complete |
| Contact Page | contact/index.html | ✅ Complete |
| Trust Center Page | trust-center/index.html | ✅ Complete |
| Project Proof Page | projects/index.html | ✅ Complete |
| Quote Readiness Page | quote/index.html | ✅ Complete |
| ROI Readiness Page | roi-calculator/index.html | ✅ Complete |

## UX Issues Found
1. ✅ `/quote` และ `/roi-calculator` มี no-storage readiness validator แบบ browser-only แล้ว
2. ✅ มี QR image error fallback ถ้า LINE CDN โหลดไม่ได้
3. Lead-capture form production ยังไม่เปิดจนกว่าจะอนุมัติ CRM/customer-data gate

## Mobile Issues
1. ปุ่ม contact อาจซ้อนกับ cookie banner (ถ้ามี)
2. ✅ QR image ใช้ explicit width/height และ aspect-ratio เพื่อลด CLS

## Trust Gaps
- ✅ มี Trust Center page แบบ static/local-only
- ✅ มี Project Proof page แบบ evidence-first โดยไม่สร้างข้อมูลโครงการปลอม
- ❌ ไม่มี Customer testimonials (ยกเว้น claim ที่ไม่ได้รับการยืนยัน)

## Lead-Capture Gaps
- ✅ /line route ครบ
- ✅ /contact route ครบแบบ local-only ไม่มี backend/CRM/webhook write
- ✅ quote / CRM future-readiness specs prepared as local-only architecture notes
- ✅ /quote readiness route ครบแบบ static ไม่มี quote form submit
- ✅ /roi-calculator route มี browser-only estimate ไม่มี guarantee, form submit, storage, network call หรือ CRM write
- ✅ /quote และ /roi-calculator มี checklist validator ที่ไม่ submit form, ไม่ใช้ localStorage, ไม่เขียน CRM, และไม่ส่งข้อมูลออกจาก browser
- ✅ no-op tracking placeholders ครบสำหรับ LINE, quote CTA, contact cluster, และ website inquiry path โดยไม่มี production analytics endpoint
- ❌ ไม่มี lead capture form

## SEO/AEO Status
| Element | Status |
|---------|--------|
| Title | ✅ Good |
| Description | ✅ Good |
| Open Graph | ✅ Present |
| Schema.org | ✅ Organization schema |
| Canonical | ✅ Present |
| Sitemap | ✅ Present |
| Robots.txt | ✅ Present |

## Performance Risks
- ✅ QR image บน `/line` และ `/contact` มี preload + `fetchpriority="high"`
- ✅ Mobile sheet ใช้ `translate3d` และ `will-change: transform` สำหรับ animation

## Security Risks
- ✅ ไม่มี secret ใน static assets
- ✅ ไม่มี inline script ที่อันตราย
- ✅ rel="noopener noreferrer" ใช้ครบ
- ✅ Static checker now blocks form submit surfaces, `/api/` endpoint links, third-party scripts, browser storage, browser network calls, production analytics SDKs/beacons, Supabase runtime wiring, and MongoDB connection strings before approval gates are opened

## Safe Implementation Plan
1. ✅ เพิ่ม aspect-ratio ให้ QR images
2. ✅ เพิ่ม preload สำหรับ QR image
3. ✅ เพิ่ม aria-expanded ให้ปุ่มเปิด/ปิด panel
4. ✅ เพิ่ม QR fallback state ถ้า LINE QR โหลดไม่ได้
5. ✅ เพิ่ม transform-based mobile sheet animation
6. ✅ สร้าง website-quality spec pack
7. ✅ สร้าง line-oa-flow spec pack
8. ✅ สร้าง website และ LINE runbooks
9. ✅ สร้าง quote / ROI / CRM future-readiness spec pack แบบ local-only
10. เตรียม quote form skeleton หลังอนุมัติ implementation gate
11. เตรียม ROI calculator skeleton หลังอนุมัติ implementation gate
12. ✅ สร้าง Trust Center page (ไม่แสดง review ปลอม)
13. ✅ สร้าง Project Proof page (ไม่แสดง project data ที่ยังไม่ได้ยืนยัน)
14. ✅ สร้าง Quote readiness page (ไม่มี form submit/customer data storage)
15. ✅ สร้าง ROI calculator แบบ browser-only พร้อม disclaimer และไม่มี guaranteed savings
16. ✅ เพิ่ม no-storage readiness validator ให้ `/quote` และ `/roi-calculator`
17. ✅ เพิ่ม negative closed-gate checks ให้ static checker สำหรับ form/API/storage/network/analytics/Supabase/MongoDB runtime paths
18. ✅ เพิ่ม closed-gate regression unit tests สำหรับตัวอย่าง form/API/script/storage/network/analytics/Supabase/MongoDB ที่ต้องถูกปฏิเสธ

## Governance Artifacts

- Website quality specs: `docs/specs/website-quality/`
- LINE OA flow specs: `docs/specs/line-oa-flow/`
- Quote / ROI / CRM readiness specs: `docs/specs/quote-roi-crm-readiness/`
- Website quality runbook: `docs/runbooks/SIRINX_WEBSITE_QUALITY_RUNBOOK.md`
- LINE integration runbook: `docs/runbooks/LINE_OFFICIAL_WEBSITE_INTEGRATION_RUNBOOK.md`
- Static checker now requires these docs and key safety snippets.

## Future-Ready Architecture Notes

- Quote form: documented only; no production submit endpoint.
- ROI calculator: documented only; no guaranteed savings claim or production release.
- Lead CRM: documented only; no CRM/customer data storage.
- PDF proposal: documented only; no customer-data PDF generation or send.
- LINE rich menu / automation / webhook: documented only; no webhook activation or live send.
- Analytics events: no-op/local placeholders only; no production analytics endpoint.
- Stagehand UAT / CRUD verifier: documented only; no browser automation beyond existing local Playwright UAT and no database write.
- Trust Center / product catalog / project proof CMS: documented only; no fake reviews, ratings, certifications, or unverifiable project data.

## Rollback Plan
- Keep git commit history
- Revert index.html + line/index.html + contact/index.html + trust-center/index.html + projects/index.html + quote/index.html + roi-calculator/index.html + CSS/JS changes
- Remove added static routes from public/sitemap.xml
- No database changes needed (static site)

## Test Results
```
pnpm --filter @sirinx/site test:line -> 106 passed
pnpm --filter @sirinx/site test:closed-gates -> 3 passed
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check -> sirinx-site check passed for 18 files
git diff --check -> passed
scoped secret-pattern scan -> no matches
spec/runbook/governance file count -> 27 files
```

---
*Audit Date: 2026-07-03*
*Classification: SAFE - Static Site*
