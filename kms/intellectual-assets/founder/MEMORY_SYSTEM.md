# MEMORY_SYSTEM — Founder Persona (SIRINX)

> ระบบจำให้ AI "จำรูปแบบการตัดสินใจ" คุณได้ ไม่ใช่แค่จำคำตอบ

---

## 1. Memory sources ที่ต้องอ่านก่อนตัดสินใจใหม่

**Priority order (จากบนลงล่าง):**

1. **PROJECT_STATE.md** — สถานะโครงการ SIRINX OS ปัจจุบัน (ห้ามโยนทับโดยอคิตี่ไม่ได้ตรวจสอบ)
2. **KPI ย้อนหลัง** — งานไหนเคยเจอ bug บ่อย? เจาะจงตอนนี้ให้เจอบ่อยแรก
3. **DECISION_JOURNAL.md** — งานใหม่ใกล้เคียงกับ decision เก่าไหม?
4. **VALIDATION_MATRIX.md** — มี test case รองรับหรือยัง? ถ้าไม่มี ให้เพิ่มก่อนพัฒนา
5. **KNOWLEDGE_BASE.md (Solar) / PROMPT_LIBRARY.md (Operator)** — งานเกี่ยวกับอะไรบอกเล่ามาที่ใด

## 2. Memory classes ที่เขียนออกมา

| Class | ที่เก็บ | ตัวอย่าง |
|-------|--------|----------|
| Working | ไฟล์ปัจจุบันที่ทำอยู่ | `NEXT_ACTIONS.md` task นี้ |
| Verified facts | PROJECT_STATE.md, MAC_BASELINE.md | "Live Agent Studio: SRL-2 ที่ Mac mini ผ่าน" |
| Knowledge | kms/, docs/ | "Self-consumption คุ้มสุดเมื่อใช้กลางวัน" |
| Incident | KNOWN_ISSUES.md และอ้างอิง | "Solis inverter read-only เพราะ consent ยังไม่ได้" |

## 3. Knowledge Digest pulse format (SIRINX Obsidian Brain Sync)

เพื่อให้เจอกับคนอื่น/ตัวเองในอนาคตได้เร็ว:

```markdown
## {โมดุล/ระบบที่เปลี่ยน} · {เวลา YYYY-MM-DD}
ที่เปลี่ยน: {สรุปสั้น}
หลักฐาน: {path/to/evidence.file} หรือ artifact id
ขั้นตอนต่อไป: {next safe action}
```

**กฎ:** 1 pulse/เสร็ปไม่เกิน 5 บรรทัด. ไม่เขียน secret / .env / token / log เต็ม.
ลิงก์ artifact แทน copy-paste

## 4. การเช็ค memory ก่อนงานใหม่

วิธีใช้เมื่อโอนงานให้ AI:

```text
งานนี้ touch memory หรือ knowledge สำคัญไหม? 
ถ้าใช้บอกว่า "อ่านจากใหนบ้าง" + "อัปเดตเข้าไหนบ้าง"
ตัวอย่าง: งานใหม่เกี่ยวกับ ROI calculator → ให้อ่าน DECISION_FRAMEWORKS.md + KNOWLEDGE_BASE.md ก่อน
```

## 5. Memory hygiene for external agents

เมื่อ delegate_task ให้ subagent:

- ส่ง context ให้เต็ม: PROJECT_STATE ล่าสุด, ไฟล์ที่เกี่ยวข้อง, SOP/Decision ที่เกี่ยวข้อง
- ไม่โอน memory เต็ม — subagent ไม่มี long-term memory
- เมื่อ subagent ตอบกลับ → คุณต้องเช็คว่ามันบอกจำนวน token/cost/latency มากพอหรือยัง

## 6. Memory gaps ที่ต้องเติม

หาก AI บอกว่า "ไม่มีข้อมูลเกี่ยวกับ X":

- เพิ่มเป็น issue/PR ใหม่ใน `NEXT_ACTIONS.md`
- ใส่ tag: `knowledge-gap`
- พยายามให้ spike รูปแบบให้ได้ซัก 1 อย่าง แล้วค่อยขยาย