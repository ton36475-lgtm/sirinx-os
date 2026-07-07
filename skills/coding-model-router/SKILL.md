# Skill: Coding Model Router

## Purpose

Route coding tasks to the cheapest safe model lane that can complete the task.

## Inputs

- task description
- project name
- task tier T0/T1/T2/T3/T4
- files likely touched
- budget gate status
- provider approval status

## Procedure

1. Read AGENTS.md.
2. Classify task tier.
3. Check blocked actions.
4. Select model lane.
5. Create narrow context pack.
6. Ask worker for concise output.
7. Validate.
8. Write receipt.
9. Escalate to Codex/Fable/Human when needed.

## Output

- model_lane
- reason
- context files
- validation commands
- receipt path
- gate status
