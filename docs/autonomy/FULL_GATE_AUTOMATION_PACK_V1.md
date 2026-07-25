# Full Gate Automation Pack V1
## SIRINX / Thaimart / LINE OA / GhostClaw

**Status:** FULL GATE AUTOMATION PACK V1  
**Mode:** HUMAN-APPROVED-OPEN-LOOP  
**Default Risk:** GREEN  
**Receipt Required:** TRUE  
**Telegram Command Center:** TRUE  
**Cloudflare Target:** DRY-RUN  
**Projects:** ALL-ACTIVE

---

## Lock Principles

1. **Spec-first** - All changes must follow spec-first workflow
2. **Dry-run** - All changes must be tested in dry-run mode first
3. **Telegram Human Approval** - All production mutations require Telegram approval
4. **Execute** - Only after approval
5. **Validate** - All changes must pass validation
6. **Receipt** - All changes must produce receipt

---

## Hard Constraints

| Constraint | Status |
|------------|--------|
| LOCAL_ONLY | ✅ |
| SPEC_FIRST | ✅ |
| No deploy | ✅ |
| No Cloudflare mutation | ✅ |
| No LINE live send | ✅ |
| No CRM write | ✅ |
| No secret read/print | ✅ |
| SIRINX on Thaimart Marketplace | ✅ |
| Taste Skill dials 7/4/6 | ✅ |

---

## Gate Requirements

All actions that touch production/customer data/LINE/Cloudflare/GitHub/Vercel/Supabase/Airtable/Canva must pass through Telegram gate first.

---

## Cloudflare Edge Architecture

### Workers Stack
```
Cloudflare Workers
├── Cron Triggers (Scheduled Tasks)
├── Queues (Task Queues)
├── D1 (Database)
├── KV (Key-Value Store)
├── R2 (Object Storage)
└── Workflows (Durable Workflows)
```

### Bindings
- D1: `SIRINX_STATE_DB`
- KV: `SIRINX_STATE_KV`
- R2: `SIRINX_ASSETS_R2`
- Queues: `SIRINX_TASK_QUEUE`
- Workflows: `SIRINX_WORKFLOWS`

---

## Telegram Command Center

### Command Syntax

```
/approve <gate_id> CODE=<approval_code> SCOPE=<exact_scope>
/reject <gate_id> REASON="<reason>"
/hold <gate_id> UNTIL=<ISO-8601> REASON="<reason>"
/gate list
/status <project_key>
/receipt latest
```

---

## GitHub Integration

### Environment Required Reviewers
- `main` branch: 2 reviewers required
- `production` branch: 3 reviewers required
- All PRs must pass CI/CD checks

---

## Supabase Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Service role can access all data
- Anonymous users have no access
- Authenticated users have limited access

---

## Vercel Deployment

### Gated Deployment
- Preview deployments: automatic
- Production deployments: require Telegram approval
- Rollback: automatic on failure

---

## Airtable / Canva / Manus Integration

### Integration Rules
- Only preview/brief/draft mode
- No publish until Telegram approval
- All actions logged with receipt

---

## Pack Registry JSON

```json
{
  "pack_id": "SRX_THAMART_SIRINX_FULL_GATE_AUTOMATION_WEEK_V1",
  "version": "1.0.0",
  "mode": "human-approved-open-loop",
  "default_risk": "green",
  "receipt_required": true,
  "telegram_command_center": true,
  "cloudflare_target": "dry-run",
  "projects": "all-active",
  "lock_principles": [
    "spec-first",
    "dry-run",
    "telegram-human-approval",
    "execute",
    "validate",
    "receipt"
  ],
  "hard_constraints": {
    "local_only": true,
    "spec_first": true,
    "no_deploy": true,
    "no_cloudflare_mutation": true,
    "no_line_live_send": true,
    "no_crm_write": true,
    "no_secret_read_print": true,
    "sirinx_on_thaimart_marketplace": true,
    "taste_skill_dials": "7/4/6"
  }
}
```

---

## Telegram Command Syntax

### Approval Commands
```
/approve <gate_id> CODE=<approval_code> SCOPE=<exact_scope>
/reject <gate_id> REASON="<reason>"
/hold <gate_id> UNTIL=<ISO-8601> REASON="<reason>"
/gate list
/status <project_key>
/receipt latest
```

---

## Agent Loop YAML

```yaml
agent_loop:
  name: "Full Gate Automation Loop"
  version: "1.0.0"
  
  phases:
    - name: "Inspect"
      tools: ["read_file", "list_directory", "search_files"]
      constraints: ["read-only"]
      
    - name: "Plan"
      tools: ["write_file"]
      constraints: ["local-only", "no-deploy"]
      
    - name: "Implement"
      tools: ["read_file", "write_file", "patch"]
      constraints: ["local-only", "dry-run"]
      
    - name: "Verify"
      tools: ["terminal", "read_file"]
      constraints: ["read-only", "test-mode"]
      
    - name: "Report"
      tools: ["write_file"]
      constraints: ["local-only"]
      
    - name: "Commit Ready"
      tools: ["read_file"]
      constraints: ["read-only"]
```

---

## Download ZIP

This pack can be downloaded as a ZIP file containing:
- Master Command Pack Markdown
- D1 / SQL Gate Schema
- Agent Loop YAML
- Telegram Command Syntax
- Pack Registry JSON