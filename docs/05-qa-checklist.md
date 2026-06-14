# QA Checklist

## Visual QA
- [ ] Hermes Spec-First Swarm panel is visible.
- [ ] Current phase is visible.
- [ ] Approval phrase is visible.
- [ ] Source-of-truth files are visible.
- [ ] Blocked actions are visible.

## Responsive QA
- [ ] Mobile width 375px does not overlap text.
- [ ] Tablet width 768px keeps cards readable.
- [ ] Desktop width 1440px keeps panel aligned.

## Technical QA
- [ ] `pnpm spec-first-swarm:test` passes.
- [ ] `pnpm gateway-agent:test` passes.
- [ ] `pnpm team-runtime-bridge:test` passes.
- [ ] `pnpm check` passes.
- [ ] `pnpm verify:workspace` passes.
- [ ] `pnpm audit:secrets` passes.
- [ ] `pnpm dashboard:e2e` passes.
- [ ] `git diff --check` passes.

## Content QA
- [ ] No placeholder approval language.
- [ ] No unapproved claims.
- [ ] No secret values.
- [ ] No execution button.

## Final Status
PENDING
