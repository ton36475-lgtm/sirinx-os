# SIRINX Hermes Desktop Install Evidence - 2026-05-27

Status: installed-local
Mode: Mac mini local install
External services configured: false
Messaging gateways activated: false
Provider secrets entered: false

## Source

- Repository: https://github.com/fathah/hermes-desktop
- Release: v0.5.1
- Asset used: `hermes-desktop-0.5.1-arm64.dmg`
- Download path: `/Users/sirinx/Downloads/hermes-desktop-0.5.1-arm64.dmg`

## Verification

```text
Mac architecture: arm64
Expected SHA256: c5458b623a021dc64a1ae013ade4155171f3706b7fcf84aa633ad219c46894f8
Actual SHA256:   c5458b623a021dc64a1ae013ade4155171f3706b7fcf84aa633ad219c46894f8
Installed app:   /Applications/Hermes Agent.app
Bundle version:  0.5.1
Bundle ID:       com.nousresearch.hermes
Gatekeeper:      accepted
Signing source:  Notarized Developer ID
Launch check:    Hermes Agent process observed
```

## Backup

The previous `/Applications/Hermes Desktop.app` bundle was preserved before install:

```text
/Applications/Hermes Desktop.app.backup-20260527-020312
```

That previous bundle was an AppleScript applet, not the upstream Electron release bundle.

## Safety Boundary

- No API keys, OAuth credentials, provider secrets, or tokens were entered.
- No Telegram, LINE, Discord, WhatsApp, email, or webhook gateway was activated.
- No scheduled task was created.
- No MCP server was started.
- No package install or source build was performed.

## Next Safe Step

Open Hermes Agent and choose only local/existing Hermes setup inspection first. Stop before provider setup, messaging gateway activation, scheduled tasks, or any real agent work unless separately approved.
