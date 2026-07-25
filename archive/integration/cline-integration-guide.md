# Cline Integration Guide for SIRINX OS

## Status: ✅ READY FOR INTEGRATION

Cline v3.0.46 is installed and configured for SIRINX OS workflow integration.

## 🎯 Purpose

Cline is an autonomous AI coding assistant that integrates with your existing SIRINX OS infrastructure:

- **MCP Integration**: OmniRoute + SIRINX file system access
- **API Configuration**: MaxPlus provider (with fallback options)
- **Workflow**: CLI-first, TUI mode, plan mode, auto-approve
- **Governance**: Ready for GhostClaw Tier B integration

## 📋 Current Configuration

**Provider**: OpenAI-compatible via MaxPlus
- Base URL: `https://api.maxplus-ai.cc/v1`
- Model: `moonshot-v1-128k`
- API Key: Configured (MAXPLUS_API_KEY_1)

**MCP Servers**:
- OmniRoute: `localhost:20128` (AI routing)
- SIRINX Files: `/Users/sirinx/sirinx-os` (codebase access)

## 🚀 Usage Patterns

### 1. Direct CLI Usage
```bash
# Simple task
cline "Fix the authentication bug in src/auth.py"

# With auto-approval for autonomous tasks
cline --auto-approve true "Refactor the database layer"

# Plan mode for complex tasks
cline --plan "Design the new API rate limiting system"
```

### 2. MCP-Enhanced Tasks
```bash
# With full SIRINX codebase context
cline --compaction agentic "Implement the new feature using the existing SIRINX patterns"

# TUI mode for interactive sessions
cline -i "Review the entire codebase for security issues"
```

### 3. Integration Workflows

**A) GhostClaw Orchestrated**
- Use Hermes to trigger Cline for specific coding tasks
- Maintain A2A sync for session state
- Apply Tier B governance (approval for external actions)

**B) Standalone Autonomous**
- Direct CLI usage for rapid development
- OmniRoute integration for model selection
- Built-in MCP context for codebase awareness

**C) Hybrid Pipeline**
- Plan mode: Generate implementation plans
- Execute mode: Build features with auto-approval
- Review mode: Code quality and security checks

## 🔧 Configuration Options

### Provider Configuration
```bash
# Switch to OmniRoute (recommended for production)
cline auth omniroute

# Use specific model
cline -P omniroute -m claude-sonnet-4 "Task description"

# Set API key directly
cline -k "YOUR_API_KEY" "Task description"
```

### Mode Selection
```bash
# Plan mode (no execution)
cline -p "Design the new authentication system"

# Act mode (default, executes changes)
cline "Implement the authentication system"

# TUI mode (interactive)
cline -i "Complex multi-step task"
```

### Advanced Options
```bash
# Working directory
cline -c /path/to/project "Task"

# Background session
cline -z "Long-running task"

# Resume session
cline --id session-id "Continue task"
```

## ⚡ Integration with SIRINX OS

### A2A Synchronization
Cline sessions can be synced with your A2A infrastructure:
```bash
# Create session with A2A sync
cline --id "sirinx-session-$(date +%s)" "Task that needs A2A coordination"
```

### OmniRoute Integration
```bash
# Use OmniRoute for model selection and load balancing
cline -P omniroute --thinking high "Complex architectural task"
```

### MCP Context
- **OmniRoute MCP**: Provides model routing and capability discovery
- **SIRINX Files MCP**: Full codebase access for context-aware tasks

## 🛡️ Governance and Safety

### Autonomy Classification
- **Default**: Tier B (A4-A5 capabilities)
- **File Operations**: A5 (approval required for destructive actions)
- **External API Calls**: A5 (approval required)
- **Code Generation**: A4 (bounded autonomy within allowlist)

### Safety Rules
1. **Never**: Auto-deploy to production without explicit approval
2. **Never**: Push to git without human review and approval
3. **Never**: Modify .env files with real secrets
4. **Never**: Execute untrusted shell commands
5. **Always**: Use worktrees for experimental features
6. **Always**: Maintain audit trail of Cline sessions
7. **Always**: Verify generated code before integration

### Approval Workflow
```bash
# Plan mode first (no execution)
cline -p "Design the feature"

# Review the plan
cat ~/.cline/data/sessions/latest/plan.md

# Execute with human supervision
cline --id latest "Execute the approved plan"
```

## 🔍 Troubleshooting

### API Limits
If you hit API limits:
```bash
# Check current provider
cline auth list

# Switch to alternative provider
cline auth omniroute

# Or use direct API key
cline -k "BACKUP_KEY" "Task"
```

### MCP Issues
```bash
# Verify MCP servers are running
curl http://localhost:20128/health

# Check Cline MCP configuration
cat ~/.cline/mcp_settings.json

# Test MCP connectivity
cline --verbose "Simple test task"
```

### Session Management
```bash
# List recent sessions
cline --list

# Resume specific session
cline --id session-id

# Clear stuck sessions
rm -rf ~/.cline/data/sessions/session-id
```

## 📊 Monitoring

### Usage Tracking
```bash
# Check session history
ls -la ~/.cline/data/sessions/

# View recent session details
cat ~/.cline/data/sessions/latest/meta.json

# Monitor API usage
grep -r "api_calls" ~/.cline/data/
```

### Cost Management
- Use plan mode for expensive operations
- Limit concurrent sessions
- Configure timeout for long-running tasks
- Monitor token usage in session logs

## 🎯 Next Steps

1. **Test Integration**: Run a simple task to verify MCP connectivity
2. **Configure OmniRoute**: Switch from MaxPlus to OmniRoute for production
3. **Setup Governance**: Integrate with GhostClaw approval workflows
4. **Create Skills**: Build SIRINX OS skills that leverage Cline capabilities
5. **Monitor Usage**: Set up tracking for API costs and session patterns

## 📝 Example Workflows

### Feature Development
```bash
# 1. Plan phase
cline -p "Design user authentication system"

# 2. Review and approve plan
cat ~/.cline/data/sessions/latest/plan.md

# 3. Execute with supervision
cline --id latest "Implement the approved design"

# 4. Review and test
cline -i "Review the implementation and create tests"
```

### Code Refactoring
```bash
# Analyze current structure
cline -p "Analyze the current codebase structure"

# Plan refactoring
cline --id latest "Plan refactoring strategy"

# Execute with approval
cline --id latest --auto-approve false "Execute refactoring"
```

### Bug Investigation
```bash
# Investigate issue
cline "Investigate the authentication bug reported in issue #42"

# Propose fix
cline --id latest -p "Propose fix for the identified issue"

# Execute fix
cline --id latest "Implement the approved fix"
```

---

**Integration Status**: ✅ Ready for Production
**Last Updated**: 2025-01-21
**Version**: Cline 3.0.46
**Provider**: MaxPlus / OmniRoute (configurable)
**Governance**: GhostClaw Tier B