# 10 — Department Worker Map

**Purpose:** Map GHOSTCLAW's 5 co-workers (departments) to agent workers

---

## Department Overview

GHOSTCLAW has 5 original co-workers, now mapped as departments with dedicated agent workers:

| # | Co-Worker | Department | Thai Name | Focus |
|---|---|---|---|---|
| 1 | Marketing | Marketing | ปลายฟ้า | STP, buyer persona, campaign strategy, budget, market analysis |
| 2 | Content | Content | ศิลป์ | Research, script writing, SEO, fact coordination, content quality |
| 3 | Video | Video | ตะวัน | Storyboarding, AI character, video production, platform optimization, audio |
| 4 | Admin/QA | Admin & QA | เนื้อ | Fact-checking, QA, project coordination, reports, timeline management |
| 5 | Finance | Finance | ทองแดง | Financial analysis, ROI, revenue forecasting, budget optimization, reporting |

---

## Worker Assignment Per Department

### Marketing (ปลายฟ้า)
```
Architecture: Opus
Build: Codex
Code helper: GLM / DeepSeek
Validation: KOB
Commander: Hermes
```

### Content (ศิลป์)
```
Architecture: Opus
Build: Codex
Code helper: GLM / DeepSeek
Validation: KOB
Commander: Hermes
```

### Video (ตะวัน)
```
Architecture: Opus
Build: Codex
Code helper: GLM / DeepSeek
Validation: KOB
Commander: Hermes
```

### Admin & QA (เนื้อ)
```
Architecture: Opus
Build: Codex
Code helper: GLM / DeepSeek
Validation: KOB (QA-specific)
Commander: Hermes
```

### Finance (ทองแดง)
```
Architecture: Opus
Build: Codex
Code helper: GLM / DeepSeek (DeepSeek preferred for calculations)
Validation: KOB
Commander: Hermes
```

---

## Department File Structure

```
server/departments/
  marketing/
  content/
  video/
  admin/
  finance/

client/src/components/ghostclaw/
  marketing/
  content/
  video/
  admin/
  finance/

docs/departments/
  MARKETING_AGENT.md
  CONTENT_AGENT.md
  VIDEO_AGENT.md
  ADMIN_QA_AGENT.md
  FINANCE_AGENT.md
```

## Routing Note

All department workers follow the same Authority Stack. The department only determines **which business domain** the code addresses, not **who has authority**.
