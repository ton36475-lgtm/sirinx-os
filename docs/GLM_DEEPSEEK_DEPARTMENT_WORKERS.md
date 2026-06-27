# GLM / DeepSeek Department Workers

**Version:** 2.0
**Role:** Adaptive Coding Workers
**Reports to:** Codex Build Captain

---

## Worker Principle

Workers receive scoped coding tasks from Codex. They write code, run self-tests, and return patches. They do NOT design architecture, integrate, commit, or deploy.

## Department Assignments

### Marketing (ปลายฟ้า)
```
Code helper: GLM / DeepSeek
Files: server/departments/marketing/, client/src/components/ghostclaw/marketing/
Best for: Campaign logic, ad copy, STP analysis code, market data processing
Preference: GLM-5.2 for generation, DeepSeek for analysis
```

### Content (ศิลป์)
```
Code helper: GLM / DeepSeek
Files: server/departments/content/, client/src/components/ghostclaw/content/
Best for: Script generation, SEO logic, content quality checks
Preference: GLM-5.2 for drafts, DeepSeek for quality analysis
```

### Video (ตะวัน)
```
Code helper: GLM / DeepSeek
Files: server/departments/video/, client/src/components/ghostclaw/video/
Best for: Storyboard logic, AI character integration, render pipeline
Preference: GLM-5.2 for pipeline code, DeepSeek for optimization
```

### Admin & QA (เนื้อ)
```
Code helper: GLM / DeepSeek
Files: server/departments/admin/, server/qa/
Best for: Test generation, fact-checking logic, report templates
Preference: GLM-5.2 for test generation, DeepSeek for fact verification logic
```

### Finance (ทองแดง)
```
Code helper: GLM / DeepSeek (DeepSeek preferred)
Files: server/departments/finance/, client/src/components/ghostclaw/finance/
Best for: ROI calculations, revenue forecasting, budget optimization
Preference: DeepSeek preferred for all calculation-heavy tasks
```

## Worker Workflow

```
1. Receive task from Codex
2. Read Brain (CONTEXT_PACK)
3. Read assigned files (within lane)
4. Write code (within lane)
5. Run self-tests
6. Submit patch to Codex
7. Await integration result
```

## Lane Boundaries

| Rule | Enforcement |
|---|---|
| Write ONLY within assigned lane | Hard block |
| Cross-lane write | FORBIDDEN |
| Talk to other workers directly | FORBIDDEN |
| Commit code | FORBIDDEN |
