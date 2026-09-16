# GBrain Memory Layer - Graphify Structure

## Memory Classes

M0: Ephemeral task context
M1: Session working memory  
M2: Project state memory
M3: KMS / documentation memory
M4: Audit / provenance memory

## Graphify Layer

This folder provides a graph-structured memory layer on top of GBrain memory.

### Storage Schema

```json
{
  "nodes": [
    {
      "id": "task_001",
      "type": "task",
      "label": "Integrate Skills Security",
      "status": "completed",
      "agent": "Security Agent",
      "created_at": "2026-07-02T10:00:00+07:00",
      "properties": {
        "risk_level": "LOW",
        "files_touched": ["agents/security-agent.md"],
        "receipt": "~/.ghostclaw/receipts/security_task_001.json"
      }
    },
    {
      "id": "agent_security",
      "type": "agent",
      "label": "Security Agent",
      "capabilities": ["code_review", "threat_model", "compliance"],
      "allowed_toolsets": ["terminal", "file", "web"]
    }
  ],
  "edges": [
    {
      "source": "task_001",
      "target": "agent_security",
      "type": "executed_by",
      "properties": {
        "confidence": "high",
        "approval": "auto_approved"
      }
    }
  ]
}
```

### Graphify Query Pattern

```python
# Example query: Find all tasks by Security Agent with risk > LOW
def query_tasks_by_agent(agent_id: str, min_risk: str = "LOW"):
    # Load graph from memory/graph_index.json
    # Filter nodes by type="task", agent=agent_id, risk_level >= min_risk
    pass
```

### Graphify Commands (Future Implement)

| Command | Purpose |
|---------|---------|
| `graphify query <cypher>` | Query memory graph |
| `graphify add-task <desc>` | Add task node |
| `graphify link <src> <tgt> <type>` | Add edge |
| `graphify export` | Export to JSON Canvas |

### Current Implementation

- `graph_index.json` - Main graph file (append-only)
- `nodes/` - Individual node JSON files
- `edges/` - Edge records for audit trail

### Seeded Nodes

- `agent_engineering`
- `agent_security`
- `agent_product`
- `agent_technical_writer`
- `task_config_gate_runner_hardening_20260703`
- `task_codex_opencode_handoff_20260703`

### Safety Boundary

Graphify stores memory metadata only. It must not store `.env` values, API
keys, browser cookies, raw provider outputs, full command logs, or customer
data.
