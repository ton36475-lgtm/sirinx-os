# Codex Sidebar Distribution Model

Mission ID: `GC-CLICKUP-SINGLE-INBOX-WEEKLY-SYNC-20260630-002`

## Goal

Avoid requiring the operator to paste prompts into each sidebar. Hermes should
write local A2A2A worker packets and let workers poll or receive packets through
the file bus.

## Worker Lanes

- `outbox/codex`: primary builder lane, local mutations only after gate.
- `outbox/opencode`: review-only lane, no mutation before lease.
- `outbox/zcode`: long-context architecture and safety review.
- `outbox/zai_tui`: alternate reviewer lane, no provider call by default.

## Lease Rule

A worker may mutate only if a current lease exists, the path scope matches, the
diff is available, validation is planned, and a receipt will be written. Without
that proof, the worker writes review notes only.

## Current State

This run writes packets to the outbox folders. It does not prove that live
sidebar automation consumed them. Real execution still requires current worker
process/session evidence and receipts.
