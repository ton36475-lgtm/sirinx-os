# GhostClaw Downloads Intake Status 2026-07-03

Status: WARN
Mode: safe local read-only intake with receipt
Timestamp: 2026-07-03T01:12:37+0700

## Scope

Codex inspected `/Users/sirinx/Downloads` before running any install gate or live wiring task.

Allowed actions performed:
- Counted files and listed metadata.
- Listed relevant GhostClaw/Hermes/Codex/Claude/Fable downloads.
- Listed ZIP/skill archive contents without extracting.
- Tested ZIP/skill archive integrity.
- Read small relevant GhostClaw Model Router and Fable addendum docs.
- Ran shell syntax checks for downloaded `.sh` files.
- Ran Python syntax checks for downloaded `.py` files.
- Ran JSON parse checks for downloaded `.json` files.

Blocked actions preserved:
- No install or update script execution.
- No provider/model API calls.
- No push or deploy.
- No live Telegram/customer send.
- No `.env.production`, `.git/config`, private key, token, cookie, or secret content read.
- No production Codex wiring.

## Findings

- Downloads contains 520 files.
- Archive integrity passed for 14 ZIP/skill archives.
- Exact `Install Gate Pack V3` and exact `Live Codex Wiring Gate Pack V1` filenames were not found in `/Users/sirinx/Downloads`.
- Closest current GhostClaw gate-related downloads:
  - `/Users/sirinx/Downloads/ghostclaw_coding_model_integration_pack_v2_1.zip`
  - `/Users/sirinx/Downloads/ghostclaw_fable5_orchestrator_addendum_v1_9.zip`
- `ghostclaw_coding_model_integration_pack_v2_1` says `READY_FOR_REPO_INSTALL`, but its next actions include provider setup and future model calls that remain gated.
- `ghostclaw_fable5_orchestrator_addendum_v1_9` says `READY_FOR_REPO_INSTALL`, but its next actions include Codex plugin setup and Claude subagent setup that remain gated.
- Shell syntax checks passed for downloaded shell scripts except two `gemini-code-*.sh` files. Those appear to be instruction text saved with `.sh` extension, not executable shell scripts.
- Python syntax checks created temporary `__pycache__` files in Downloads; Codex removed only the generated `.cpython-314.pyc` cache files immediately after detecting them.

## Safe Next Action

Do not run install, update, plugin setup, provider calls, or live Codex wiring yet.

Next safe packet:
1. Create a local install-gate comparison between the downloaded `ghostclaw_coding_model_integration_pack_v2_1` / `ghostclaw_fable5_orchestrator_addendum_v1_9` and the current `/Users/sirinx/sirinx-os` untracked files.
2. Verify whether those packs are already partially applied in the repo.
3. Produce a patch-only plan for any missing docs/config templates.
4. Stop before any D-tier operator action.

## Rescan 2026-07-03T01:13:49+0700

Status: WARN / PACKS_FOUND

New Downloads state:
- Downloads contains 549 files.
- Exact install gate ZIP found: `/Users/sirinx/Downloads/ghostclaw_mac_m2_codex_claude_fable_install_gate_pack_v3.zip`
- Exact live wiring ZIP found: `/Users/sirinx/Downloads/ghostclaw_live_codex_wiring_gate_pack_v1.zip`
- Extracted folders for both packs are also present under `/Users/sirinx/Downloads`.

Read results:
- Install Gate Pack V3 archive integrity: PASS.
- Live Codex Wiring Gate Pack V1 archive integrity: PASS.
- Install Gate V3 docs classify CLI install/update as D-tier operator-run only.
- Install Gate V3 `00_preflight.sh` is read-only style preflight.
- Install Gate V3 `01_install_update_codex_claude.sh` downloads and runs official Codex and Claude installers, edits `~/.zshrc`, and may trigger Xcode CLT prompt. Codex did not run it.
- Install Gate V3 `02_global_rules.sh` writes global `~/.codex` and `~/.claude` governance files. Codex did not run it.
- Install Gate V3 `03_project_bridge.py` is dry-run by default but `--apply` writes bridge files across Git repos. Codex did not run it.
- Install Gate V3 `04_install_fable_addendum_from_zip.py` copies Fable files, appends to `AGENTS.md`/`CLAUDE.md`, creates backups, runs validator, and writes a receipt. Codex did not run it.
- Live Codex Wiring V1 targets local dry-run only: `LOCAL_HANDSHAKE_PASS` -> `LOCAL_CODEX_DRY_RUN_PASS`.
- Live Codex Wiring V1 blocks production, live Telegram, push, deploy, cloud mutation, provider calls, migrations, and secret handling.

Validation results:
- Shell syntax check for V3 scripts: PASS.
- Python AST syntax check for V3 and Live Wiring scripts: PASS.
- JSON parse for V3 gate packet and Live Wiring schemas: PASS.
- Live Wiring pack validator: PASS.
- Fable addendum ZIP inside V3 has the same SHA-256 as the standalone Fable addendum ZIP.
- V3 checksum manifest: WARN. Every listed file matched except `checksums/SHA256SUMS.txt` itself, whose current hash does not match the hash recorded inside the manifest.
- Strict secret-value pattern scan across both new pack folders: PASS.
- Generated Python cache count from this rescan: 0.

Updated safe next action:
1. Do not run `01_install_update_codex_claude.sh` from Codex.
2. If human operator approves D-tier install manually, run only from Terminal after reviewing `docs/INSTALL_GATE_PACKET.md`.
3. Codex may next run only non-mutating checks: `00_preflight.sh`, checksum review, and repo comparison.
4. Any `02_global_rules.sh`, `03_project_bridge.py --apply`, `04_install_fable_addendum_from_zip.py`, or Live Wiring implementation should be a separate local mutation packet with backup, file lease, validation, and receipt.
