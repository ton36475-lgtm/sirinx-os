# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_B_CLICKUP.md
**Part B — ClickUp Integration Layer (Task Orchestration)**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## B.1 ClickUp API Capabilities (Research Summary)

### Core Functions
- **REST API v2**: Full CRUD on tasks, lists, spaces
- **Authentication**: OAuth 2.0, personal tokens, API key
- **Rate Limits**: 100 req/min per token
- **Webhooks**: Real-time task updates (taskCreated, taskUpdated, taskDeleted)

### Key Endpoints
```
GET    /api/v2/list/{list_id}/task           # List tasks
GET    /api/v2/task/{task_id}                # Get task
POST   /api/v2/list/{list_id}/task           # Create task
PUT    /api/v2/task/{task_id}                # Update task
DELETE /api/v2/task/{task_id}                # Delete task
GET    /api/v2/space/{space_id}/list         # Lists in space
POST   /api/v2/task/{task_id}/comment        # Add comment
GET    /api/v2/team                        # Workspaces
GET    /api/v2/task/{task_id}/time          # Time tracking
```

### Webhook Events
- `taskCreated`, `taskUpdated`, `taskDeleted`
- `taskCommentCreated`, `taskAssigneeUpdated`
- `timeTrackedUpdated`, `statusUpdated`
- `goalUpdated`, `projectUpdated`

---

## B.2 Task Synchronization Schema

### ClickUp State Mapping
```typescript
interface ClickUpTaskState {
  id: string;                    // ClickUp task ID
  sirinx_task_id: string;         // gc-xxxx mapping
  name: string;
  description: string;
  status: 'to do' | 'in progress' | 'review' | 'done';
  assignee: string[];             // Tony (owner) or agents
  priority: number;               // 1-4 (Urgent -> Low)
  due_date: string;
  tags: string[];                 // tier tags: [LOW], [MED], [HIGH]
  parent_task?: string;           // Parent for subtasks
  checklist: Array<{
    id: string;
    name: string;
    resolved: boolean;
  }>;
  time_spent: number;             // seconds
  custom_fields: Record<string, any>;
}
```

### Tier Mapping
```
ClickUp Priority 1 → SIRINX Tier HIGH (urgent manual review)
ClickUp Priority 2 → SIRINX Tier MED (abort window)
ClickUp Priority 3-4 → SIRINX Tier LOW (auto)
```

---

## B.3 Godmode ClickUp Commands

### /clickup-sync [space_id]
- Action: Full sync of ClickUp space to D1 tasks
- Risk Tier: MED (data mutation)
- Target: hermes-dispatch

### /clickup-task [title] [priority]
- Action: Create task in ClickUp + link to sirinx-os
- Risk Tier: LOW

### /clickup-status [task_id]
- Action: Get ClickUp task + sirinx state
- Risk Tier: LOW (read-only)

### /clickup-update [task_id] [status]
- Action: Update task status
- Risk Tier: LOW/MED

### /clickup-webhook
- Action: Register webhook endpoint
- Risk Tier: HIGH (infrastructure change)

---

## B.4 Integration Points
- **D1 Mapping**: ClickUp tasks ↔ sirinx tasks table
- **Telegram Notifications**: Sync status changes to chat
- **Linear Bridge**: ClickUp tasks → Linear tickets (if needed)
- **GODMODE Trigger**: `/task` command auto-creates ClickUp task