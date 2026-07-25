# RELEASE_GATE — Pocket Hatchery Agent Factory v4

## Gate Order

1. Scope — exact files changed.
2. Safety — no secrets, no gambling, no public `waxwing`.
3. Local tests — `WORKSPACE_SCAFFOLD/tests` pass.
4. Diff review — `git diff --check`.
5. External preflight — all external gates blocked or approved.
6. Memory — `AUTONOMOUS_RUN_LOG.md` updated.
7. Commit — atomic local commit.
8. External approval — R0 gate explicit.
9. External execution — one gate per approval.
10. Smoke/rollback — verified.

## Blocked Until Evidence

- Pause/unpause tests.
- Wallet flow end-to-end.
- Contract action tests on testnet.
- No public `waxwing` exposure (Security Sentinel).

Current score: `34/100`.
