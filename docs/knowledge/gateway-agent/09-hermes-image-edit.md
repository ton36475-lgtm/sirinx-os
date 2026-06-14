# Hermes Image-to-Image Gateway Patch

Status: local-only caption-bound contract

## Contract

Hermes must treat a same-message image plus caption as a true image edit request:

- Preserve the uploaded image as `image_ref`.
- Use the caption as the edit instruction.
- Route to `image_edit`.
- Block text-to-image fallback when a source image exists.
- Fail closed if the provider cannot expose true image edit.

## Operator Rule

Send the image and instruction together in one image caption. If the image and instruction are split across turns, Hermes must not bind stale image state and should ask for a caption-bound resend.

## Local-Only Boundary

This phase adds API, tests, dashboard status, and docs only. It does not run a live provider call, switch providers, read secrets, send Telegram/LINE, run MCP, deploy, push, publish, or restart the gateway automatically.

## Acceptance Driver

Mission Control must expose an Image Edit Acceptance Packet before any manual gateway restart:

- `patch_ready=true`
- `gateway_restart_required=true`
- `caption_required=true`
- `provider_edit_capability=needs_manual_probe`
- `text_to_image_fallback=blocked`

The acceptance dry-run endpoint can prepare the packet and checklist, but it cannot call the provider, print OAuth tokens, restart Hermes, send Telegram/LINE, activate connectors, run MCP, deploy, push, or publish.

## Manual Test

Use one controlled test after the operator manually restarts the gateway:

```text
Input image: food on black plate
Caption: change only the plate from black to white
Expected: same food, same framing, same composition, only plate color changes
```

Evidence fields:

- Source image present
- Caption bound in same event
- `image_ref` preserved
- `image_edit` selected
- `image_generate` not selected
- Result reviewed by human

## Verification

```bash
pnpm hermes-image-edit:test
pnpm hermes-inbox:test
pnpm gateway-agent:test
pnpm audit:secrets
```
