# 17 — Acceptance Criteria

**Purpose:** What "done" means for each lane type

---

## Scaffold Lane (LANE_0)

- [x] `_OBSIDIAN_GHOSTCLAW_BRAIN/` exists with all 20 doctrine files
- [x] `.ghostclaw_runtime/` directory tree complete
- [x] All state JSON files initialized
- [x] All `.gitkeep` files placed
- [x] Git staging uses explicit paths (no `git add .`)
- [x] No business logic created
- [x] No database modifications
- [x] No external sync enabled
- [x] No deployment

## Architecture Lane

- [ ] Architecture packet from Opus
- [ ] Hermes review + approval
- [ ] Lane definitions clear with file scopes
- [ ] Data model defined
- [ ] Interface contracts written
- [ ] Risk assessment complete
- [ ] Recorded in DECISION_LOG

## Build Lane

- [ ] Codex build plan from Opus architecture
- [ ] All files within assigned lanes
- [ ] Tests pass
- [ ] Lint passes
- [ ] KOB validation PASS
- [ ] Explicit git stage (no `git add .`)
- [ ] Diff summary provided
- [ ] Brain updated

## Validation Lane

- [ ] All tests green
- [ ] All lint rules pass
- [ ] Typecheck clean
- [ ] Command output parsed
- [ ] Validation report written
- [ ] No allowlist violations

## General (All Lanes)

- [ ] No loop detected
- [ ] No dependency skipped
- [ ] No cross-lane write without approval
- [ ] No secrets exposed
- [ ] No external sync triggered
- [ ] Brain updated after completion
