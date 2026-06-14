# Technical Specification

## 1. Objective
Add Hermes Spec-First Swarm Protocol v1 as live local project state and a local-only API/dashboard contract.

## 2. Target User
SIRINX operator and local AI execution/review lanes.

## 3. Primary Conversion Goal
Move future work into a repeatable requirement, context, spec, approval, implementation, test, and report workflow.

## 4. Page Structure
Add one dashboard panel near the Team Runtime / Gateway area.

## 5. Section Breakdown
### Section 1: Status
Current phase, approval status, implementation state, and stop point.

### Section 2: Source Of Truth
Required `.hermes` and workflow docs with present/missing status.

### Section 3: Agent Roles
Orchestrator, Context Manager, Grill, Spec Writer, Environment Scanner, Coder, QA, Reporter.

### Section 4: Blocked Actions
All non-approved execution paths.

## 6. Visual System
Use existing dashboard colors, cards, spacing, status pills, and signal lists.

## 7. Technical Stack
- Node.js ESM modules
- Native `fs` inspection
- Local HTTP server routes
- Static dashboard JavaScript
- Vitest API tests
- Playwright dashboard tests

## 8. Implementation Rules
- Add `services/dev-control-api/src/hermes-spec-first-swarm.mjs`.
- Add tests before implementation.
- Add routes for status and dry-run planning.
- Add dashboard render and fallback state.
- Add docs and `.hermes` live files.

## 9. Responsive Rules
Preserve the existing dashboard layout behavior.

## 10. Accessibility Rules
Panel uses headings, clear labels, and existing aria patterns.

## 11. Performance Rules
GET status uses bounded local file existence checks only.

## 12. Must Not Do
- No external network calls.
- No package install.
- No provider call.
- No real MCP execution.
- No connector activation.
- No message send.
- No deploy, push, or publish.
- No source modification by API.

## 13. QA Checklist
See `docs/05-qa-checklist.md`.

## 14. Approval Status
NOT_APPROVED
