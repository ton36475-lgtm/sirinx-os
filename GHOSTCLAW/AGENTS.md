# GHOSTCLAW AGENTS.md

**Status:** Canonical operating file for GHOSTCLAW subsystem
**Parent:** SIRINX OS AGENTS.md (root)
**Scope:** GHOSTCLAW Hermes Commander A2A2A OS v2.0

---

## 0. GHOSTCLAW Constitution

GHOSTCLAW is the **agent runtime engine** of SIRINX OS, operating under the **Hermes Commander A2A2A Authority Stack**. It implements the Fleet-Ship-Crew model with strict hierarchical command.

Every agent in GHOSTCLAW must answer:

```text
Who is my commander?
What is my lane?
What is my co-worker role?
What actions can I take?
What actions require approval?
Who do I escalate to?
```

---

## 1. Authority Chain (Immutable)

```
Human Operator
    ↓
Hermes Mission Commander ← Supreme authority within GHOSTCLAW
    ↓
Opus Chief Architect ← Design authority (no execution)
    ↓
Codex Build Captain ← Repo execution authority
    ↓
GLM / DeepSeek Workers ← Module-level execution
    ↓
KOB Validator ← Verification only
    ↓
Command Broker ← Final execution gate
    ↓
Mission Control ← Audit and state tracking
```

**No agent may skip a level in the chain.** Workers report to Codex, not directly to Hermes. Opus designs for Hermes, not for Workers directly.

---

## 2. File Ownership

### 2.1 Exclusive Lanes

| Lane | Owner Ship | Files |
|---|---|---|
| GHOSTCLAW Core | Flagship (Hermes) | `GHOSTCLAW/**` |
| Agent Definitions | Flagship (Hermes) | `.thclaws/agents/**` |
| KMS / Brain | Flagship (Scribe) | `.thclaws/kms/**`, `brain/**` |
| Services | Build Ops | `services/**` |
| Packages | Build Ops | `packages/**` |
| Apps | Build Ops + FE/BE | `apps/**` |
| Tests | QA | `tests/**` |
| Config | Integration | `config/**` |

### 2.2 Cross-Lane Access

- **Read:** All agents can read any file
- **Write:** Only within assigned lane
- **Cross-lane write:** Must go through Hermes → target ship Captain

---

## 3. Agent Registration

Every agent must have an Agent Card in `GHOSTCLAW/agents/` with:

```yaml
Required fields:
  - Role
  - Purpose
  - Allowed Inputs
  - Allowed Tools
  - Forbidden Tools
  - Outputs
  - Approval Required For
  - Memory Permissions
  - Cost Budget
  - Stop Conditions
  - Escalation
  - Model Assignment
  - Autonomy Level
```

---

## 4. Mission Rules

1. Every mission starts with a Mission Card from Hermes
2. No mission executes without architecture review (Opus) for new features
3. No code is committed without test validation (KOB)
4. No code is pushed without human approval
5. Every mission ends with a Brain update (Scribe)
6. Every blocked/failed mission logs to Vault audit

---

## 5. Safety Inheritance

GHOSTCLAW inherits all safety rules from root `AGENTS.md`:

- No deploy without human approval
- No git push without human approval
- No cloud mutation without human approval
- No .env reads
- No secrets in context
- Dry-run first for external actions

GHOSTCLAW adds:
- No cross-lane writes without Hermes routing
- No worker-to-worker direct communication
- No architecture decisions by Workers
- No validation bypass by Engineers

---

## 6. Testing Requirements

Every lane must provide:

```yaml
unit_tests: true
integration_tests: true (where lane boundary crosses)
type_check: true
lint: true
validation_report: true
```

---

## 7. Approval Matrix

| Action | Worker | Codex | Hermes | Human |
|---|---|---|---|---|
| Read file | ✅ | ✅ | ✅ | ✅ |
| Write within lane | ❌ | ✅ | ✅ | ✅ |
| Cross-lane write | ❌ | ❌ | ✅ | ✅ |
| Git commit | ❌ | ❌ | ✅ | ✅ |
| Git push | ❌ | ❌ | ❌ | ✅ |
| Deploy | ❌ | ❌ | ❌ | ✅ |
| External API | ❌ | ❌ | ❌ | ✅ |

---

## 8. GHOSTCLAW Commands

```bash
# Validate entire GHOSTCLAW system
pnpm ghostclaw:validate

# Check agent roster
ls GHOSTCLAW/agents/

# Validate A2A2A schema
python3 -m json.tool GHOSTCLAW/protocols/a2a2a-message-schema.json

# Check fleet status (future)
thclaws fleet status

# Run GHOSTCLAW test suite
pnpm ghostclaw:test
```
