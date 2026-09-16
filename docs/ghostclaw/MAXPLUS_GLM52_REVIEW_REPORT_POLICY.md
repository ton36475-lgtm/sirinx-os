# MaxPlus GLM-5.2 Review Report Policy

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Updated UTC: `2026-06-30T10:02:27Z`

## Purpose

Define how OpenCode and GLM52 may produce review reports without mutating
source files, running provider/model calls, or claiming execution from mailbox
packets alone.

## Review Report Scope

Allowed report paths after a narrow lease:

- `.ghostclaw_runtime/a2a2a/reviews/opencode/maxplus_glm52_current_layer_review.md`
- `.ghostclaw_runtime/a2a2a/reviews/glm52/maxplus_glm52_identity_review.md`

These review files are local evidence only. They do not authorize source
changes, commits, push, deploy, install, provider calls, or secret access.

## Output Format

Every review report must include:

- `PASS`, `WARN`, or `FAIL`
- current layer reviewed
- evidence paths
- blocking issues
- non-blocking improvements
- suggested patch list only
- explicit statement that no mutation, push, deploy, provider call, or secret
  read occurred

## Lease Rule

OpenCode and GLM52 may write a review report only after Hermes creates an
active review-report lease from:

`.ghostclaw_runtime/a2a2a/templates/maxplus_glm52_review_report_file_lease.template.json`

Without an active lease, the workers must keep findings in chat or leave the
packet pending.

## Evidence Rule

Outbox packets and review templates are routing intent only. A live review
claim requires a completed review report, a receipt, and process/session
evidence when a live worker is involved.
