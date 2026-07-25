# A2A2A Adaptive Sync Specification

**Date:** 2026-06-30

---

## Envelope Required Fields

mission_id, task_id, parent_task_id, source_agent, target_agent, requested_action, action_tier, status, priority, file_lease, receipt_id, evidence_pack_path, kanban_card_id, obsidian_note_path, created_at, updated_at

## Status Values

queued, claimed, brainstorming, planned, executing, validating, blocked, complete, archived

## Heartbeat

- Interval: 300 seconds
- Stale after: 900 seconds
- On stale: mark worker stale, release expired lease, requeue once, blocked receipt on second failure

## File Lease Policy

- TTL: 900 seconds
- Conflict: no parallel mutation same file
- Expired leases released by File_Lease_Manager

## Receipt Policy

- Required for every mutation
- Checksum required (SHA-256)
- Diff required
