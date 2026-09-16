# DECISION_JOURNAL — Founder Persona (SIRINX)

> บันทึกการตัดสินใจสำคั�ง เพื่อให้ AI (หรือคุณในอนาคต) ต่อยอดจากโครงคำถาม/วิธีคิดที่ผ่านการฝอยแล้ว

---

## DJ-01 — Revenue-first triage rule (เมื่ออ่าน "กองขยะทับถม")

**Trigger:** มีงาน/ไอเดียเยอะมาก ไม่รู้จะเริ่มตั้งแต่ไหน

**process:**

1. อ่าน `PROJECT_STATE.md` + `NEXT_ACTIONS.md` — งานไหนทดสอบแล้ว?
2. งานที่ยังไม่ test (SRL-0/1) ส่วนใหญ่ควรตัดทิ้ง หรือเป็นแค่ spike
3. งานที่ test แล้ว (SRL-2/3) ควร "หาเงิน" ก่อน งานใหม่จะได้โครงดี
4. คำถาม checkpoint: "งานนี้ kill อะไรเพื่อแลกมา?"

**Outcome:** ถ้ามี SRL-2 หรือสูงกว่า → ใส่ revenue lens ก่อนเพิ่ม research

## DJ-02 — When to say NO to a new feature

**Gate:** feature ทุกอย่างต้องผ่าน 3 ข้อ:

- [ ] มี user จริงบอกว่าอยากได้? (ไม่ใช่คุณคิดว่ามันควรมี)
- [ ] คุ้มทุนใน 1 sprint (มี test cases, rollback, kill switch)?
- [ ] ทำให้ system อื่น ๆ เสียหน้าที่ / ยากต่อ audit ไหม?

ไม่ผ่าน ข้อใดข้อหนึ่ง = NO. ใส่ backlog อย่าเปิดให้ทำ

## DJ-03 — Build vs Buy vs Wrap (reuse rule)

**Framework:**

- คืนกำไร? มี moat? ต้องเป็น unique advantage? → Build
- จำเป็นแต่ไม่ใช่ moat? → Buy/OSS
- Tool มีอะไรอยู่แล้ว 80% ครอบคลุม? → Wrap + kill-switch adapter (อย่า fork)

**พิเศษ:** local AI (Ollama/llama.cpp) ใช้กับ non-revenue features ขึ้นไป

## DJ-04 — Stop + Roll back decision

**Signal list (หยุดทันที + ให้ agent หยุด):**

- ระบบอ่าน/เขียน secret หรือ .env จริง ๆ
- มี external network write ที่ target เป็น production แตะ
- ยิง paid provider เกิน $5/task
- Console error หลายบรรทัด + AI แนะให้ "ลองใหม่"

**Protocol:** Kill switchเปิด → freeze queue → เขียน incident ใน `KNOWN_ISSUES.md` → อย่าแก้โดยไม่มีหลักฐาน

## DJ-05 — When to delegate to a subagent vs DIY

**Decision tree:**

1. คำถาม/งานมีหลายขั้นตอน + เจาะจง? → delegate (Architect Agent, Research Agent)
2. งานธรรมดา + เข้าใจโครงแล้ว? → DIY (โดยใช้ SOP ให้ครบ)
3. งาน touch cloud/production/destructive? → delegate + ใส่ human approval แน่นอน

**Rule:** delegate แล้ว `delegate_task` ต้องได้: goal + context + toolsets scoped ชัด

---

### ใช้ journal นี้อย่างไร?

วาง context แล้วให้ AI บอกว่า "งานนี้ใกล้เคียงกับ DJ-01/DJ-02" แล้วมี outcome อะไร
→ มันจะใช้รอยยิ่งนั้นคิดต่อโดยไม่หลงทาง