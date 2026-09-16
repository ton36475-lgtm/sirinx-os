# Quote ROI CRM Readiness UI Flow

Status: future-ready local specification
Target: SIRINX website

## Future Quote Flow

1. User enters from homepage, `/contact`, `/line`, footer, or floating contact.
2. User chooses a project type:
   - Solar Carport
   - Rooftop Solar
   - BESS
   - EV Charger
   - AI Energy Management
3. User reviews what to prepare:
   - Electricity bill.
   - Site photos.
   - Province or location area.
   - Usage profile.
4. Until the form is approved, the UI routes the user to LINE Official or email.
5. After approval, a future form may collect synthetic/local test data first, then production customer data only after a separate gate.

## Future ROI Flow

1. User selects monthly electricity bill range.
2. User selects daytime usage pattern.
3. User selects project type and optional BESS/EV interest.
4. UI displays estimate range and disclaimer.
5. User can request engineering review through LINE Official or future quote flow.

## Future CRM Review Flow

1. Lead payload is created from approved quote flow only.
2. Payload is validated and redacted for logs.
3. Human review confirms consent and source.
4. CRM write occurs only after exact approval.
5. Local evidence receipt records what happened without exposing sensitive fields.

## Future LINE Automation Flow

1. User adds LINE Official.
2. Rich menu presents assessment paths.
3. Webhook receives message only after separate approval.
4. Automation drafts response.
5. Human approval is required before live customer send unless a future approved policy allows a narrow automated reply.

## Future Trust Content Flow

1. Admin creates product, project proof, or Trust Center item.
2. Item requires evidence source and review status.
3. Site displays only approved, truthful content.
4. No fake reviews, ratings, certifications, or unverifiable project outcomes are shown.
