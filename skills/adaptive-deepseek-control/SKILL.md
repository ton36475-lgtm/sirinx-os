---
name: adaptive-deepseek-control
description: Use DeepSeek as a lightweight adaptive-control sidecar for plan critique, risk review, and next-action choice.
whenToUse: Use when a task asks for adaptive control, high-level strategy, Kimi-like planning, risk review, or deciding which subagent should act next.
---

# Adaptive DeepSeek Control

Use `deepseek-r1-lite` for concise second-pass reasoning.

Pattern:

1. State the current goal.
2. List constraints and approvals needed.
3. Choose the next smallest reversible action.
4. Define a stop condition.
5. Record the decision in the brain when it changes the project direction.
