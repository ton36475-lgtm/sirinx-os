# A2A Live Sync Documentation

**Status**: ✅ Production Ready
**Agents**: OpenCode, Cline, Hermes (with expansion slots)
**Architecture**: JSONL State Files + OmniRoute Webhooks + Hermes Coordination

---

## 🎯 Overview

A2A (Agent-to-Agent) Live Sync provides real-time state tracking and coordination for all AI coding agents in the SIRINX OS ecosystem. Each agent captures its operational state and syncs with a central coordination layer for cross-agent awareness and orchestration.

---

## 📋 Architecture

```
Agent CLI → Agent Sync Script → JSONL State → OmniRoute → Hermes → Obsidian
   ↓            ↓                ↓            ↓         ↓          ↓
Terminal   State Capture    Local File   Webhook   Coord.   Brain
```

### Components

1. **Agent Sync Scripts**: Bash scripts that capture agent state
2. **JSONL State Files**: Persistent local state storage
3. **OmniRoute Webhooks**: Real-time sync to coordination layer
4. **Hermes Orchestration**: Cross-agent coordination and decision making
5. **Obsidian Brain**: Long-term knowledge storage

---

## 🔧 Installation

All sync scripts are located in: `~/.hermes/profiles/solis/a2a-sync/`

### Available Sync Scripts

- `opencode-sync.sh` - OpenCode agent state tracking
- `cline-sync.sh` - Cline agent state tracking  
- `a2a-sync.sh` - Hermes/general agent state tracking

### Script Structure

Each script follows the same pattern:
```bash
# Start a session
script-name.sh start "task-identifier"

# Update progress
script-name.sh progress "Current status"

# Complete task
script-name.sh complete "Task finished"

# Report error
script-name.sh error "Error description"

# Show status
script-name.sh status
```

---

## 🚀 Usage

### OpenCode Workflows

```bash
# Start a task session
opencode-sync.sh start "feature-authentication"

# Execute OpenCode with monitoring
opencode "Implement OAuth login" | opencode-sync.sh monitor

# Manual progress updates
opencode-sync.sh progress "Working on database schema"
opencode-sync.sh progress "Implementing user endpoints"

# Complete or error reporting
opencode-sync.sh complete "Authentication feature complete"
opencode-sync.sh error "Tests failing: 3/10 passed"

# Check recent sessions
opencode-sync.sh status
```

### Cline Workflows

```bash
# Start a Cline session
cline-sync.sh start "refactor-api-layer"

# Execute Cline task with monitoring
cline-sync.sh run "Refactor the REST API layer"

# Manual updates
cline-sync.sh progress "Optimizing database queries"
cline-sync.sh progress "Adding caching layer"

# Complete or error reporting
cline-sync.sh complete "API refactoring complete"
cline-sync.sh error "API limit reached during task"

# Check recent sessions
cline-sync.sh status
```

### Direct Monitoring

```bash
# Monitor OpenCode output
opencode "Fix authentication bug" | opencode-sync.sh monitor

# Monitor Cline output
cline "Implement feature" | cline-sync.sh monitor

# Watch all agent activity
tail -f ~/.hermes/profiles/solis/a2a-sync/*_sessions.jsonl
```

---

## 📊 State Tracking

### Data Structure

Each state record contains:

```json
{
  "ts": "2026-07-21T11:29:08Z",
  "agent": "opencode",
  "action": "task_start",
  "session": "1737454148",
  "task": "feature-authentication",
  "branch": "migration/v5-rebase",
  "status": "M src/auth.py",
  "cwd": "/Users/sirinx/sirinx-os",
  "data": "Starting OpenCode task: feature-authentication"
}
```

### State Fields

- **ts**: UTC timestamp
- **agent**: Agent identifier (opencode/cline/hermes)
- **action**: Action type (task_start/task_progress/task_complete/task_error)
- **session**: Unique session ID
- **task**: Task identifier
- **branch**: Current git branch
- **status**: Git status (short format)
- **cwd**: Current working directory
- **data**: Custom data payload

---

## 🔗 Integration Points

### 1. Hermes Orchestration

```bash
# Dispatch task to OpenCode with tracking
opencode-sync.sh start "database-migration"
export TASK_ID="database-migration"
opencode "Run database migration" | opencode-sync.sh monitor

# Hermes can monitor progress
tail -f ~/.hermes/profiles/solis/a2a-sync/opencode_sessions.jsonl | grep "task_complete"
```

### 2. OmniRoute Coordination

```bash
# Check OmniRoute connectivity
curl http://localhost:20128/health

# View webhook sync status
curl http://localhost:20128/a2a/status
```

### 3. Cross-Agent Workflows

```bash
# Phase 1: OpenCode implementation
opencode-sync.sh start "api-refactor"
opencode "Refactor API endpoints" | opencode-sync.sh monitor

# Phase 2: Cline testing
cline-sync.sh start "api-testing"
cline "Test refactored API" | cline-sync.sh monitor

# Phase 3: Completion
opencode-sync.sh complete "API refactor and testing complete"
```

---

## 📈 Monitoring

### Real-Time Monitoring

```bash
# Watch all agent activity
tail -f ~/.hermes/profiles/solis/a2a-sync/*_sessions.jsonl

# Monitor specific agent
tail -f ~/.hermes/profiles/solis/a2a-sync/opencode_sessions.jsonl
tail -f ~/.hermes/profiles/solis/a2a-sync/cline_sessions.jsonl
```

### Status Queries

```bash
# Check OpenCode status
opencode-sync.sh status

# Check Cline status
cline-sync.sh status

# Parse with jq for analysis
tail -10 ~/.hermes/profiles/solis/a2a-sync/opencode_sessions.jsonl | jq '.'

# Count sessions by action
grep -c "task_complete" ~/.hermes/profiles/solis/a2a-sync/opencode_sessions.jsonl
grep -c "task_error" ~/.hermes/profiles/solis/a2a-sync/opencode_sessions.jsonl
```

### Performance Metrics

```bash
# Agent activity summary
for agent in opencode cline; do
    echo "$agent sessions:"
    grep -c "task_start" ~/.hermes/profiles/solis/a2a-sync/${agent}_sessions.jsonl
    grep -c "task_complete" ~/.hermes/profiles/solis/a2a-sync/${agent}_sessions.jsonl
    grep -c "task_error" ~/.hermes/profiles/solis/a2a-sync/${agent}_sessions.jsonl
done
```

---

## 🛡️ Production Considerations

### State Management

- **Persistence**: All states stored in JSONL files for durability
- **Recovery**: Session IDs enable state reconstruction
- **Backup**: Regular backups of A2A directory recommended
- **Cleanup**: Implement rotation for large state files

### Error Handling

- **Webhook Failures**: OmniRoute sync failures are silent (logged only)
- **Git Errors**: Gracefully handled when not in git repository
- **File Permissions**: Scripts ensure directory existence
- **Invalid Input**: Scripts validate parameters and show usage

### Security

- **Local Only**: No external API calls except localhost OmniRoute
- **No Secrets**: State files contain no sensitive information
- **Git Context**: Branch and status captured but no commit content
- **Working Directory**: Full path captured but no file content

---

## 🔮 Future Enhancements

### Planned Features

1. **Additional Agents**
   - Codex sync integration
   - Claude Code sync patterns
   - Custom agent support

2. **Enhanced Monitoring**
   - Real-time dashboard
   - Performance metrics
   - Error alerting

3. **State Recovery**
   - Session resumption
   - State rollback
   - Conflict resolution

4. **Coordination Features**
   - Multi-agent task chains
   - Dependency management
   - Parallel execution

### Integration Opportunities

- **GhostClaw Governance**: Approval workflows
- **OmniRoute Load Balancing**: Provider-aware routing
- **Obsidian Brain**: Enhanced knowledge capture
- **Hermes Superpowers**: Task orchestration

---

## 📝 Troubleshooting

### Common Issues

**Issue**: Script not executable
```bash
chmod +x ~/.hermes/profiles/solis/a2a-sync/opencode-sync.sh
chmod +x ~/.hermes/profiles/solis/a2a-sync/cline-sync.sh
```

**Issue**: No state files created
```bash
# Check directory permissions
ls -la ~/.hermes/profiles/solis/a2a-sync/

# Test manually
cd /Users/sirinx/sirinx-os
opencode-sync.sh start "test"
cat ~/.hermes/profiles/solis/a2a-sync/opencode_sessions.jsonl
```

**Issue**: OmniRoute sync not working
```bash
# Check OmniRoute status
curl http://localhost:20128/health

# Start OmniRoute if needed
cd ~/sirinx-os/integrations/omniroute && npm run dev
```

---

## 🎯 Quick Start

```bash
# 1. Test OpenCode sync
opencode-sync.sh start "test-session"
opencode-sync.sh progress "Testing integration"
opencode-sync.sh complete "Test successful"
opencode-sync.sh status

# 2. Test Cline sync
cline-sync.sh start "cline-test"
cline-sync.sh progress "Testing Cline"
cline-sync.sh complete "Cline sync working"
cline-sync.sh status

# 3. Monitor all activity
tail -f ~/.hermes/profiles/solis/a2a-sync/*_sessions.jsonl
```

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-07-21  
**Version**: 1.0  
**Agents**: OpenCode, Cline, Hermes  
**Architecture**: JSONL + OmniRoute + Hermes Coordination