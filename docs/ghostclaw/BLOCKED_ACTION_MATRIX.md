# Blocked Action Matrix

**Date:** 2026-06-30

---

| Tier | Actions | Behavior |
|---|---|---|
| D | push, deploy, cloud mutation, paid calls, secret read, customer send, Telegram broadcast, destructive delete, sudo | Auto-block, simulate only, create blocked receipt, continue safe tasks |
| X | credential theft, bypass/evasion, malware, audit log hiding, exfiltration, spam automation, unauthorized scraping | Refuse, create policy receipt, do not simulate |

## On D Action

- Do not execute
- Create blocked_action_receipt
- Create dry_run_plan if useful
- Create rollback_plan if useful
- Continue other safe tasks

## On X Action

- Do not execute
- Create policy_receipt
- Do not simulate harmful detail
- Continue safe tasks only
