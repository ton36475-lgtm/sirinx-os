# Context Handoff Workflow Assessment

Tool: Matt Pocock `/handoff` skill
Lane: `CONTEXT_CONTINUATION`
Default Gate: `YELLOW`

## Purpose

The handoff pattern summarizes a long AI session into a temporary file so a new
agent/session can resume without loading the full chat history.

## GhostClaw Fit

Useful for:

- avoiding giant prompt dumps
- reducing context-window drift
- transferring current packet state
- preserving file paths, receipts, blockers, and next action

Controls:

- do not include secrets, `.env`, tokens, cookies, or private customer data
- include only current mission, changed files, validation evidence, and next gate
- store handoff files outside public docs unless explicitly approved
- treat imported skills as supply-chain artifacts requiring review

## Verdict

Adopt the handoff pattern as a policy and runbook. Do not blind-install external
skills into GhostClaw.
