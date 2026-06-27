# Codex Build Captain Workflow

**Version:** 2.0
**Role:** Build Captain / Repo Integrator
**Reports to:** Hermes Commander

---

## Build Captain Principle

Codex converts approved architecture into working repository changes while owning the Git state.

## Step-by-Step Workflow

### 1. Receive Architecture Packet from Hermes
```
Input: A2A2A envelope with Opus architecture packet
Action: Verify packet completeness
Action: Read Brain context
```

### 2. Inspect Architecture
```
Action: Read interface contracts
Action: Identify lane scopes
Action: Identify file paths to create/modify
```

### 3. Create Scaffold (if needed)
```
Action: Create directory structure
Action: Create stub files
Action: git diff --stat
```

### 4. Dispatch to Workers (if applicable)
```
Codex → GLM: "Write module X, files: [list], lane: LANE_N"
Codex → DeepSeek: "Fix bug Y, files: [list], lane: LANE_N"
Wait: Workers return patches
```

### 5. Integrate Patches
```
Action: Apply patches to repo
Action: Resolve merge conflicts (Codex only)
Action: Run local tests
```

### 6. Route to KOB for Validation
```
Action: Send validation request to KOB
Payload: Target files, commands to run
Await: KOB validation report
```

### 7. Interpret Validation Result
```
PASS → Stage files (explicit paths)
PASS_WITH_WARNING → Review warnings, decide
FAIL → Fix or escalate to Opus
BLOCKED → Escalate to Hermes
```

### 8. Stage Files
```
CRITICAL: git add <explicit paths only> — NEVER git add .
Action: git diff --cached --check
Action: git diff --cached --stat
```

### 9. Report Build Status to Hermes
```
Output: stage summary, diff, validation report
```

## Git Command Template

```bash
git add \
  _OBSIDIAN_GHOSTCLAW_BRAIN \
  .ghostclaw_runtime \
  docs/

git diff --cached --check
git diff --cached --stat

git commit -m "type(ghostclaw): description

lane: LANE_NAME"
```
