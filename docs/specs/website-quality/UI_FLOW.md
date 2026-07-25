# Website Quality UI Flow

Status: local implementation support
Target: `apps/sirinx-site`

## Homepage Flow

1. User lands on `/`.
2. User sees SIRINX brand, solar service context, and primary CTA.
3. User can choose:
   - LINE Official CTA -> `/line`
   - Work with SIRINX -> `/contact`
   - Floating LINE group -> expands QR/Add/Chat
   - Existing inquiry behavior -> opens inquiry panel

## `/line` Flow

1. User opens `/line`.
2. User sees LINE Official trust hero.
3. User can scan QR or select Add Friend / Chat.
4. User can choose quick action:
   - ส่งบิลค่าไฟ
   - ขอประเมิน Solar Carport
   - ขอประเมิน Rooftop Solar
   - ขอ EV Charger / BESS
   - นัดสำรวจหน้างาน
5. User can review FAQ and trust paths.
6. User can continue to `/contact`, `/`, or project/service content.

## `/contact` Flow

1. User opens `/contact`.
2. User sees direct LINE, chat, and email contact options.
3. User reviews preparation checklist before sending information.
4. User sees local-only gate copy:
   - No backend customer data storage.
   - No CRM write.
   - No webhook activation.
   - Quote form, ROI calculator, CRM, webhook, and production analytics require later approval.

## `/trust-center` Flow

1. User opens `/trust-center`.
2. User sees SIRINX Trust Center with evidence-first and approval-gated operating rules.
3. User reviews what is currently safe to disclose.
4. User sees closed gates for deploy, LINE webhook, production analytics, CRM/customer data storage, and database/MongoDB writes.
5. User can continue to `/projects`, `/contact`, or `/line`.

## `/projects` Flow

1. User opens `/projects`.
2. User sees the Project Proof policy rather than fabricated project claims.
3. User reviews the proof workflow: intake, verify, approve, publish.
4. User reviews evidence requirements before any case study can go live.
5. User can continue to `/trust-center`, `/contact`, or LINE Official.

## `/quote` Flow

1. User opens `/quote` from homepage, LINE, contact, Trust Center, or Project Proof.
2. User reviews the quote preparation workflow.
3. User reviews the checklist for bill, site photos, province/service area, system type, and contact timing.
4. User sees that no quote form submit, CRM write, webhook, database write, or customer data storage is active.
5. User continues to LINE Official or contact page.

## `/roi-calculator` Flow

1. User opens `/roi-calculator`.
2. User reviews which inputs are needed before a future ROI estimate.
3. User sees that the route is not a live calculator and does not guarantee savings.
4. User can continue to `/quote`, `/trust-center`, or LINE Official for human assessment.

## Mobile Flow

1. User opens homepage on a narrow viewport.
2. A compact floating contact button is visible.
3. Tap opens a bottom sheet.
4. Sheet shows LINE Add Friend, Chat, QR, and existing inquiry path.
5. Close button hides the sheet and restores page browsing.

## Accessibility Flow

- QR images use Thai alt text: `QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX`.
- Buttons and panels expose labels and hidden states.
- Links use clear labels rather than ambiguous icon-only actions.
