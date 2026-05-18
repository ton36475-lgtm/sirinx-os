---
title: "SIRINX Solar ROI Proposal Engine Phase 2"
created: 2026-05-19
status: active
system: SIRINX
generated_by: sirinx-omega-vault-generator
tags:
  - sirinx/roi
  - proposal
  - implementation
---

# SIRINX Solar ROI Proposal Engine Phase 2

## Scope

Phase 2 adds a local sales-engineering layer on top of the Obsidian vault.

## Added Artifacts

- Residential ESS buyer intelligence.
- Sales qualification workflow.
- Proposal workflow.
- Residential ROI model.
- ROI assumption database.
- Sales engineering dashboard.
- Residential proposal template.
- Local ROI calculator utility.
- Local proposal brief generator.

## Runtime Safety

This phase does not touch the public website, Cloudflare, production lead endpoints, Supabase, Solis, Telegram, LINE, customer data, or external SaaS.

## Validation

Use a local JSON customer profile only:

```bash
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/solar_roi_calculator.py" --sample
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/solar_roi_calculator.py" --input /tmp/sirinx-sample-customer.json
python3 "/Users/sirinx/Documents/Obsidian Vault/SIRINX/09_AUTOMATIONS/proposal_brief_generator.py" --input /tmp/sirinx-sample-customer.json
```

## Next Phase

After local proposal math is stable, wire a read-only lead intake schema and Command Center status model. Production lead POST must remain separately gated.
