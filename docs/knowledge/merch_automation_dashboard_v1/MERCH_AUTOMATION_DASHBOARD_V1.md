# Merch Automation Dashboard v1

## Objective

Build a repeatable local factory for print-on-demand product planning while keeping every risky marketplace action outside automation.

## Pipeline

1. Niche research: score demand, buyer intent, competition gap, seasonality, IP safety, and reusable assets.
2. IP guardian: classify phrase and visual-risk fields as green, yellow, or red.
3. Creative direction: convert approved niches into reusable design families.
4. Listing SEO: draft title, brand, bullets, description, and keyword cluster without stuffing.
5. QC: inspect spelling, readability, contrast, transparent background, file readiness, placement, and duplicate-pattern risk.
6. Traffic planning: create manual content drafts for Pinterest, TikTok, Reels, and Facebook without fake engagement.
7. Analytics: track upload date, sales, royalties, traffic tags, and iteration decisions after owner action.

## Owner-Action Gate

`PUBLISH_READY_OWNER_ACTION` means a local draft is ready for human marketplace review. It does not mean the item was published, approved, cleared legally, or guaranteed to sell.

## Local Artifact Map

- Google Sheet and CSV templates: `schema/` and `templates/`
- Airtable import model: `schema/airtable_base_schema.json`
- n8n import draft: `n8n/merch_automation_dashboard_v1.workflow.json`
- Static UI: `dashboard/`
- Validation: `scripts/validate_merch_dashboard_v1.mjs`
