# OBRA Superpowers Workflow - SIRINX OS Integration

**Version:** 1.0.0  
**Status:** Active  
**Skill:** `obra-superpowers-workflow`

---

## Overview

5-phase development methodology integrated into SIRINX OS:

1. **Brainstorming** → Design Document + Visual Companion
2. **Writing Plans** → Task decomposition + file scope
3. **Subagent Development** → Parallel `delegate_task` execution
4. **TDD** → RED-GREEN-REFACTOR cycle
5. **Systematic Debugging** → 4-phase root cause investigation

---

## Command Interface

### Usage via Hermes Agent

```bash
# Solar feature development
/solar เพิ่มระบบคำนวณ ROI สำหรับโซลาร์เซลล์

# Automation workflow
/automation สร้าง webhook handler สำหรับ LINE live chat

# Research workflow
/research วิเคราะห์ firecrawl vs scrapy สำหรับ knowledge base

# Debugging workflow
/debug ตรวจสอบว่าทำไม vector search ช้า

# Generic OBRA workflow
/obra สร้าง approval queue system สำหรับ AI replies
```

### Programmatic Usage

```typescript
import { runObraWorkflow } from '@/workflows/obra';

// Direct execution
const result = await runObraWorkflow({
  goal: 'เพิ่มระบบคำนวณ ROI สำหรับโซลาร์เซลล์',
  phase: 'all', // or 'brainstorming' | 'planning' | 'subagent' | 'tdd' | 'debug'
  context: {
    scope: ['apps/web-opal/**', 'services/api-opal/**'],
    constraints: ['No deploy', 'No push', 'Mock provider only'],
    maxAttempts: 3
  }
});
```

---

## Phase Details

### Phase 1: Brainstorming (สัมภาษณ์และออกแบบ)

**Triggers:**
- User provides high-level goal without specification
- New feature requiring architecture decisions
- Unclear requirements or technical approach

**Actions:**
1. ถามผู้ใช้ 2-3 คำถาม:
   - แหล่งข้อมูล/requirements หลักอยู่ที่ไหน?
   - มี constraints พิเศษไหม? (performance, security, compliance)
   - ต้องการ visual companion ไหม? (diagram, mockup, architecture)

2. สร้าง Design Document:
   - Problem statement
   - Proposed solution
   - Architecture diagram (Excalidraw/Mermaid)
   - Data flow
   - Security considerations

3. เสนอ Visual Companion (ถ้าจำเป็น):
   - `excalidraw` for hand-drawn diagrams
   - `architecture-diagram` for cloud/infra diagrams
   - `frontend-design` for UI mockups

**Output:**
- `docs/design/[feature-name].md`
- `docs/design/[feature-name].excalidraw` (optional)
- Clarified requirements for Phase 2

---

### Phase 2: Writing Plans (แผนการทำงาน)

**Triggers:**
- Brainstorming complete
- Requirements are clear
- Ready for task decomposition

**Actions:**
1. แตกงานใหญ่เป็น tasks ย่อย ๆ:
   ```yaml
   tasks:
     - id: task-001
       description: "Create base schema for solar leads"
       files:
         - packages/types/src/solar-lead.ts
         - packages/database/migrations/001_solar_leads.sql
       tests:
         - "packages/database/test/solar-lead.test.ts"
       assignee: "subagent-codex-1"
     
     - id: task-002
       description: "Implement ROI calculator engine"
       files:
         - services/api-opal/lib/roi-engine.ts
       tests:
         - "services/api-opal/test/roi-engine.test.ts"
       assignee: "subagent-codex-2"
   ```

2. ระบุไฟล์ที่ต้องแก้/สร้าง:
   - File scope (allowed paths)
   - Forbidden paths (AGENTS.md compliance)
   - Dependencies to add

3. กำหนดวิธีทดสอบ:
   - Unit test coverage
   - Integration test scenarios
   - Manual QA steps

**Output:**
- `docs/implementation-plans/[feature-name].md`
- Task list ready for Phase 3

---

### Phase 3: Subagent Development

**Triggers:**
- Plan approved
- Tasks defined
- Ready for parallel execution

**Actions:**
1. สร้าง Subagent แยกกันทำแต่ละ Task:
   ```python
   # Via Hermes Agent
   delegate_task(
       tasks=[
           {"goal": "Create base schema for solar leads", "context": "..."},
           {"goal": "Implement ROI calculator engine", "context": "..."},
           {"goal": "Write API endpoints for ROI calculation", "context": "..."},
           {"goal": "Add integration tests for ROI pipeline", "context": "..."}
       ]
   )
   ```

2. Reviewer Subagent ตรวจผลงาน:
   ```python
   delegate_task(
       goal="Review all code from Phase 3 subagents",
       context="""
       Check for:
       - AGENTS.md compliance
       - TypeScript errors
       - Test coverage
       - Security issues
       - Code quality
       """
   )
   ```

3. วน loop จนกว่าจะผ่าน:
   - If reviewer rejects → fix → resubmit
   - Max 3 attempts → escalate to human

**Output:**
- Completed code files
- Review feedback documented
- Ready for Phase 4

---

### Phase 4: Test Driven Development

**Triggers:**
- Subagent code written
- Ready for test-first refinement

**Actions:**
1. เขียน Test ก่อน Production Code:
   - RED: Write failing test
   - GREEN: Make it pass
   - REFACTOR: Clean up

2. บังคับ RED-GREEN-REFACTOR cycle:
   ```typescript
   // RED
   test('ROI calculation with zero consumption returns 0', () => {
     expect(calculateROI({ consumption: 0 })).toBe(0);
   });

   // GREEN
   function calculateROI(params: SolarParams): number {
     if (params.consumption === 0) return 0;
     // ...
   }

   // REFACTOR
   // Extract to shared utility
   ```

3. ห้ามแอบเขียนโค้ดโดยไม่มี Test:
   - Enforce via `test-driven-development` skill
   - Check test coverage before merge

**Output:**
- Test suite with >80% coverage
- All tests passing
- Production code verified

---

### Phase 5: Systematic Debugging

**Triggers:**
- Tests failing
- Unexpected behavior
- Performance issues

**Actions:**
1. 4 Phase การสืบสวน:
   - **Understand:** What is the problem? Gather evidence.
   - **Reproduce:** Create minimal reproduction case.
   - **Fix:** Implement minimal fix.
   - **Verify:** Ensure fix works and no regressions.

2. หา Root Cause ก่อนแก้:
   - Use logs, traces, debuggers
   - Check sibling code paths for same bug
   - Fix class, not just symptom

3. หยุดถ้าแก้ 3 ครั้งไม่หาย:
   - Re-examine architecture
   - Redesign approach
   - Escalate to human

**Output:**
- Root cause identified
- Fix applied
- Regression tests added
- Debug log documented

---

## Integration with SIRINX OS

### Skill Loading

The workflow automatically loads these skills:

```python
skills = [
    'brainstorming',           # Phase 1
    'writing-plans',           # Phase 2
    'subagent-driven-development',  # Phase 3
    'test-driven-development', # Phase 4
    'systematic-debugging'     # Phase 5
]
```

### AGENTS.md Compliance

All phases obey AGENTS.md rules:

```yaml
constraints:
  - No deploy without explicit approval
  - No git push without explicit approval
  - No cloud mutation without approval
  - No secrets exposure
  - PII masking required
  - Dry-run first for external actions

file_scope:
  allowed:
    - apps/**
    - services/**
    - packages/**
  forbidden:
    - .env
    - infra/cloudflare/** (without approval)
    - production deploy scripts
```

---

## Example Execution

### Scenario: Knowledge Base Scraper

```bash
/obra เพิ่มระบบ scrape knowledge base จากเว็บไซต์
```

**Phase 1 - Brainstorming:**
```
ถาม:
1. แหล่งที่มาเว็บไซต์อะไรบ้าง?
2. ต้องการ schedule รันเมื่อไหร่?
3. ต้องการ process data รูปแบบไหน? (markdown, plain text, JSON)
```

**Phase 2 - Writing Plans:**
```yaml
tasks:
  - id: scrape-service
    description: "Build firecrawl scraper with rate limiting"
    files:
      - services/firecrawl-scraper/
    tests:
      - "services/firecrawl-scraper/test/rate-limit.test.ts"
  
  - id: data-processor
    description: "Create data processor for markdown cleaning"
    files:
      - services/data-processor/
    tests:
      - "services/data-processor/test/clean-markdown.test.ts"
  
  - id: vector-store
    description: "Set up vector store with R2 backend"
    files:
      - packages/vector-store/
    tests:
      - "packages/vector-store/test/r2-backend.test.ts"
  
  - id: integration
    description: "End-to-end pipeline test"
    files:
      - tests/integration/kb-pipeline.test.ts
```

**Phase 3 - Subagent Execution:**
```python
delegate_task(tasks=[
    {"goal": "Build firecrawl scraper with rate limiting"},
    {"goal": "Create data processor for markdown cleaning"},
    {"goal": "Set up vector store with R2 backend"},
    {"goal": "Write integration tests for pipeline"}
])
```

**Phase 4 - TDD:**
```typescript
// RED
test('scraper respects rate limit of 10 req/sec', async () => {
  const scraper = new FirecrawlScraper({ rateLimit: 10 });
  const startTime = Date.now();
  await scraper.scrapeUrls(urls);
  const duration = Date.now() - startTime;
  expect(duration).toBeGreaterThanOrEqual(1000); // 10 URLs, 10 req/sec
});

// GREEN
class FirecrawlScraper {
  async scrapeUrls(urls: string[]) {
    const promises = urls.map(url => 
      this.rateLimiter.throttle(() => this.scrape(url))
    );
    await Promise.all(promises);
  }
}

// REFACTOR
// Extract to shared RateLimiter utility
```

**Phase 5 - Debug (if needed):**
```
Issue: Scraping fails on some URLs
Understand: Check logs, status codes, error messages
Reproduce: Run single failing URL in isolation
Fix: Add retry logic with exponential backoff
Verify: Run test suite again
```

---

## Exit Criteria

Workflow complete when:

- [ ] **Phase 1**: Design document created and approved
- [ ] **Phase 2**: Implementation plan with tasks defined
- [ ] **Phase 3**: All subagent tasks completed and reviewed
- [ ] **Phase 4**: All tests pass (RED-GREEN-REFACTOR verified)
- [ ] **Phase 5**: No outstanding bugs (or documented as known issues)
- [ ] **AGENTS.md**: No secrets, no deploy, no push without approval
- [ ] **Documentation**: Code comments, README, design docs updated
- [ ] **Integration**: Works with existing system (no regressions)

---

## Monitoring & Observability

Each phase produces structured output:

```json
{
  "workflow": "obra-superpowers",
  "phase": "subagent-development",
  "task_id": "task-001",
  "status": "completed",
  "duration_ms": 45000,
  "subagents": [
    {"id": "subagent-1", "goal": "...", "status": "completed"}
  ],
  "files_created": [
    "services/api-opal/lib/roi-engine.ts"
  ],
  "tests_passed": 12,
  "tests_failed": 0
}
```

These events are logged to:
- Console output
- `memory/live/` session logs
- GitHub Actions (if running in CI)

---

## References

- **Skill**: `obra-superpowers-workflow`
- **Original Doc**: `workflows/obra-superpowers-workflow.md` (this file)
- **Related Skills**: `brainstorming`, `writing-plans`, `subagent-driven-development`, `test-driven-development`, `systematic-debugging`
- **AGENTS.md**: Root operating constitution
- **CLAUDE.md**: Claude-specific operating notes

---

**Last Updated:** 2026-07-18  
**Maintained By:** SIRINX OS AI Agents
