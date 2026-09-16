# Sup-Agent Registry — Mac Mini M2 Full Auto

**Date:** 2026-06-30
**Host:** Mac mini M2

---

## 12 Sup-Agents

| Agent | Role | Authority |
|---|---|---|
| SupAgent_ChiefOfStaff | Mission decomposition, task graph, unblock safe work | Route only |
| SupAgent_Scheduler | Cronjob, heartbeat, night-watch, morning-report, archive-loop | Local scheduler only |
| SupAgent_Kanban_Steward | Kanban board, task state, blocked/DONE hygiene | Update Kanban + runtime tasks |
| SupAgent_Obsidian_Curator | Memory map, daily memory, knowledge index, context recall | Update Obsidian project brain only |
| SupAgent_Policy_Guardian | Action tier classification, block D/X, prevent unsafe escalation | Final policy gate |
| SupAgent_Validator | Tests, lint, typecheck, schema validation, diff check | Validation gate, receipts only |
| SupAgent_Receipt_Auditor | Receipts, checksums, evidence packs, decision records | Audit trail only |
| SupAgent_Codex_Bridge | Codex sidebar build routing, patch packets, validation loop | Local repo mutation with lease |
| SupAgent_ZCode_Bridge | ZCode/Z.ai long-context worker packet | Analysis/refactor only |
| SupAgent_MCP_Connector | Hermes MCP catalog, tool manifest, connector map | Config templates only |
| SupAgent_Dashboard_Watcher | Local Mission Control dashboard status | Local UI only |
| SupAgent_Cost_Guard | Prevent accidental paid provider/model calls | Block paid calls |
