# MaxPlus GLM-5.2 Review Routing

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Updated UTC: `2026-06-30T09:58:20Z`

## Purpose

Route review-only work for the current MaxPlus/GLM-5.2 layered lock without
starting external model/provider calls or mutating source files.

## Current Routing

- OpenCode packet: `.ghostclaw_runtime/a2a2a/outbox/opencode/GC-MAXPLUS-GLM52-REVIEW-PACKET.md`
- GLM52 packet: `.ghostclaw_runtime/a2a2a/outbox/glm52/GC-MAXPLUS-GLM52-READONLY-PACKET.md`
- Routing status: `.ghostclaw_runtime/a2a2a/status/maxplus_glm52_review_routing.json`

## OpenCode Lane

OpenCode is review-only. It may inspect docs, receipts, schemas, and proposed
file leases. It must not edit, stage, commit, push, deploy, install, call
providers, or read secrets.

## GLM52 Lane

The GLM52 Claude Code lane is read-only until the harness exists and identity
smoke passes. Before that point, it may only receive a review packet describing
the expected identity truth policy and canary requirements.

## Evidence Rule

Mailbox packets prove routing intent only. They do not prove that OpenCode,
GLM52, Claude Code, or any model worker executed the review. Execution requires
a later worker receipt, process/session evidence, and no provider/secret gate
violation.
