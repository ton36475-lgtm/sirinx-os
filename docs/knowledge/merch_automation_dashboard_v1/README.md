# Merch Automation Dashboard v1

Local-first AI automation factory for Amazon Merch on Demand planning, original concept generation, policy precheck, QC, listing drafts, traffic planning, and analytics review.

This package is safe-by-default:

- No live Amazon publishing.
- No external customer messages.
- No paid provider calls.
- No credential values.
- No scraping or platform bypass.
- No celebrity, brand-confusion, trademark, sports team, copyrighted character, song lyric, movie, game, or anime reference workflow.

## Entry Points

- Dashboard: `dashboard/index.html`
- Validator: `node docs/knowledge/merch_automation_dashboard_v1/scripts/validate_merch_dashboard_v1.mjs`
- n8n import draft: `n8n/merch_automation_dashboard_v1.workflow.json`
- Prompt pack: `prompts/PROMPT_PACK.md`
- QC checklist: `qc/QC_CHECKLIST.md`

## Operator Boundary

The system can prepare ideas, briefs, listing drafts, QC records, and owner-ready tasks. The owner must manually review rights, policy, quality, and the publish decision before any marketplace action.
