---
name: ghostclaw-agent-delegation
description: Parallel agent delegation pattern for Mac mini M2 — dispatch multiple agents for concurrent work without blocking.
version: 1.0.0
---

# GhostClaw Agent Delegation Pattern

## When to Use

- Multiple independent tasks that can run concurrently
- Fixing Rust errors + JS tests + building infrastructure simultaneously
- Any scenario where 2-3 subagents can work without interdependencies

## Pattern

```
Hermes (you)
  ├── delegate_task Agent 1 (leaf) → Rust fix
  ├── delegate_task Agent 2 (leaf) → JS tests fix
  └── delegate_task Agent 3 (leaf) → Infrastructure
```

## Step-by-Step

### Step 1: Identify Independent Tasks

Split work into independent streams:
- **Stream A**: Code compilation (Rust/go)
- **Stream B**: Test fixes (vitest/jest)
- **Stream C**: Infrastructure (Docker/scripts)

### Step 2: Dispatch All Agents

```python
# All dispatches are independent — fire them together
delegate_task(goal="Fix Rust compile error in ghostclaw-hermes", context="...", role="leaf")
delegate_task(goal="Fix 16 failing JS tests", context="...", role="leaf")
```

**Key rules:**
- Use `role='leaf'` — agents cannot delegate further
- Pass complete context (file paths, error messages)
- Do NOT wait for results — continue working
- Results re-enter conversation automatically

### Step 3: Continue Your Own Work

While agents work:
- Create skills
- Set up cron jobs
- Update tmux windows

### Step 4: Verify Agent Results

Agents report back with summaries. Always verify:
- Check `cargo check` after Rust fixes
- Run `npx vitest run` after test fixes
- Confirm no secrets leaked

## Constraints

- Max 3 concurrent subagents per user
- Subagents have NO memory of your conversation
- Subagents cannot use `clarify` — they must work autonomously
- All results are self-reports — verify critical claims
- **600-second timeout** — subagents are killed after 10 minutes. Large tasks (fixing 12+ test files) will NOT complete in time. Split into smaller scoped tasks (3-4 files per agent) or accept partial completion and re-dispatch.

## Verified Results from This Session

| Task | Agent | Duration | Outcome |
|------|-------|----------|---------|
| Fix Rust ghostclaw-hermes import | Agent 1 (leaf) | 62s | ✅ Fixed: removed unused `Task, Event` imports |
| Fix 16 failing JS tests | Agent 2 (leaf) | 600s (timeout) | ⚠️ Fixed 4/16 before timeout. Agent was mid-way through telegram-command-router.mjs when killed |

## Lessons Learned

1. **Small scoped tasks succeed** — The Rust fix (1 import line) completed in 62 seconds with 7 API calls
2. **Large batch tasks timeout** — The 16-test-fix task used 25 API calls and still timed out at 600s
3. **Split by complexity, not by count** — Group tests by similarity (all telegram tests in one agent, all roi-calculator in another) rather than giving one agent everything
4. **Timeout agents still produce value** — Agent 2 fixed 4 tests and modified 8+ files before dying. Check `git diff --stat` to see what was done
5. **Verify after every delegation** — Run `cargo check`, `npx vitest run`, `node --check` after agents finish, regardless of their self-reported status

## Safety

- Agents cannot commit, push, or deploy
- Agents operate in the same repo: /Users/sirinx/sirinx-os
- Agent terminal sessions are isolated
- Background delegations are NOT durable (discarded if session closed)
