# Hermes Image-to-Image Gateway Grid

Status: LOCAL-ONLY IMAGE EDIT CONTRACT

```mermaid
flowchart LR
  INPUT["Image + caption in same message"] --> BIND["Bind caption to source image"]
  BIND --> REF["Preserve original image_ref"]
  REF --> ROUTE["Route to image_edit tool"]
  ROUTE --> PROVIDER{"Provider supports edit?"}
  PROVIDER -->|"yes"| EDIT["True image-to-image edit"]
  PROVIDER -->|"no"| CLOSED["Fail closed: edit unavailable"]

  INPUT -. "separate text after image" .-> RESEND["Ask user to resend image with caption"]
  ROUTE -. "blocked" .-> TXT2IMG["No image_generate fallback"]

  EDIT --> VERIFY["Verify same framing / same composition"]
  CLOSED --> STOP["STOP - waiting for provider support / approval"]
  VERIFY --> STOP

  subgraph ACCEPT["Acceptance Driver"]
    PACKET["Mission Control Acceptance Packet"]
    PROBE["Provider edit capability: needs_manual_probe"]
    RESTART["Manual gateway restart checklist"]
    EVIDENCE["Evidence: image_ref / caption / image_edit / human review"]
  end

  ROUTE --> PACKET
  PACKET --> PROBE
  PACKET --> RESTART
  PACKET --> EVIDENCE
  EVIDENCE --> STOP

  classDef safe fill:#eef7f0,stroke:#1f7a4d,color:#17201b
  classDef block fill:#fff0f0,stroke:#b73838,color:#17201b
  class INPUT,BIND,REF,ROUTE,EDIT,VERIFY,PACKET,PROBE,RESTART,EVIDENCE safe
  class CLOSED,TXT2IMG,RESEND,STOP block
```

## Acceptance

- Valid: food photo on a black plate with caption `change only the plate from black to white`.
- Expected route: `image_edit(prompt, image_ref)`.
- Expected result contract: same food, framing, and composition; only the plate color changes.
- Blocked route: describing the image and calling text-to-image generation.

## Acceptance Packet

- `patch_ready=true`
- `gateway_restart_required=true`
- `caption_required=true`
- `provider_edit_capability=needs_manual_probe`
- `text_to_image_fallback=blocked`
- `image_generate` remains unselected when `image_ref` exists.
- Result review stays manual until the edited image is inspected by the operator.

## Stop Rule

No live provider call, paid API, secret read, provider switch, Telegram/LINE send, MCP run, deploy, push, publish, or gateway restart happens in this local-only phase.
