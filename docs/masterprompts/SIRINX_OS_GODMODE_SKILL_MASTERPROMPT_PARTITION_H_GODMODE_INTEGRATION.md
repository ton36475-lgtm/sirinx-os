# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_H_GODMODE_INTEGRATION.md
**Part H — Godmode Skill Integration (Unified Command Center)**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## H.1 Full Integration Architecture

### Unified State Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    GODMODE SKILL ENGINE                           │
└─────────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌──────────┐       ┌──────────┐       ┌──────────┐
   │ TELEGRAM │       │ CLOUD LF │       │ LOCAL WS │
   │(Commands)│       │(Workers)  │       │(Mac M2)  │
   └────┬─────┘       └────┬─────┘       └────┬─────┘
         │                  │                  │
         └──────────────────┴──────────────────┘
                             │
                             ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                    LANGGRAPH STATE ENGINE                         │
   │  ┌──────────┬──────────┬──────────┬──────────┐                  │
   │  │  TRIAGE  │  MAKER   │ CHECKER  │  GUARD   │                  │
   │  └──────────┴──────────┴──────────┴──────────┘                  │
   └─────────────────────────────────────────────────────────────────┘
```

---

## H.2 Tier Classification Engine

### Action Manifest Schema
```typescript
interface ActionManifest {
  action_type: string;
  targets: string[]; // files, endpoints, services
  risk_flags: {
    writes_files: boolean;
    drops_tables: boolean;
    spends_money: boolean;
    exposes_secrets: boolean;
    force_push: boolean;
    dns_changes: boolean;
    public_publish: boolean;
  };
  estimated_tokens: number;
  estimated_cost_thb: number;
}

function classifyTier(manifest: ActionManifest): 'LOW' | 'MED' | 'HIGH' {
  // Hard-coded HIGH triggers (cannot be overridden by /godmode)
  const HARD_HIGH = [
    manifest.risk_flags.drops_tables,
    manifest.risk_flags.spends_money,
    manifest.risk_flags.exposes_secrets,
    manifest.risk_flags.force_push,
    manifest.risk_flags.dns_changes,
    manifest.risk_flags.public_publish,
  ];

  if (HARD_HIGH.some(f => f)) return 'HIGH';

  // Money threshold
  if (manifest.estimated_cost_thb > 5.0) return 'HIGH';
  if (manifest.estimated_cost_thb > 0.5) return 'MED';

  return 'LOW';
}
```

### /godmode Invariant
```
/godmode on|off ONLY controls:
- LOW tier auto-execution
- MED tier abort window

HIGH tier ALWAYS requires human approval regardless of godmode setting.
```

---

## H.3 Cross-Platform Command Execution

### TMUX Session Matrix
```
Session Name    | Platform   | Shell    | Purpose
----------------|------------|----------|------------------
hermes-master   | Mac M2     | zsh      | Master orchestration
claude-worker   | Mac M2     | zsh      | AST + Architecture
codex-worker    | Mac M2     | zsh      | Tests + Refactor
opencode-worker | PC Win     | pwsh     | Logic engine
hermes-gateway  | Mac M2     | zsh      | Telegram bridge
feed-hub        | Any        | any      | WebSocket state
```

### Command Injection Protocol
```typescript
interface InjectionPacket {
  task: string;
  context_snapshot: string;
  assigned_target: string; // tmux session
  tier: 'LOW' | 'MED' | 'HIGH';
  correlation_id: string;
}

function executeInTmux(packet: InjectionPacket): boolean {
  // Safety check: Verify lock ownership
  if (packet.tier !== 'LOW') {
    const lock = acquireDistributedLock('sirinx-os', packet.assigned_target);
    if (!lock.acquired) return false;
  }

  // Execute in tmux
  const cmd = `python3 .scripts/hermes-executor.py --task '${packet.task}'`;
  return tmuxSendKeys(packet.assigned_target, cmd);
}
```

---

## H.4 Evidence Chain Implementation

### Hash Chain Algorithm
```typescript
interface EvidenceChain {
  task_id: string;
  transitions: Array<{
    state_from: string;
    state_to: string;
    actor: string; // 'hermes', 'codex-worker', etc.
    evidence_hash: string;
    prev_hash: string;
    payload: any;
    timestamp: number;
  }>;

  computeHash(transition: Transition): string {
    const payload = JSON.stringify({
      ...transition,
      prev_hash: this.prev_hash,
    });
    return crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
  }
}
```

### Verification Endpoint
```
GET /api/chain/verify?from={hash}&to={hash}
Returns: { intact: boolean, break_at?: string }
```

---

## H.5 Safety Gate Invariants (Non-Negotiable)

### Panic Protocol
```
/panic ALWAYS:
1. Sets global_freeze = true in D1 config
2. Releases all Durable Object locks
3. Cancels all pending alarms
4. Replies: "🛑 SYSTEM FROZEN — /resume requires phrase"
```

### Resume Protocol
```
/resume REQUIRED:
1. Exact phrase: "RESUME GHOSTCLAW"
2. Clears global_freeze flag
3. Resets all circuit breakers
4. Replies: "✅ SYSTEM RESUMED"
```

### Approval Invariant
```
HIGH tier tasks:
- NEVER auto-approved
- 423 response to /execute-task if no approvals row
- Silence = rejection (no timeout)
- `/approve` must specify exact task_id
```

---

## H.6 Telegram Command Matrix

| Command | Tier | Action | Safety |
|---------|------|--------|--------|
| /task [desc] | LOW→HIGH | Create task | Tier classified |
| /status | LOW | Show system status | Read-only |
| /queue | LOW | List tasks | Read-only |
| /approve [id] | HIGH | Approve task | Human-only |
| /reject [id] | HIGH | Reject task | Human-only |
| /abort [id] | LOW | Abort low/MED | Auto |
| /godmode on/off | LOW | Toggle auto | Tier-invariant |
| /panic | LOW | Freeze all | Emergency |
| /resume | LOW | Unfreeze | Phrase-lock |
| /cost [project] | LOW | Show costs | Read-only |
| /deploy [env] | MED/HIGH | Deploy site | Tier-gated |
| /rollback [hash] | LOW | Rollback | Always safe |
| /audit | LOW | Show approvals | Read-only |
| /figma-[action] | LOW | Design ops | Read/Write |
| /clickup-[action] | LOW | Task sync | Read/Write |
| /git-[action] | LOW/MED/HIGH | Git ops | Per-action tier |
| /notion-[action] | LOW/MED | KB sync | Per-action tier |
| /linear-[action] | LOW/MED | Issue sync | Per-action tier |
| /sites-[action] | LOW/MED/HIGH | Deploy ops | Per-action tier |

---

## H.7 Integration Checklist

- [ ] All 6 API integrations (Figma, ClickUp, GitHub, Notion, Linear, Sites) wired
- [ ] Durable Object mutex for each integration
- [ ] Evidence hash chain for all state changes
- [ ] Telegram inline keyboards with nonce validation
- [ ] 2-tap HIGH approval flow
- [ ] Abort window live countdown
- [ ] Panic/resume with phrase lock
- [ ] Idempotency keys on all mutations
- [ ] Rate limiting per chat
- [ ] Circuit breakers on LLM calls
- [ ] Daily cost caps per project

---

**Next Phase:** Operator review required before:
- Building Rust Cargo workspace (P1-P6)
- Implementing Telegram UX (P7-P8)
- Deploying to Cloudflare Workers (P9-P11)