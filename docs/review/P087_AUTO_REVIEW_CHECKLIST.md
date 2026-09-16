# P087 Auto Review Checklist

## Static Safety

- Detect live-send code paths.
- Detect deploy or Cloudflare mutation commands.
- Detect secret-like strings.
- Confirm no customer data write path is introduced.

## Browser Evidence

- Load `/`, `/line/`, `/contact/`, `/projects/`, `/trust-center/`, `/quote/`, `/roi-calculator/`.
- Capture screenshots for `390x844`, `430x932`, `768x1024`, and `1440x1024`.
- Check route HTTP status.
- Check console errors.
- Check read-only network behavior.
- Check horizontal overflow.
- Check skip-link and `main#main`.

## LINE / QR / Inquiry

- Confirm QR image reference exists.
- Confirm Add Friend target exists.
- Confirm Chat target exists without clicking or sending.
- Confirm `/contact` or inquiry path remains present.

## Artifact Requirements

- `auto_review_result.json`
- `auto_review_receipt.json`
- screenshot set
- console event log
- network event log
- SHA-256 recorded for artifacts

