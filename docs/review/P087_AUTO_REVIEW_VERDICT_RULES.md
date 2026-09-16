# P087 Auto Review Verdict Rules

## Auto Review Pass

Return `auto_review_pass` only when:

- every required check is `passed`
- no high or critical finding exists
- no live send, deploy, cloud mutation, or secret-like output is detected
- all required artifacts exist with hashes
- next action is low risk

## Auto Review Pass Needs Human Approval

Return `auto_review_pass_needs_human_approval` when:

- low-risk review checks pass
- evidence artifacts are written
- the next action is high risk

High-risk actions still require separate approval: deploy, push, Cloudflare mutation, LINE webhook activation, CRM/customer data storage, and customer messaging.

## Review Blocked With Findings

Return `review_blocked_with_findings` when:

- any check is `failed` or `blocked`
- high or critical finding exists
- live-send path appears
- deploy/cloud mutation command appears
- secret-like value appears
- browser review observes write network behavior

