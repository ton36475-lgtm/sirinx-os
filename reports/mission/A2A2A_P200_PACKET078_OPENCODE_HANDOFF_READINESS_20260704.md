# A2A2A P200 Packet 078 OpenCode Handoff Readiness

Status: `ready_for_manual_opencode_paste`

## Purpose

P200 consolidates the P195/P197/P198/P199 handoff checks into one local-safe readiness surface. It tells the orchestrator whether the regenerated P195 prompt is safe to paste into OpenCode or whether the lane must wait for a real P185 candidate file.

## Current State

- P195 paste pack status: `ready_to_paste_opencode_candidate_prompt`
- P197 template pack status: `ready_for_opencode_candidate_fill`
- P198 false-pass guard status: `false_pass_guard_verified`
- P199 prompt canonicalization status: `p195_prompt_canonicalized_to_p197_template`
- Prompt template reference: `P197`
- Prompt contains stale P177 template: `false`
- Candidate result exists: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- P193 guard exists: `false`

## Operator Command

Copy the regenerated prompt:

```bash
pbcopy < .ghostclaw_runtime/a2a2a/reviews/A2A2A-P195-PACKET078-OPENCODE-CANDIDATE-PASTE-PROMPT-20260704.txt
```

Then paste it into OpenCode. OpenCode may write only:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`

## After Candidate Appears

Run:

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-sequence-status
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-poll --packet078-candidate-poll-attempts 1 --packet078-candidate-poll-interval 0
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-watch
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-opencode-review-candidate-preflight
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --packet078-candidate-copy-gate
```

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, `packet_078` queue write, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Evidence

- Status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P200-PACKET078-OPENCODE-HANDOFF-READINESS-20260704.json`
