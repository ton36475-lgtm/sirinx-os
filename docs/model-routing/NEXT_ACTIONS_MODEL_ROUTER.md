# NEXT ACTIONS — Coding Model Router V2.1

1. Unzip this pack into `/Users/sirinx/sirinx-os`.
2. Append/link `AGENTS_MODEL_ROUTER_ADDENDUM.md` from root `AGENTS.md`.
3. Append/link `CLAUDE_MODEL_ROUTER_ADDENDUM.md` from root `CLAUDE.md`.
4. Add env values locally only; do not commit real secrets.
5. Run:
   ```bash
   python scripts/validate_model_router_pack.py
   python scripts/model_router_dry_run.py --tier T1 --project ghostclaw --task "test model router"
   ```
6. Create receipt.
7. Start with dry-run routing only.
8. Enable OpenRouter free model calls only after API key is configured locally.
9. Enable paid/budget-gated models only after explicit gate.
10. Keep deploy/push/secret/customer actions blocked.
