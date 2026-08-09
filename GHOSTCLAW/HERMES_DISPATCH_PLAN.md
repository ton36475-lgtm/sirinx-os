# GHOSTCLAW OS1 — Hermes Dispatch Plan

**สถานะ:** PROPOSED (dry-run) · **ผู้อนุมัติ:** Tony เท่านั้น · **วันที่:** 2026-08-09

เอกสารนี้คือชุดคำสั่งที่ Hermes (commander) อ่านเพื่อกระจายงานให้ทีม agentic
coding ผ่าน A2A แต่ละคำสั่งมี **risk tier** กำกับ ทุกอย่างตั้งต้นที่ dry-run —
Hermes จะ dispatch งานได้ แต่ side effect จริง (deploy/push/send) ต้องมี
`HumanApprove(tony)` ตามรัฐธรรมนูญ (คานอำนาจ 3 เส้า) เสมอ

> **ทำไมต้องมีเอกสารนี้แทนที่จะสั่ง Hermes ตรงๆ:** node ทุกตัวอยู่คนละเครื่อง
> มองงานที่ยังไม่ push ของกันไม่เห็น เอกสารนี้ commit ลง repo คือช่องทางเดียว
> ที่คำสั่งไปถึงทุก node พร้อมกันและตรวจสอบย้อนหลังได้

## Prerequisite ที่ต้องเสร็จก่อน dispatch (Phase 0 — ยังไม่ผ่าน)

| # | บล็อกเกอร์ | ใครแก้ | สถานะ |
|---|---|---|---|
| P0.1 | Oracle VM ยังไม่ถูกสร้าง (`terraform apply` module `oci-existing-network/`) | Tony | ⛔ ค้าง |
| P0.2 | keystore + `ghostclaw123` ใน public repo ×2 | Tony (ตอบ Play Store?) | ⛔ ค้าง |
| P0.3 | pairing token รั่วในแชท (revoke) | Tony | ⛔ ค้าง |
| P0.4 | SSH key ใน git history (rewrite) | Tony | ⛔ ค้าง |
| P0.5 | ชี้ขาด RiskTier (promptpack vs โค้ดเดิม) | Tony | ⛔ ค้าง |

**Hermes ต้องไม่เริ่มเลนใดที่แตะ cloud/deploy จนกว่า P0.1 ผ่าน** — ก่อนหน้านั้น
มีแต่งาน local/read-only ที่ dispatch ได้

## เลนการทำงาน (แต่ละทีมคนละส่วน ไม่ทับกัน)

| เลน | เจ้าของ | ไฟล์/ขอบเขต | tier สูงสุดที่ทำเองได้ |
|---|---|---|---|
| **L-INFRA** | devops-runner | `infra/oci-existing-network/`, cloud-init, tunnel | 🟡 (apply = 🔴 Tony) |
| **L-CORE** | backend-integrator | `ghostclaw-os/crates/*` (Rust) | 🟢 test/build |
| **L-PROVIDER** | backend-integrator | `crates/ghostclaw-providers/` — แก้ปัญหาสลับโมเดล | 🟢 test |
| **L-DASH** | frontend-builder | `apps/dev-dashboard/` — module function + model catalog | 🟢 |
| **L-WEB3D** | frontend-builder | sirinx.co redesign 3D solar (แยก repo) | 🟢 |
| **L-QA** | browser-automator | `tests/browser/`, Playwright, UAT | 🟢 |
| **L-SEC** | code-reviewer | secret scan, dcg guard, gitleaks | 🟢 read-only |
| **L-DOCS** | project-planner | AGENTS.md, plan, receipts | 🟢 |

## ชุดคำสั่ง Hermes (คัดลอกไปวางใน Hermes commander)

แต่ละบล็อกคือ 1 task ที่ Hermes สร้างแล้ว dispatch ตามเลน — **ทั้งหมด dry-run**

### เปิดสิทธิ์ commander (ตามที่คุณส่งมา — แต่ tier 🔴)
```bash
# 🔴 side-effect: เปิดสิทธิ์สั่งงาน — ต้อง HumanApprove ก่อน
hermes config set platforms.telegram.extra.allowed_user_ids '[<TONY_TELEGRAM_ID>]'
hermes config set platforms.telegram.extra.admin_user_ids   '[<TONY_TELEGRAM_ID>]'
# หมายเหตุ: ใส่เฉพาะ id ของ Tony — อย่าใส่ id ที่ยืนยันตัวไม่ได้
```

### L-PROVIDER — หาสาเหตุสลับโมเดลไม่ได้ (งานที่คุณถามซ้ำ)
```bash
# 🟢 read-only diagnosis — dispatch ได้ทันทีบน Mac mini
hermes dispatch --lane L-PROVIDER --dry-run --task '
  cd ~/sirinx-os
  cargo test -p ghostclaw-providers 2>&1 | tail -40
  grep -rn "impl LlmProvider\|fn route\|switch" crates/ghostclaw-providers/src/
  curl -s localhost:11434/api/tags | jq ".models[].name"
  # เทียบกับ config ที่ Hermes ใช้จริง แล้วรายงานว่า provider ไหน advertise ไม่ครบ
'
```

### L-CORE — ต่อ S3/S4 (ต้อง build ได้ก่อน)
```bash
# 🟢 บน Mac mini ที่ build ได้ (ที่ cloud crates.io ถูกบล็อก)
hermes dispatch --lane L-CORE --dry-run --task '
  cd ~/sirinx-os/ghostclaw-os && cargo test --workspace
  # ถ้าเขียว → ต่อ S2 providers tier + curl GLM (🔴 paid = ต้องอนุมัติ)
'
```

### L-INFRA — สร้าง VM (🔴 Tony กดเอง)
```bash
# 🔴 provision — Hermes เตรียมได้ แต่ apply ต้อง Tony
cd ~/sirinx-os/infra/oci-existing-network
cp terraform.tfvars.example terraform.tfvars   # (สร้างจาก ../oci/terraform.tfvars.example)
ssh-keygen -t ed25519 -C ghostclaw-oci -f ~/.ssh/oracle_key
terraform init && terraform plan                # ดูก่อน — dry-run โดยธรรมชาติ
# terraform apply  ← Tony เท่านั้น
```

### L-SEC — ต่อ Wave 0.3 (post-rotation scan)
```bash
# 🟢 read-only — รันได้หลัง Tony หมุน keystore/key แล้ว
hermes dispatch --lane L-SEC --dry-run --task '
  gitleaks detect --source . --no-git -v
  # ยืนยัน keystore/token/key ไม่เหลือใน working tree ทุก repo
'
```

## กฎที่ Hermes ต้องบังคับตลอด dispatch

1. **ไม่มี agent อนุมัติงานตัวเอง** — MAKER ≠ CHECKER ≠ GUARD
2. **🔴 ผ่านทางเดียว:** `HumanApprove(tony)` จาก dashboard หลัง Cloudflare Access
   หรือ Telegram callback จาก id ที่ whitelist — เวลาที่ผ่านไปไม่ใช่การอนุมัติ
3. **GUARD ไม่ push** — commit อย่างเดียว
4. **push ก่อนหยุดเสมอ** — งานที่ไม่ push = node อื่นมองไม่เห็น (เกิดกับ Codex มาแล้ว)
5. **model routing:** โมเดล abliterated/uncensored (Ornith) ใช้ได้เฉพาะเลนที่
   **ไม่มี tool access** (L-DOCS draft, brainstorm) — เลนที่มี shell/deploy
   (L-INFRA, L-CORE) ใช้โมเดลปกติเท่านั้น
