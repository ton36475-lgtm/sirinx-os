# 15 — Decision Log

**Purpose:** Record all architectural and mission decisions

---

## Format

```markdown
## DEC-YYYY-MMDD-NNN

**Date:** YYYY-MM-DD HH:MM
**Decided by:** [agent name / role]
**Domain:** [architecture / mission / routing / safety]
**Decision:** [what was decided]
**Rationale:** [why]
**Alternatives considered:** [what else was evaluated]
**Impact:** [what changes because of this]
**References:** [related files, brain entries]
```

## Active Decisions

### DEC-2026-0627-001
**Date:** 2026-06-27
**Decided by:** Hermes Commander
**Domain:** Architecture
**Decision:** Adopt GHOSTCLAW Hermes Commander A2A2A OS v2.0 authority stack
**Rationale:** Replace flat agent team with hierarchical command for better safety, auditability, and clear ownership
**Alternatives considered:** Keep flat Codex-led model; rejected because no clear build captain or mission commander
**Impact:** New Authority Stack, new Brain, new Runtime, new Protocols
**References:** GHOSTCLAW/MASTER.md, GHOSTCLAW/AGENTS.md

### DEC-2026-0627-002
**Date:** 2026-06-27
**Decided by:** Hermes Commander
**Domain:** Mission
**Decision:** First lane is HERMES_COMMANDER_A2A2A_SCAFFOLD — brain + runtime only, no business logic
**Rationale:** Must establish brain and protocols before any code changes
**Impact:** All subsequent lanes depend on scaffold completion
**References:** _OBSIDIAN_GHOSTCLAW_BRAIN/18_BUILD_LANES.md

---

*Additional decisions logged here as they occur.*
