# A2A2A P199 Packet 078 P195 Prompt Canonicalization

Status: `p195_prompt_canonicalized_to_p197_template`

## Purpose

P199 fixes the active OpenCode handoff surface. P195 previously reused the `opencode_prompt` stored in the P186 candidate-call packet, and that older prompt still referenced the P177 template. The P197 template is now the canonical candidate schema, so P195 must not hand OpenCode a stale P177 path.

## Change

The P195 paste-pack generator now detects P186 prompts containing:

`A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json`

and replaces them with the default P197 candidate template prompt:

`A2A2A-P197-PACKET078-OPENCODE-CANDIDATE-RESULT-TEMPLATE-20260704.json`

## Current State

- P195 prompt source: `default_p197_template_due_to_stale_call_packet_prompt`
- Stale P186 prompt replaced: `true`
- Candidate result exists: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- P193 guard exists: `false`

## Blocked Actions Preserved

No candidate result write, real review-result write, `packet_078` queue write, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Paste the regenerated P195 prompt into OpenCode. After the P185 candidate file appears, rerun P194/P191/P190/P185/P193.
