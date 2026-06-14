---
name: sirinx-trend-to-content-pipeline
description: Convert reviewed creator or market signals into original SIRINX content packets with compliance and approval gates.
allowed-tools: Read Grep Glob Bash
---

# Trend To Content Pipeline

Workflow:

```text
source URL -> manual observation -> signal classification -> original angle -> compliance check -> approval packet
```

Do not publish, schedule, or send content from this skill.

Every output must include:

- source URL
- original SIRINX angle
- risk notes
- human approval status
