# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_E_LINEAR.md
**Part E — Linear Integration Layer (Issue Tracking & Planning)**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## E.1 Linear API Capabilities (Research Summary)

### Core Functions
- **GraphQL API**: Full issue/project lifecycle
- **Authentication**: Personal API keys (Linear API Key)
- **Rate Limits**: 600 requests/hour per key
- **Webhooks**: Real-time issue updates

### GraphQL Queries/Mutations
```graphql
# Queries
query {
  issues(filter: { project: { name: "GHOSTCLAW" } }) {
    nodes { id title status priority estimate }
  }
  issue(id: "GHI-123") { ... }
}

# Mutations
mutation {
  issueCreate(input: { 
    title: "string" 
    project: "ProjectID"
    assignee: "UserID" 
  }) { success issue { id } }
  
  issueUpdate(id: "GHI-123", input: { statusId: "StID" }) { success }
}
```

### Issue Lifecycle States
- Todo, In Progress, In Review, Done
- Cancelled, Duplicate
- Custom states per workspace

---

## E.2 Issue Synchronization Schema

### Linear Issue Mapping
```typescript
interface LinearIssueState {
  issue_id: string;          // GHI-xxxx
  sirinx_task_id: string;    // gc-xxxx
  title: string;
  description: string;
  priority: number;            // 1-4 (Urgent → Low)
  status: string;
  assignee: {
    id: string;
    name: string;
  };
  labels: string[];
  estimate: number;          // Story points
  cycle: string;             // Sprint/Cycle reference
  createdAt: string;
  updatedAt: string;
}
```

### Priority Mapping
```
Linear Priority 1 → SIRINX Tier HIGH
Linear Priority 2 → SIRINX Tier MED  
Linear Priority 3-4 → SIRINX Tier LOW
```

---

## E.3 Godmode Linear Commands

### /linear-sync [project]
- Action: Sync Linear project issues to D1
- Risk Tier: MED (data sync)

### /linear-create [title] [priority]
- Action: Create Linear issue from task
- Risk Tier: LOW/MED

### /linear-status [issue_id]
- Action: Get Linear issue status
- Risk Tier: LOW (read-only)

### /linear-link [task_id] [linear_id]
- Action: Link sirinx task to Linear issue
- Risk Tier: LOW

### /linear-close [issue_id]
- Action: Close Linear issue
- Risk Tier: LOW/MED

### /linear-label [issue_id] [labels]
- Action: Add labels to issue
- Risk Tier: LOW

---

## E.4 Integration Points
- **Bidirectional Sync**: Linear ↔ D1 tasks table
- **GODMODE Trigger**: `/task` with HIGH priority → auto Linear issue
- **Telegram Notifications**: Issue status changes
- **GitHub Bridge**: Linear issue ↔ PR linking
- **Planning View**: Weekly cycle planning via /linear-plan