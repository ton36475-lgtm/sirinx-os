# SIRINX OS — QA Gatekeeper + Baidu OCR Integration Plan

> **สถานะ:** กำลังติดตั้ง Baidu Unlimited-OCR (MIT) เข้า venv `~/.local/venvs/baidu-ocr`
> **อนุมัติ:** ผู้ใช้ยืนยันติดตั้ง + standing auto-approve (ไม่ตอบ = อนุมัติ)
> **เป้าหมาย:** นำ OCR มาใช้กับทุก Agent + สร้าง Automated QA Gatekeeper workflow
> **ข้อจำกัด AGENTS.md:** ห้ามของจำลอง, ห้าม push/deploy โดยไม่มี human gate, ห้ามอ่าน secret

---

## 1. Baidu Unlimited-OCR — ข้อเท็จจริงที่ verify แล้ว
| Field | ค่า (จาก HF API จริง) |
|---|---|
| Model ID | `baidu/Unlimited-OCR` |
| License | MIT (ใช้ฟรีเชิงพาณิชย์ได้) |
| Downloads | 2,122,848+ |
| Tags | `transformers`, `safetensors`, `unlimited-ocr`, `feature-extraction`, `baidu`, `vision-language` |
| สถาปัตยกรรม | Vision-Language + Reference Sliding Window Attention (MoE ~3B พารามิเตอร์, ใช้งาน 500M) |
| ภาษาไทย | multilingual — **ยังไม่มี benchmark ไทยทางการ** ต้องเทสเองก่อนใช้งานจริง |

> ⚠️ ตัวเลข benchmark 93.23% / OmniDocBench จากโพสต์ข่าว **ยังไม่ได้เทสเอง** — ต้องรันเทสภาษาไทยก่อนอ้างอิง

---

## 2. เครื่องมือที่มีจริงในระบบ (verify แล้ว)
| เครื่องมือ | สถานะ | ใช้ทำอะไร |
|---|---|---|
| `PyMuPDF` (fitz) | ✅ มีใน python ระบบ | แปลง PDF → รูปหน้า / ข้อความ |
| `hf` CLI | ✅ `/opt/homebrew/bin/hf` | โหลด weights จาก HF |
| `external-gate-readiness.sh` | ✅ มีใน `scripts/` | ตรวจสอบ external gate |
| `ghostclaw_a2a_gate_lock_audit.py` | ✅ มีใน `scripts/` | ตรวจสอบ A2A lock |
| OmniRoute | ✅ `integrations/omniroute/` (Next.js AI router) | ไม่ใช่ port 20128 เฉพาะ |
| `kudu-cli` | ❌ ไม่พบในเครื่อง + ไม่พบ repo ตรงใน GitHub | ใช้ `df`/`ps`/`vm_stat` แทนชั่วคราว |

---

## 3. QA Gatekeeper Architecture (รุ่น 1 — ใช้ของจริง)
```
[OmniRoute Coder Agent] ──> (โค้ด/Config ชุดใหม่)
        │
        ▼
┌─────────────────────────────────────┐
│  Hermes QA Gatekeeper (solis)       │
├─────────────────────────────────────┤
│ L1 Pre-Flight   : external-gate-readiness.sh
│ L2 Static       : grep/syntax/secret scan
│ L3 Math Drift   : ตรวจสอบ logic ตัวเลข (ROI 2.2 บาท)
│ L4 Perf Profile : df / ps / vm_stat (แทน kudu)
│ L5 OCR Verify    : Baidu OCR อ่านเอกสารประกอบ
│ L6 Sandbox      : รัน unit/integration ใน worktree
└─────────────────────────────────────┘
        │ Pass → APPROVED JSON
        ▼ Fail → Refactoring Mandate (line/root-cause/patch)
```

---

## 4. OCR Integration Workflow (Automated)
1. Agent สร้าง/อัปเดตโค้ด + เอกสารประกอบ (PDF/รูป)
2. Hermes ดึง PDF ด้วย PyMuPDF → ส่งหน้าให้ Baidu OCR
3. OCR คืน Markdown โครงสร้าง → เข้า agent วิเคราะห์ (เช่น ตรวจสูตร ROI)
4. ผลลัพธ์เข้า QA Gate → ผ่าน/ไม่ผ่าน

---

## 5. ถัดไปหลังติดตั้งเสร็จ
- [ ] โหลด weights `baidu/Unlimited-OCR` ผ่าน `hf`
- [ ] เทสอ่าน PDF ไทย 1 หน้า + ตารางข้ามหน้า
- [ ] สร้าง `scripts/qa-gatekeeper.mjs` จาก external-gate + OCR
- [ ] สร้าง cron job `qa-gate-v1` (paused รอเทส)
- [ ] รายงานผลเทสภาษาไทยก่อนใช้งานจริง
