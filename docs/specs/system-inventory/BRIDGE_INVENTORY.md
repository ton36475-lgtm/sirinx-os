# Bridge inventory — ทุกตัวที่ทำหน้าที่ route/proxy โมเดลบนเครื่องนี้

**สำรวจ:** 2026-07-25 · ทุกบรรทัดวัดจากเครื่องจริง

---

## สรุปสั้น

มี **7 ชั้น** ที่ทำงานทับกันอยู่ — ไม่ใช่ทุกตัวที่ควรมีต่อ

| # | ตัว | ชนิด | สถานะ | รันที่ |
|---|---|---|---|---|
| 1 | **OmniRoute** (= 9router) | gateway สำเร็จรูป | 🟢 รันอยู่ | `:20128` |
| 2 | **TieredRouter** (Rust) | in-process router | 🟢 ใช้งานได้ | ในโปรเซส |
| 3 | **Omni-Bridge Worker** | edge proxy | 🟡 พร้อม ยังไม่ deploy | Cloudflare |
| 4 | **opencode providers** | client-side router | 🟢 ใช้งานได้ | ในตัว opencode |
| 5 | **A2A server** | agent bus | 🟢 รันอยู่ | `:9000` |
| 6 | **Hermes** | control plane | 🔴 ไม่รัน | `:8787` |
| 7 | **llm-council** | consensus fan-out | 🟡 ติดตั้งแล้ว ยังไม่รัน | `:5173` |

```
$ curl 127.0.0.1:<port>/
  :20128  OmniRoute      → 307   (redirect ไป /dashboard)
  :9000   A2A            → 404 ที่ /  แต่ /health = 200
  :8710   dev-dashboard  → 200
  :8711   control-api    → 404 ที่ /  แต่ /health = 200
  :8787   Hermes         → ไม่ตอบ
  :11434  Ollama         → ไม่ตอบ  (ถอดออกโดย P098 Rev E)
  :5173   llm-council    → ไม่ตอบ
```

---

## 1 · OmniRoute — `integrations/omniroute` 🟢

v3.8.48 · Next.js + Electron + MCP SDK · dashboard `:20128`

**เป็นตัวเดียวกับ [decolua/9router](https://github.com/decolua/9router)** (23.5k ดาว) — พอร์ต `20128` ตรงกัน คำโปรยตรงกัน สถาปัตยกรรมตรงกัน **ไม่ต้อง `npm install -g 9router` ซ้ำ**

ครอบคลุมที่สุดในบรรดาทั้งหมด: 250 provider (90+ ฟรี), RTK token saver, 3-tier auto-fallback, format translation, quota tracking

**ปลุกขึ้นมาแล้ววันนี้** — ต้องซ่อม native binary ก่อน: `lightningcss.darwin-arm64.node` บนเครื่องมี 3.9 MB ทั้งที่ registry บอก 8.1 MB ไฟล์ถูกดาวน์โหลดมาไม่ครบ ติดตั้งใหม่แล้วก๊อปไปที่ fallback path ที่ Turbopack มองหา

**ค้างอยู่:** `INITIAL_PASSWORD` ไม่ได้ตั้ง ใช้ค่าเริ่มต้น `CHANGEME` · Antigravity/Qoder OAuth ยังไม่ได้ config

## 2 · TieredRouter — `ghostclaw-os/crates/providers` 🟢

router ในโปรเซส เขียนเองวันนี้ ตาม P098 Rev D/E/F/G

```
glm-*                     → cointh   → maxplus → openrouter-free
qwen* deepseek* kimi*     → alibaba  → maxplus → openrouter-free
claude-*                  →            maxplus → openrouter-free
```

มี egress redaction gate · circuit breaker (3 ครั้ง → DOWN 10 นาที) · hash-chained receipt · แยก quota exhaustion ออกจาก fault · 44 tests

**ต่างจาก OmniRoute ตรงไหน:** ตัวนี้อยู่ในโปรเซสของ GhostClaw เอง มี governance ผูกกับ P098 และเขียน receipt ที่ตรวจสอบย้อนได้ OmniRoute เป็น gateway แยกที่ไม่รู้จัก governance ของเรา

## 3 · Omni-Bridge Worker — `tools/omni-bridge` 🟡

Cloudflare Worker · สร้างวันนี้จากโค้ดที่ Tony ส่งมา · 13 tests ผ่าน · **ยังไม่ deploy**

fallback matrix 5 ค่าย: DeepSeek → Groq → OpenRouter → Alibaba → Gemini

**แก้จากต้นฉบับ 6 จุด** — ดู `tools/omni-bridge/README.md`

## 4 · opencode providers 🟢

`~/.config/opencode/opencode.json` มี **43 provider alias** เกือบทั้งหมดเป็น sub-pool ของ maxplus แต่ละตัวมี baseURL ของตัวเอง

เป็นเอกสารชั้นดีว่า maxplus มี pool อะไรบ้าง แต่ **routing อยู่ในตัว opencode** ไม่ได้แชร์กับใคร

## 5 · A2A server — `project-hermes/a2a_server` 🟢

Python · `:9000` · route: `/health`, `/agent-card`, `/tasks`, `/knowledge/*`, `POST /rpc`

**ไม่ใช่ model router** — เป็น agent-to-agent bus คนละชั้นกัน แต่นับรวมเพราะมันคือทางที่ agent คุยกัน

`tasks: 0` · `a2a-sync-status.json` ล่าสุด 2026-07-07 = ค้างมา 18 วัน

## 6 · Hermes — `ghostclaw-os/crates/hermes` 🔴

control plane · `:8787` · **ไม่ได้รันอยู่**

route: `/health`, `/api/tasks`, `/api/tasks/{id}/approve|reject`

วันนี้ถอด `/auto-approve` ออกตาม P100 — RED เดินได้ด้วย `HumanApprove`/`HumanReject` เท่านั้น

## 7 · llm-council 🟡

karpathy · 23.2k ดาว · council 4 โมเดล + chairman สังเคราะห์

ติดตั้งครบ (venv 52 · frontend 189) **แต่ไม่มี `OPENROUTER_API_KEY` ที่ไหนในเครื่องเลย**

**ทางที่ไม่ต้องเสียเงิน:** ชี้ไปที่ OmniRoute `:20128` แทน OpenRouter — ได้ council โดยใช้ free provider ที่ OmniRoute รวมไว้แล้ว ต้องแก้ `backend/config.py` สองบรรทัด

---

## ที่ทับซ้อนกันจริง

**OmniRoute / Omni-Bridge Worker / TieredRouter ทำเรื่องเดียวกัน** — รับ request แล้วเลือก provider พร้อม fallback

ต่างกันที่ชั้นและเหตุผลที่มีอยู่:

| | ทำงานที่ไหน | มีไว้ทำไม |
|---|---|---|
| TieredRouter | ในโปรเซส GhostClaw | ผูกกับ governance P098 · เขียน receipt · redaction gate |
| OmniRoute | เครื่องนี้ `:20128` | ครอบคลุม provider เยอะที่สุด · มี UI · quota tracking |
| Omni-Bridge | Cloudflare edge | ไม่พึ่งเครื่องนี้ · client ภายนอก (n8n, Warp) เรียกได้ |

**ทั้งสามมีเหตุผลอยู่ได้** ถ้าแบ่งหน้าที่ชัด — แต่ตอนนี้ยังไม่มีใครกำหนดว่าใครเรียกใคร ถ้าปล่อยไว้จะกลายเป็นสามชุด config ที่ต้องดูแลแยกกันและไม่ตรงกัน

**ที่ควรตัดสินใจ:** Omni-Bridge ควรชี้กลับมาที่ OmniRoute แทนที่จะถือรายชื่อ provider ของตัวเองหรือไม่ — ถ้าใช่ ก็เหลือแหล่งความจริงเดียวว่า provider ไหนใช้ได้

---

## LABELS

VERIFIED: พอร์ตและ HTTP code ทุกบรรทัด · OmniRoute = 9router (พอร์ต+คำโปรยตรงกัน) · จำนวน provider alias ของ opencode · 13 tests ของ Omni-Bridge
UNVERIFIED: model id ใน Omni-Bridge ทั้ง 5 ค่าย — ยังไม่ได้ยิง `/v1/models` ยืนยัน
