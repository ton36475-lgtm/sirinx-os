# SIRINX OS — ระบบ Brain Storm Decision Analysis

> **เป้าหมาย:** ระบบวิเคราะห์โครงสร้างของคำสั่งก่อนอนุมัติการทำงาน
> ให้ AI ตัดสินใจแทนมนุษย์ได้โดยอิงจากโครงสร้าง (ไม่ใช่เดา)
> **สถานะ:** สร้างเสร็จ + verify ผ่าน (low/medium/high/destructive)

---

## สถาปัตยกรรม
```
[คำสั่งนำเข้า]
      │
      ▼
┌─────────────────────────────────────┐
│  Brain Storm (brainstorm-workflow.js)  │
├─────────────────────────────────────┤
│ 1. PARSER    แตก tokens / flags / target
│ 2. ANALYZER  จับคู่กับ policy rules (AGENTS.md)
│ 3. DECIDER   คะแนน risk + ข้อเสนอการตัดสินใจ
└─────────────────────────────────────┘
      │
      ▼
{ command, parsed, risk_score, risk_level,
  matched_rules[], recommendation,
  autosafe, human_decision_needed }
```

## Risk Levels
| Score | Level | การตัดสินใจ |
|---|---|---|
| 1–2 | LOW | AUTO_APPROVE / AUTO_SAFE |
| 3 | MEDIUM | AUTO_SAFE (ผ่าน safety scan) |
| 4–5 | HIGH | HUMAN_GATE (รอมนุษย์) |
| 6–7 | CRITICAL | BLOCK (ห้ามรัน) |

## Policy Rules (จาก AGENTS.md)
- DEPLOY / RELEASE → risk 5 (human gate)
- GIT_PUSH / PR → risk 4 (human approval)
- CLOUD_MUTATE (cloudflare/r2/aws) → risk 5
- SECRET_WRITE → risk 6 (ห้ามเด็ดขาด)
- ENV_EDIT (.env) → risk 4 (ใช้ .env.example)
- EXTERNAL_SEND (line/telegram/customer) → risk 5
- DESTRUCTIVE (rm -rf / drop) → risk 7 (BLOCK)
- SHELL_INJECT (curl|sh / eval) → risk 6
- READ_ONLY / LOCAL_BUILD / OCR → risk 1–2 (ปลอดภัย)

## ไฟล์
- `scripts/brainstorm-workflow.js` — ระบบครบ 3 ชั้น (verify แล้ว)

## ผลเทส
| กรณี | Risk | ผล |
|---|---|---|
| OCR analyze | 2 LOW | AUTO_SAFE |
| npm run build | 2 LOW | AUTO_SAFE |
| git push + deploy | 5 HIGH | HUMAN_GATE |
| rm -rf | 7 CRITICAL | BLOCK |
