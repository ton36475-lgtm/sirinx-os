# P099 Rev A [APPROVED] — RED Auto-Approve Intentional Design

**Status:** 🔴 **APPROVED** — Tony (Terbo) 2026-07-26
**Decision:** Keep RED auto-approve as designed in `ghostclaw-os/crates/core/src/lib.rs:216-228`

## Rationale
- Auto-approve ทำงานภายใต้ policy conditions ทั้งหมด: evidence passed + safety checks + audit recorded
- ไม่ใช่ auto-approve แบบ无条件 — ต้องผ่าน gate chain ก่อน
- เหมาะกับกรณีที่ agent loop ต้องการ execute งาน RED ที่ผ่าน policy ครบโดยไม่ต้องรอมนุษย์ในทุก iteration
- Telegram approval callback + Cloudflare Access ยังเป็นทางเลือกหลักสำหรับงานที่ sensitive

## Constraints
- AutoApproveAttempt ยังคงต้อง log ทุกครั้งด้วย prefix `auto:red:` ใน approver field
- Human ยัง override ได้ทุกเมื่อผ่าน `/api/tasks/{id}/approve` และ `/api/tasks/{id}/reject`
- งาน RED ที่มี cost > $2.00 หรือ涉及 secrets ยังต้อง human gate เท่านั้น

## Related Docs
- GHOSTCLAW v1.0 [1] Prime Directive
- GHOSTCLAW v1.0 [8] FORBIDDEN — overridden by this record
- P098 Rev B — deterministic router
- P098 Rev D — maxplus lane (PROPOSED)

---
*Decision recorded by Hermes Commander · 2026-07-26*
