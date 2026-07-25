# GHOSTCLAW Thai Jarvis - Claude Code Integration

## Overview

GHOSTCLAW Thai Jarvis implements a **Zero Prompting** workflow where Claude Code operates through structured Mission Cards, not free-form prompts. This integration ensures safety and consistency across all agent operations.

## Architecture

```
Operator Intent → Telegram Command → Hermes Approval → Codex Execution
```

### Authority Chain

1. **human_operator** - Initiates task via Telegram
2. **hermes_mission_commander** - Validates and routes
3. **opus_chief_architect** - Defines scope
4. **codex_build_captain** - Executes within bounds
5. **glm52_dekimi_workers** - Code generation
6. **kob_validator** - Validates output
7. **command_broker** - Routes to appropriate lane

## Zero Prompting Workflow

### Phase 10: Skill Creator

All Claude Code operations flow through this structured pipeline:

1. **Mission Card Creation**
   - Goal: Clear objective
   - Constraints: Bounds and limits
   - File Scope: Allowed/forbidden paths
   - Expected Result: Success criteria
   - Verification: Test plan
   - Report Format: Structured output

2. **Approval Chain**
   - Hermes/Codex mutual approval required
   - No self-approval (requester ≠ approver)
   - Tier A/B auto-approve
   - Tier C requires agent quorum
   - Tier D/X auto-block

3. **Dispatch**
   - Only to registered local workers
   - Worker Build Runtime enforces policy
   - Report-to chain maintained

### Claude Code Operation

```
codex exec --cd /workspace --sandbox workspace-write --output-last-message <prompt>
```

**Safety Rules Enforced:**
- No push, deploy, publish
- No external provider calls
- No secret printing
- No destructive commands
- No Telegram/LINE/email sending

## A2A Sync Protocol

### Lane Registry

| Agent | Endpoint | Trust Level | Capabilities |
|-------|----------|-------------|--------------|
| codex | 127.0.0.1:9000 | HIGH | deep_reasoning, complex_analysis, planning |
| claude | 127.0.0.1:9000 | HIGH | architecture, design, review |
| opencode | 127.0.0.1:9000 | MEDIUM | security_audit, code_review, compliance |
| kiro | 127.0.0.1:9000/kiro | HIGH | cli_automation, code_generation |
| hermes | 127.0.0.1:9000/hermes | HIGH | orchestration, workflow |
| telegram | 127.0.0.1:9000/telegram | MEDIUM | approval, notification |

### Packet Bus

```
{
  "type": "mission_card",
  "goal": "task objective",
  "constraints": ["allowed_bounds"],
  "file_scope": {
    "allowed": ["/workspace/**"],
    "forbidden": ["/.env", "/.git/**"]
  },
  "expected_result": "success criteria",
  "verification": ["test_plan"],
  "report_format": "structured_json"
}
```

## Hard Stop Conditions

Claude Code enters hard stop on:

- Policy gate blocks action
- Tier X detected (push, deploy, production_action, secret_access)
- Tier D detected (dependency_install, model_download, gpu_inference)
- Secret access attempt
- `.env` read attempt
- Live provider call attempt
- Model download attempt
- GPU inference attempt
- Self-approval attempt
- Recursive MoA launch attempt
- KV-only protocol requested
- EdgeOne live API call attempted

## Execution Modes

### Plan Only (Dry Run)
```bash
codex_telegram_bridge edit <payload> --plan-only
```

### Live Execution
```bash
codex_telegram_bridge edit <payload>
```

### JSON Output
```bash
codex_telegram_bridge edit <payload> --json
```

## Configuration Files

### `/Users/sirinx/.config/ghostclaw/hermes-model.json`
```json
{
  "model": "deepseek/deepseek-v4-flash",
  "provider": "openrouter",
  "a2a_sync": {
    "enabled": true,
    "sync_with": ["opencode", "claude-code", "zcode", "kiro-cli"],
    "agents": ["antigravity2", "codex", "claude", "opencode", "copilot", "webmcp", "planner", "kiro", "hermes", "telegram"]
  },
  "max_tokens": 1000000,
  "execution_mode": "Confirm Before Changes",
  "approval_required": true
}
```

### `/Users/sirinx/project-hermes/codex_telegram_bridge.py`
- Telegram-approved Hermes tasks → Codex CLI runs
- Validation before execution
- Sandbox enforcement (workspace-write)
- Receipt generation and archiving

## Safety Constraints (Cross-Phase)

These cannot be overridden:

1. **No secret access** - Never read `.env`, API keys, tokens
2. **No push/deploy** - No git push, no cloud deploy
3. **No live provider call** - No external API calls
4. **No GPU inference** - No inference execution
5. **No model download** - No weight downloads
6. **No live EdgeOne API** - No cloud API calls
7. **No cloud mutation** - No create/update/delete on cloud resources

## Canonical Terminology

| Term | Status |
|------|--------|
| brainstorm | **canonical** |
| beststorm | legacy alias |
| beststrom | invalid typo (rejected) |

## Integration Points

### Telegram → Hermes → Codex

```
Operator (Telegram)
    ↓
Telegram Bot (/command payload)
    ↓
Hermes Approvals (/status, /approve, /reject)
    ↓
codex_telegram_bridge.py
    ↓
validator.check.validate_task()
    ↓
Mission Card Dispatcher
    ↓
Claude Code (Codex Build Captain)
    ↓
Result → Telegram Reply
```

### A2A Sync Flow

```
Hermes (Commander)
    ↓ A2A packet
Codex (Build Captain)
    ↓ Mission Card
Worker (Kimi/GLM/DSP)
    ↓ Validation
KOB Validator
    ↓ Receipt
Archive (.ghostclaw_runtime/receipt/)
```

## Testing

### Unit Tests
```bash
cd ~/project-hermes
python3 tests/test_codex_telegram_bridge.py
python3 tests/test_telegram_sync.py
```

### Manual Test
```bash
cd ~/project-hermes
source .venv/bin/activate
python3 codex_telegram_bridge.py edit README.md::Add integration guide --plan-only
```

## Documentation References

- `docs/knowledge/KIMI_K2_7_CODE_GHOSTCLAW_WORKER.md`
- `docs/knowledge/EDGEONE_MAKERS_DEPLOYMENT_STRATEGY.md`
- `docs/knowledge/GITHUB_TOPTREND_AGENT_RESEARCH_WORKFLOW.md`
- `GHOSTCLAW/models/model-router.mjs`
- `GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml`

## Future Enhancements

- [ ] MoA-gated brainstorm sessions
- [ ] LatentMAS dual-plane execution
- [ ] GitHub Toptrend research automation
- [ ] EdgeOne readiness R3 checks
