# AGM AUTOGLOW Assistant

Chrome Manifest V3 side panel assistant for AGM AUTOGLOW.

## Current MVP Behavior

- Opens a side panel from the extension action.
- Detects safe Google Flow page state from visible page text only.
- Stores local project and scene status in `chrome.storage.local`.
- Lets the user copy prompts and mark scenes done.
- Copies a Markdown delivery pack to the clipboard.

## Safety Boundary

The extension does not request `debugger`, `cookies`, `tabs`, or broad host permissions. It does not access cookies, sessions, tokens, localStorage auth data, private APIs, credits, captcha, or rate limits. It does not auto-click or publish.

## Local Load

1. Open Chrome Extensions.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select:

```text
/Users/sirinx/sirinx-os/apps/agm-autoglow-extension
```

## Verify

```bash
pnpm autoglow:test
pnpm autoglow:extension:check
```
