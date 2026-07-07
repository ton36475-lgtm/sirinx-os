# A2A2A P195 Packet 078 OpenCode Candidate Paste Pack

Status: `ready_to_paste_opencode_candidate_prompt`

## Purpose

P195 creates a local-safe paste pack for the `packet_078` OpenCode candidate-review handoff. It consolidates the P186 prompt, candidate path, blocked real-result path, validation commands, and clipboard command into one status surface.

## Current State

- Next action: `paste_prompt_into_opencode_then_run_sequence_status`
- Candidate result exists: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- P193 guard exists: `false`
- Prompt SHA256: `a06acafb9ebb358bfebf8d2b757ca96359ad20e905e02ec44115b55a5be65e66`

## Artifacts

- P195 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704.json`
- P195 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PACK-20260704.json`
- Paste prompt: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PROMPT-20260704.txt`

## OpenCode Instruction Boundary

OpenCode may write only:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`

Codex must not write the candidate result, real P175 review result, `packet_078`, P173 guard, or P193 guard without the later exact gate.

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, queue write, P167/P173/P193 guard execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Paste the clipboard prompt into OpenCode. After OpenCode writes the candidate result, rerun P194/P191/P190/P185/P193. If P194 reports `ready_for_candidate_copy_gate`, use the exact P193 gate before any real result-path copy.
