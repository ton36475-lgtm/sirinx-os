# P101 Baseline Reconciliation

**Date:** 2026-07-14
**Status:** `LOCAL_EVIDENCE_GENERATED`

The original baseline report contained integration claims without supporting
receipts. This reconciliation was generated from the current Git worktree,
source manifests, and read-only tmux session names.

## Verified State

- Repository: `/Users/sirinx/sirinx-os`
- Branch: `feat/sirinx-web-line-trust-v1`
- Baseline HEAD: `044bc4e7754be2d3351abe530ae60d6db210b1b4`
- Git state at capture: 44 entries (5 unstaged, 39 untracked, 0 staged)
- Rust manifests: 4
- JavaScript/TypeScript package manifests: 19
- tmux sessions observed: 6
- Configured worker sessions observed: `claude-worker`, `codex-worker`,
  `opencode-worker`

Session presence does not prove that an agent accepted or completed a task.

## Unverified Claims Corrected

- MCP servers active: unknown
- LangGraph memory connected: unknown
- Worker execution completed: false/unverified
- Cloudflare distributed mutex established: false/unverified
- Cache hit ratio: omitted because no telemetry source was provided

## Artifacts

- Architecture map: `reports/mission/P101_BASELINE.json`
- Repository inventory: `reports/mission/P101_REPO_INVENTORY.json`
- Runtime receipt: `.ghostclaw_runtime/p101/baseline/receipt.json`
- Obsidian Canvas:
  `/Users/sirinx/Documents/Obsidian Vault/SIRINX/SIRINX P101 Architecture.canvas`

Checksums:

- Architecture map: `5a5e49ebbb60980b97796509df655f255d3422371f2613ec6076938c2106d210`
- Inventory: `28b6b04763b5fb833ad707deb066f5e2dac298b6d4b1fc96574f43541fb94b88`
- Canvas: `57892161c7b12953d0a7d24906a9e59b2ff311d7e43edfa47e2464396e4a0689`

## Safety Result

The initializer did not dispatch tmux commands, call providers, access
secrets, write to Cloudflare, or append directly to the Obsidian digest. Digest
updates must use the canonical `a2a_obsidian_sync.py` helper.
