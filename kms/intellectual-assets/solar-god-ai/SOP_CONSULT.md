# SOP_CONSULT — SIRINX Solar ROI Consultation Flow

> ขั้นตอนมาตรฐานจากแชทแรก → lead → handoff ใช้ได้ทั้ง Live Studio, LINE, และหน้าเว็บ
> ทุก step ที่ customer-facing ต้องผ่าน approval queue (states: pending/approved/edited/rejected/blocked)

---

## SOP-B1 — Intake (ทำความเข้าใจลูกค้า)

เก็บทีละคำถาม อย่ายิงเป็นฟอร์ม:

1. บิลค่าไฟเฉลี่ย/เดือน (ช่วงก็พอ เช่น 3,000–5,000)
2. ประเภท: บ้าน / ธุรกิจ / โรงงาน
3. ใช้ไฟหนักช่วงไหน (กลางวัน = โซลาร์ตรงจุด, กลางคืน = ต้องคุยแบต/มิเตอร์)
4. พื้นที่หลังคาโดยประมาณ + ทิศ (ถ้าลูกค้าไม่รู้ ข้ามได้)

Grade lead: **A** = บิลสูง+ใช้กลางวัน+อยากได้ ROI · **B** = สนใจแต่ข้อมูลไม่ครบ ·
**C** = ถามความรู้ทั่วไป (ให้ความรู้ ไม่ push)

## SOP-B2 — Value-first answer

ก่อนชวนทำอะไร ให้ 1 insight ฟรีที่ตรงกับเคส เช่น:

- บิล 5,000+/เดือน ใช้ไฟกลางวัน → อธิบาย self-consumption
- ถามเรื่องแบต → อธิบาย trade-off ราคา/อายุ/ความคุ้ม แบบไม่เชียร์
- กลัวแผงเสีย → อธิบาย Predictive Maintenance ว่า monitor อะไรได้บ้าง

## SOP-B3 — ROI Analysis offer (lead capture)

เงื่อนไขก่อนเสนอ: ลูกค้าถามเรื่องความคุ้ม/ราคา หรือ intent ชัด (grade A/B เท่านั้น)

```text
ถ้าอยากได้ตัวเลขของหน้างานตัวเองจริง ๆ ส่งบิลค่าไฟ + พื้นที่คร่าว ๆ มาได้ครับ
ทีม Sirinx จะวิเคราะห์ ROI ให้ฟรี ไม่มีค่าใช้จ่าย และไม่ผูกมัดครับ
```

บันทึก lead: grade, customer_type, monthly_bill_thb, wants_roi_analysis, correlation_id
(mask ชื่อ/เบอร์ตาม PII policy)

## SOP-B4 — LINE handoff

- เสนอ LINE **เฉพาะเมื่อ**ลูกค้าพร้อมคุยกับคน หรือขอ contact เอง
- Dry-run default: `LINE_SEND_ENABLED=false` — ระบบจริงต้องผ่าน approval
- ข้อความ handoff ต้องสรุป context ให้ทีมขาย: grade, bill, ความต้องการ, คำถามค้าง

## SOP-B5 — คำถามที่ต้องส่งต่อ (escalation)

| หัวข้อ | ทำ |
|--------|-----|
| สัญญา/การเงิน/สินเชื่อ | ส่งต่อทีมขาย ห้ามตอบเงื่อนไขเอง |
| ไฟฟ้าแรงสูง / ขอมิเตอร์ TOU | ส่งต่อวิศวกร ให้ข้อมูลทั่วไปได้เท่านั้น |
| ร้องเรียน/เคลม | ส่งต่อทันที + บันทึกใน queue เป็น priority |
| ขอควบคุมอุปกรณ์ Solis | read-only เท่านั้น — ต้องมี consent + engineer signoff ก่อนทุกกรณี |

## SOP-B6 — Post-live summary (หลังจบไลฟ์)

1. สรุป: จำนวนแชท, leads ตาม grade, คำถามยอดฮิต 5 ข้อ, replies ที่ถูก block
2. คำถามที่ตอบไม่ได้ → เข้า knowledge base backlog
3. Pulse ลง Obsidian digest 1 บรรทัด + evidence path
