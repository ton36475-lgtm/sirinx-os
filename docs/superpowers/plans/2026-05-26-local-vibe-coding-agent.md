# Local Vibe Coding Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Vibe Coding Agent contract that recommends safe next actions and approval stops without external writes.

**Architecture:** Add a focused service module that derives agent status from existing Vibe workflow data, SOC status, truth protocol, and external gate evidence. Expose it through the local control API and render it on the Mission Control dashboard.

**Tech Stack:** Node ESM, Vitest, local Dev Control API, static dashboard JavaScript, Playwright dashboard tests.

---

## File Structure

- Create `services/dev-control-api/src/vibe-coding-agent.mjs`: local-only agent contract, safe action planner, blocker matrix, approval packet.
- Create `services/dev-control-api/src/vibe-coding-agent.test.mjs`: unit tests for blocked external actions and safe local recommendations.
- Modify `services/dev-control-api/server.mjs`: add `GET /api/vibe-coding-agent`.
- Modify `apps/dev-dashboard/src/index.html`: add Vibe Coding Agent panel.
- Modify `apps/dev-dashboard/src/app.js`: fetch/render Vibe Coding Agent status with safe fallback.
- Modify `tests/browser/dev-dashboard.spec.mjs`: assert dashboard panel and API contract.
- Modify `package.json`: add `vibe-agent:test` and include syntax check in `verify`.
- Modify `docs/knowledge/system-wiring/sirinx-vibecoding-system-map.json`: add `vibe-coding-agent` lane.
- Modify `docs/knowledge/SIRINX_VIBECODING_SYSTEM_WIRING_REBUILD_2026-05-26.md`: record the agent lane.

## Tasks

### Task 1: Agent Contract

- [ ] Write failing tests for `getVibeCodingAgentStatus()`.
- [ ] Verify the tests fail because the module does not exist.
- [ ] Implement minimal local-only agent contract.
- [ ] Verify `pnpm vibe-agent:test` passes.

### Task 2: API And Dashboard

- [ ] Add `GET /api/vibe-coding-agent`.
- [ ] Add dashboard panel and renderer.
- [ ] Extend browser tests for panel and API fields.
- [ ] Verify `pnpm dashboard:e2e` passes.

### Task 3: Wiring And Verification

- [ ] Add package scripts and verification coverage.
- [ ] Add system wiring lane and doc note.
- [ ] Run `pnpm vibe-agent:test`, `pnpm verify`, `pnpm verify:workspace`, `pnpm audit:secrets`, `pnpm dashboard:e2e`, and `git diff --check`.
