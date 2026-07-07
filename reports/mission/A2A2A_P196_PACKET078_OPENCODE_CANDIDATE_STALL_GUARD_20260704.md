# A2A2A P196 Packet 078 OpenCode Candidate Stall Guard

Status: `waiting_for_external_opencode_candidate`

## Purpose

P196 adds a local-safe stall guard for the `packet_078` OpenCode candidate-review handoff. It diagnoses the current wait state after P195 and surfaces retry/checklist commands without writing candidate, real review-result, queue, or guard files.

## Current State

- P195 paste pack status: `ready_to_paste_opencode_candidate_prompt`
- Prompt file exists: `true`
- Candidate result exists: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- P193 guard exists: `false`
- Prompt SHA256: `a06acafb9ebb358bfebf8d2b757ca96359ad20e905e02ec44115b55a5be65e66`

## Artifacts

- P196 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P196-PACKET078-OPENCODE-CANDIDATE-STALL-GUARD-20260704.json`
- P196 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P196-PACKET078-OPENCODE-CANDIDATE-STALL-GUARD-20260704.json`
- P195 prompt: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PROMPT-20260704.txt`

## Retry Commands

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-candidate-paste-pack --write
pbcopy < .ghostclaw_runtime/a2a2a/reviews/A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PROMPT-20260704.txt
```

## After Candidate Appears

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-sequence-status
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-watch
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-review-candidate-preflight
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-copy-gate
```

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, queue write, P167/P173/P193 guard execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Re-paste the P195 prompt into OpenCode or run the external OpenCode review. After candidate appears, rerun P194/P191/P190/P185/P193.
