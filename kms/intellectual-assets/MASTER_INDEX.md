# MASTER_INDEX — Intellectual Assets (SIRINX)

> สารบัญและ map การใช้ assets ทั้ง 3 modules — วาง context เสมอก่อนให้ AI ทำอะไรใหม่
> Portable ไป Claude Code / Grok / Codex / Hermes / local Ollama ได้ทันที

---

## Module A — Operator OS (SIRINX OS Core)

| File | Purpose | Use in AI context |
|------|---------|-----------------|
| PERSONA.md | กิจวัตรหลัก ค่านิยม ระดับออโตนมีซี | วาง context ทุก task ระดับระบบ |
| DECISION_FRAMEWORKS.md | Pipeline vs Agent, ระดับออโตนมีซี, Release gates | ใช้ F1–F8 เลือกเส้นทางออกแบบ |
| SOP_LIBRARY.md | ขั้นตอนมาตรฐาน | ใช้ SOP-01 ก่อนเขียนโค้ด, SOP-04 เมื่อมีมาสก์ |
| PROMPT_LIBRARY.md | เทมเพลต prompt ใช้ซ้ำ | copy P1–P7 ไปใช้ใน workflow ต่าง ๆ |

## Module B — Solar GOD AI (Sirinx Solar)

| File | Purpose | Use |
|------|---------|-----|
| PERSONA.md | ตัวตนโซลาร์ (ธุรกิจไทย, claim-safe) | Customer-facing contexts |
| BRAND_VOICE.md | เสียงแบรนด์, Do/Dont, examples | Copy/marketing/reply to customers |
| SOP_CONSULT.md | กระแส consult (intake → handoff) | Live studio, LINE, web lead flow |
| REPLY_LIBRARY.md | เทมเพลต reply ที่ผ่าน claim guard | Safe reference หรือใช้ตรง ๆ |
| KNOWLEDGE_BASE.md | ความรู้ solar tech + Solis data | Answer technical solar questions |

## Module C — Founder Persona

| File | Purpose | Use |
|------|---------|-----|
| THINKING_OS.md | Brainstorm 4-round loop, kill criteria | โครงสร้างการคิดงาน architecture |
| COMMUNICATION_STYLE.md | Voice, structure, no-hype rules | Content, socials, docs ทุกชนิด |
| DECISION_JOURNAL.md | Revenue-first triage, build/buy rules | Prioritisation และ roadmap |
| MEMORY_SYSTEM.md | การเก็บ/เรียกคืน knowledge | Knowledge mgmt, Obsidian sync |

---

## Quick-start prompt for any AI tool

```text
You are operating under SIRINX Intellectual Assets. Read:
1. MASTER_INDEX.md (this file)
2. PERSONA.md (whichever module fits your task)
3. DECISION_FRAMEWORKS.md (always)
4. Relevant SOP_/REPLY_/KB file for the task

Follow:
- Claim policy (AGENTS.md §17) for all customer-facing output
- Task card format: Goal/Constraints/Scope/Expected/Verification
- Kill-switch default: read-only, dry-run, mock adapters
```

---

## Version history

| Date | Change | Reason |
|------|--------|--------|
| 2026-07-03 | Initial | Fable 5 free window, full bundle D |