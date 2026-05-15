---
name: hermes-project-planning
description: Plan SIRINX OS Hermes dashboard, control API, browser automation, and release-gate work. Use when creating task cards, phases, role splits, or next steps.
---

# Hermes Project Planning

Use this project workflow:

1. Read `AGENTS.md`, `CLAUDE.md`, `package.json`, and relevant docs.
2. Write or follow a task card with:
   - Goal
   - Constraints
   - File Scope
   - Expected Result
   - Verification
   - Report Format
3. Keep work local and dry-run unless explicit approval exists.
4. Split complex work into:
   - Planner
   - Frontend
   - Backend
   - Browser automation
   - Runtime/DevOps
   - Reviewer
5. Verify with `pnpm verify`, `pnpm dashboard:e2e`, and `pnpm dashboard:status`.
