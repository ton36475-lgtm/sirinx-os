# SIRINX_OS_GODMODE_SKILL_MASTERPROMPT_PARTITION_C_GITHUB.md
**Part C — GitHub Integration Layer (Code Repository Automation)**
**Date:** 2026-07-14
**Safety:** DRY-RUN REFERENCE ONLY

---

## C.1 GitHub API Capabilities (Research Summary)

### Core Functions
- **REST API v3**: Complete git workflow automation
- **GraphQL API v4**: Efficient bulk queries
- **Authentication**: Fine-grained PAT, OAuth tokens
- **Webhooks**: Real-time push, PR, issue events

### Key Endpoints
```
GET    /repos/{owner}/{repo}/branches         # Branches
GET    /repos/{owner}/{repo}/commits            # Commits
POST   /repos/{owner}/{repo}/git/refs           # Create branch
POST   /repos/{owner}/{repo}/commits              # Create commit
POST   /repos/{owner}/{repo}/pulls               # Create PR
GET    /repos/{owner}/{repo}/pulls/{pr_number}/files  # PR files
POST   /repos/{owner}/{repo}/statuses/{sha}     # Commit status
POST   /repos/{owner}/{repo}/dispatches         # Trigger workflow
GET    /repos/{owner}/{repo}/actions/runs        # Workflow runs
GET    /users/{username}/events/public           # Activity feed
```

### Webhook Events
- `push`, `pull_request`, `pull_request_review`
- `issues`, `issue_comment`
- `workflow_run`, `check_suite`, `check_run`
- `release`, `deployment`

---

## C.2 Git Workflow Automation Schema

### GitHub State Mapping
```typescript
interface GitHubState {
  repo_full_name: string;       // owner/repo
  default_branch: string;
  current_branch: string;
  sirinx_branch: string;          // hermes/gc-xxxx format
  commit_sha: string;
  pr_number?: number;
  pr_status: 'draft' | 'open' | 'merged' | 'closed';
  check_runs: Array<{
    name: string;
    status: 'pending' | 'success' | 'failure' | 'skipped';
    conclusion: string;
  }>;
  workflow_status: 'in_progress' | 'completed' | 'failed';
}
```

### Branch Naming Convention
```
hermes/gc-xxxx          # Feature branch from task
hermes/GODMODE/yyyyMMdd  # GODMODE autonomous branch
```

---

## C.3 Godmode GitHub Commands

### /git-status
- Action: Show repo state + open PRs
- Risk Tier: LOW (read-only)

### /git-branch [task_id]
- Action: Create branch from task
- Risk Tier: LOW

### /git-commit [task_id] "message"
- Action: Create commit with changes
- Risk Tier: LOW/MED (writes code)

### /git-pr [task_id] [target]
- Action: Create PR to target branch
- Risk Tier: MED (MED if auto-merge, HIGH if main)

### /git-merge [pr_number]
- Action: Merge PR
- Risk Tier: HIGH (if target = main)

### /git-dispatch [workflow_id]
- Action: Trigger GitHub Actions workflow
- Risk Tier: MED/HIGH (depending on workflow)

---

## C.4 Integration Points
- **D1 Evidence**: Store PR/commit SHA in tasks table
- **Auto PR Creation**: GUARD pass → auto-create PR
- **Telegram Notify**: PR status changes to chat
- **Linear Sync**: Issues ↔ tasks mapping
- **Safety Gate**: `/merge main` always HIGH tier (human approval required)