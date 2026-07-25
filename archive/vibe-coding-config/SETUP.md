
# Vibe Coding Sidebar - Autonomous Setup Instructions

## Quick Start

```bash
# 1. Create worktrees (one-time)
cd /Users/sirinx/sirinx-os
git worktree add .worktrees/codex -b vibe/codex migration/v5-rebase
git worktree add .worktrees/opencode -b vibe/opencode migration/v5-rebase  
git worktree add .worktrees/claude -b vibe/claude migration/v5-rebase

# 2. Install lane guard hook
cp /Users/sirinx/sirinx-os/vibe-coding-config/guard-lanes.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# 3. Test autonomous dispatch
bash /Users/sirinx/sirinx-os/vibe-coding-config/vibe_dispatch.sh "Implement auth service in services/"

# 4. Check status
ps aux | grep -E 'codex|claude|opencode'
```

## Lane Ownership

- **Codex**: Backend, Rust crates, GhostClaw core
- **OpenCode**: Frontend, apps, tests, infra
- **Claude**: Design, docs, schemas, prompts
- **Hermes**: Orchestration, merge, scripts

## A2A Sync Integration

Each agent pulses state via A2A sync system:
```bash
export AGENT="codex" ACTION="task-complete" SESSION_ID="feature-xyz" DATA="Implemented auth service"
~/.hermes/profiles/solis/a2a-sync/a2a-sync.sh
```

## OmniRoute Integration

Start OmniRoute for model routing:
```bash
cd ~/sirinx-os/integrations/omniroute && npm run dev
# Server at http://localhost:20128
```

## Autonomous Features

✓ Parallel dispatch to all lanes
✓ Auto-merge via Hermes
✓ Lane guard enforcement
✓ A2A state sync
✓ Error recovery & rollback
✓ Obsidian Brain knowledge capture

## Safety

✓ Pre-commit hooks prevent cross-lane writes
✓ File ownership validation
✓ Hermes-only merge authority
✓ Rollback on failure
✓ Full audit trail
