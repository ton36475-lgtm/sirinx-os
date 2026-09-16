# Website Quality FRD

Status: local implementation support
Target: `apps/sirinx-site`

## Functional Requirements

### WQ-FR-001 Homepage CTA

The homepage must expose clear paths to:
- LINE Official contact.
- Dedicated contact page.
- Existing inquiry/contact behavior.

Acceptance:
- A visible CTA links to `/line`.
- The primary work/contact CTA links to `/contact`.
- Existing floating inquiry behavior remains functional.

### WQ-FR-002 Contact Route

The website must provide `/contact` as a static route.

Acceptance:
- `/contact` has canonical metadata.
- It includes LINE Official Add Friend and Chat CTAs.
- It includes email contact.
- It includes a preparation checklist for quote assessment.
- It states backend gates are closed: no CRM write, no webhook, no customer data storage.

### WQ-FR-003 LINE Route

The website must provide `/line` as a static trust and conversion route.

Acceptance:
- `/line` includes QR, Add LINE, Chat, LINE ID, short link, quick actions, trust links, FAQ, and final CTAs.
- `/line` does not claim fake reviews, ratings, or unverified certifications.

### WQ-FR-004 Floating Contact

The homepage must include a floating contact cluster.

Acceptance:
- Desktop shows LINE contact group beside existing inquiry behavior.
- Mobile uses a compact trigger and bottom sheet.
- QR can be viewed without permanently covering mobile content.

### WQ-FR-005 SEO/AEO

Static metadata must be safe and truthful.

Acceptance:
- Homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` include title, description, canonical, Open Graph URL, Open Graph image, Twitter card image, robots, theme color, and structured context where safe.
- `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` include safe `BreadcrumbList` JSON-LD that maps each page back to the homepage.
- `/line` includes safe `FAQPage` JSON-LD that matches the visible LINE FAQ content exactly and does not add claims that are not visible on the page.
- Customer-facing copy must use professional solar assessment language: site data, electricity bill, load profile, assumptions, ROI range, evidence, and closed production gates.
- Sitemap includes every active static website route.
- Social preview image metadata uses only the approved solar carport image or the approved LINE QR image.
- No fake review schema, fake ratings, or unverified certification claims.

### WQ-FR-006 Verification

Local verification must prove route, CTA, and QR behavior.

Acceptance:
- Static site check enforces required snippets.
- Static site check enforces safe SEO/AEO copy, route metadata, breadcrumb schema on subpages, and LINE FAQ schema.
- Static site check enforces baseline accessibility and image stability: Thai language, skip link, main target, labeled navigation, current-page nav state, image alt text, and image width/height.
- Static site check enforces homepage-aligned subpage navigation labels and order so legacy mixed navigation copy does not return.
- Desktop/mobile Playwright tests cover homepage, `/line`, `/contact`, floating contact, and mobile sheet.
- `git diff --check` passes.
- Scoped secret-pattern scan has no matches.

### WQ-FR-007 Trust Center Route

The website must provide `/trust-center` as a static trust route.

Acceptance:
- `/trust-center` has canonical metadata and safe structured context.
- It documents evidence-first claims, approval before automation, scoped customer data, and rollback boundaries.
- It lists closed gates for deploy, LINE webhook, production analytics, CRM/customer data storage, and database/MongoDB writes.
- It does not claim fake reviews, fake ratings, or unverified certifications.

### WQ-FR-008 Project Proof Route

The website must provide `/projects` as a static project-proof route.

Acceptance:
- `/projects` has canonical metadata and safe structured context.
- It explains the project proof workflow: intake, verify, approve, publish.
- It documents evidence requirements before case studies are published.
- It avoids fabricated project names, customer details, photos, ratings, reviews, or performance outcomes.
- It includes a clear LINE/contact CTA for assessment requests.

### WQ-FR-009 Quote Readiness Route

The website must provide `/quote` as a static quote-preparation route.

Acceptance:
- `/quote` has canonical metadata and safe structured context.
- It explains the quote preparation workflow without creating a production submit endpoint.
- It lists required preparation inputs such as electricity bill, site photos, service area, project type, and contact timing.
- It clearly states no quote form submit, CRM write, webhook, database write, or customer data storage occurs from the page.

### WQ-FR-010 ROI Readiness Route

The website must provide `/roi-calculator` as a static ROI-preparation route.

Acceptance:
- `/roi-calculator` has canonical metadata and safe structured context.
- It explains required ROI inputs and assumption disclosure.
- It clearly states there is no live ROI calculation, no guaranteed savings claim, no lead capture form, no CRM/customer data storage, and no production analytics.

## Nonfunctional Requirements

- Local-only by default.
- No external writes.
- No package install unless explicitly approved.
- No production analytics connection.
- No LINE webhook connection.
- No customer data persistence.
- Mobile-first layout.
- No major layout shift from QR images.
- Accessible labels for QR and contact controls.
