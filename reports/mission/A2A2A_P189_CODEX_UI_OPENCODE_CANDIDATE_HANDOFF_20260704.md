# A2A2A P189 Codex UI OpenCode Candidate Handoff

Status: `computer_use_blocked_codex_app_clipboard_ready`

## Result

Computer Use was asked to send the OpenCode candidate-review command into the Codex/OpenCode sidebar. The tool refused direct control of the Codex app:

`Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.`

## Safe Fallback

The OpenCode candidate prompt was copied to the macOS clipboard from:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P186-OPENCODE-CANDIDATE-PROMPT-READY.txt`

Manual action: paste the clipboard into the OpenCode pane and run it.

## Current Safety State

- Candidate result exists: `false`
- Real P175 review result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- Live/provider/secret/install/commit/push/deploy/cloud actions performed by Codex: `false`

## Next Safe Action

OpenCode writes the candidate review result to:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`

Then rerun P185 candidate preflight before any real result-path write or `packet_078` queue write.
