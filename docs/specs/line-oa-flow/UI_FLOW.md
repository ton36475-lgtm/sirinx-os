# LINE Official Account UI Flow

Status: local implementation support
Target: `apps/sirinx-site`

## Desktop Floating Flow

1. User opens homepage.
2. Floating contact cluster appears in the bottom-right area.
3. User can choose:
   - LINE button: opens LINE panel.
   - Existing inquiry button: opens inquiry panel.
4. LINE panel shows display name, LINE ID, QR, Add Friend, and Chat.
5. User closes LINE panel and returns to page.

## Mobile Floating Flow

1. User opens homepage on mobile.
2. Compact contact trigger appears.
3. User taps trigger.
4. Bottom sheet opens with LINE Add Friend, Chat, QR, and inquiry path.
5. User closes bottom sheet with accessible close button.

## Dedicated `/line` Flow

1. User lands on `/line`.
2. User sees trust hero and main LINE card.
3. User scans QR or taps Add Friend / Chat.
4. User selects quick action copy that matches their intent.
5. User reviews FAQ and continues to quote/contact/project routes.

## Dedicated `/contact` Flow

1. User lands on `/contact`.
2. User sees LINE and email options.
3. User reviews what to prepare.
4. User understands the static site stores no customer data.

## Failure Handling

- If JS fails, static links still work.
- If QR image fails, Add Friend and Chat links remain visible.
- If external LINE targets are unavailable, the static website still shows ID and short link.
