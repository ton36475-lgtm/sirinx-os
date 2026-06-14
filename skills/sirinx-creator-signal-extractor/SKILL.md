---
name: sirinx-creator-signal-extractor
description: Extract high-level, non-copied signals from public creator observations and classify them into SIRINX-safe categories.
allowed-tools: Read Grep Glob Bash
---

# Creator Signal Extractor

Input must be a manual observation with a public URL.

Allowed extraction:

- topic
- pattern
- workflow implication
- SIRINX-specific original action

Blocked extraction:

- direct post text
- private data
- claims of endorsement
- automated source collection

Use `packages/content-factory/src/intelligence/signalClassifier.mjs` for deterministic categories.
