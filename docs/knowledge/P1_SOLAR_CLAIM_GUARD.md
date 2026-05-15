# P1 Solar Claim Guard

Status: completed
Date: 2026-05-16
Scope:

- `apps/solar-intelligence/src/domain/claim-guard.ts`
- `apps/solar-intelligence/src/domain/types.ts`
- `apps/solar-intelligence/src/domain/proposal.ts`
- `apps/solar-intelligence/src/domain/quotation.ts`
- `apps/solar-intelligence/src/domain/index.ts`
- `apps/solar-intelligence/src/domain/solar-engine.test.ts`
- `apps/solar-intelligence/src/domain/ci-bess-engine.test.ts`
- `apps/solar-intelligence/src/ui/quotation-document.ts`

## Purpose

Prevent Solar Intelligence outputs from presenting ROI, savings, payback, approval, compliance, or uptime as guaranteed production claims.

## Guard Added

Every generated proposal now includes `claimGuard` with:

- `status: draft-not-for-final-quote`
- `finalQuoteAllowed: false`
- forbidden claim list
- required verification checklist
- disclaimers
- blocker summary

## Commercial Language Rules

The proposal and quotation now state:

- Savings, ROI, payback, and cashflow are estimates, not guarantees.
- Compliance is a rule-engine draft until official sources and site evidence are refreshed.
- Proposal output is not a binding final quote.
- Engineer sign-off is required before customer handoff or purchase-order use.

## Verification

Commands:

```bash
pnpm solar:check
pnpm solar:test
```

Final result:

```text
2 test files passed
12 tests passed
```

## Typecheck Fix

`apps/solar-intelligence/src/ui/quotation-document.ts` had an existing TypeScript issue where `escapeHtml` could return `undefined` from a replacement callback. It now always returns a string.

## Safety Result

- Source code changes: yes, Solar Intelligence domain and tests only.
- Runtime configuration changes: no.
- External writes: no.
- Secrets included: no.
- Customer-facing sends: no.
- Deployment: no.
- Git push: no.
