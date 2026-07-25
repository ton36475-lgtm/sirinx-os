# แผนติดตั้ง skill ให้ agent ทุกตัว

**สถานะ:** `[PROPOSED]` · ยังไม่ได้ติดตั้งอะไร
**วันที่:** 2026-07-25

---

## 1. สภาพปัจจุบัน (VERIFIED)

```
~/.codex/skills    → 61 skills
~/.claude/skills   → 19 skills
~/.opencode/skills → 12 skills
~/.zcode/skills    →  1 skill
```

**ปัญหาไม่ใช่ "มี skill น้อยเกินไป" แต่คือ "skill ไม่ได้ sync กัน"** — codex มี 61 ตัว ส่วน zcode มี 1 ตัว ต่อให้ไม่ติดตั้งอะไรใหม่เลย การ sync ของที่มีอยู่ก็เพิ่มความสามารถให้ agent ส่วนใหญ่แล้ว

## 2. เครื่องมือ

`skills` — `skills@1.5.20`, MIT, vercel-labs
<https://github.com/vercel-labs/skills>

keyword ของแพ็กเกจครอบ agent CLI ~70 ตัว รวม `claude-code`, `codex`, `opencode`,
`cline`, `kiro-cli`, `zcode`, `openclaw`, `hermes-agent` — ตรงกับกองที่ใช้อยู่ทั้งหมด

คำสั่งที่เกี่ยวข้อง:

```
skills add <repo> -l              ดูรายการ skill ในrepo โดยไม่ติดตั้ง
skills add <repo> -a '*'          ติดตั้งให้ agent ทุกตัว
skills add <repo> --all           = --skill '*' --agent '*' -y
skills list                       ดูที่ติดตั้งแล้ว
skills remove <skill>             ถอนออก
skills update                     อัปเดต
```

---

## 3. ทำไมไม่ติดตั้ง "ทุก repo ที่เคยให้ไป"

ไล่ประวัติใน `project-hermes`, `~/.hermes/logs`, `~/.hermes/profiles`,
`.ghostclaw_runtime` แล้วได้ **GitHub repo ที่ไม่ซ้ำกัน 3,283 รายการ**

แต่ตัวเลขนั้นมาจากคลังงานวิจัยและ trending list ที่ scrape เก็บไว้ ไม่ใช่รายการที่
ตั้งใจสั่งติดตั้ง — เห็นได้จากความถี่ (`ggml-org/llama` 1,444 ครั้ง,
`unslothai/unsloth` 888 ครั้ง) ซึ่งเป็นลักษณะของเอกสารรวมลิงก์ ไม่ใช่คำสั่ง

**เหตุผลที่สำคัญกว่าจำนวน:** skill คือ **คำสั่งที่ agent จะเชื่อฟัง** ไม่ใช่ library
ที่เรียกใช้เมื่อต้องการ การติดตั้ง skill จากแหล่งที่ยังไม่ได้ตรวจ = การเพิ่มคนที่เขียน
คำสั่งให้ agent ของ Tony ได้ และ agent เหล่านี้มีสิทธิ์รันคำสั่ง แก้ไฟล์ และเข้าถึงคีย์
ที่อยู่ใน `.env`

3,283 แหล่งที่ยังไม่ได้อ่าน คือ 3,283 คนที่เขียนคำสั่งให้ระบบได้

## 4. เกณฑ์คัดก่อนติดตั้ง

ทุก repo ต้องผ่านก่อน:

1. `skills add <repo> -l` — ดูว่ามี skill อะไรบ้าง
2. อ่าน `SKILL.md` ของแต่ละตัวจริง ๆ — โดยเฉพาะส่วนที่สั่งให้ agent รันคำสั่ง
3. ตรวจว่ามีการอ่าน `.env`, credential, หรือส่งข้อมูลออกนอกเครื่องหรือไม่
4. ดู commit ล่าสุด, จำนวนคนดูแล, และว่ามี CI หรือไม่

---

## 5. Tier 1 — repo จากบทสนทนานี้ (2 ตัว)

### 5.1 `citrolabs/ego-lite` — เบราว์เซอร์สำหรับ agent

3,000 ดาว · 235 commits · macOS เท่านั้น (Windows/Linux อยู่ใน roadmap)

ให้ skill ชื่อ `ego-browser` เป็นชั้นเชื่อมระหว่าง agent CLI กับแอป ego lite
มี tool ในหน้าเว็บ: snapshot, fill, click, wait, navigate, capture
**ไม่มี MCP server** — ทำงานผ่าน skill อย่างเดียว

```bash
# ตรวจก่อน
npx -y skills@1.5.20 add citrolabs/ego-lite -l

# ติดตั้งให้ agent ทุกตัว
npx -y skills@1.5.20 add citrolabs/ego-lite -a '*'
```

> **จุดที่ต้องตัดสินใจเองตอนเปิดแอปครั้งแรก**
> ego lite ถามคำถามเดียว: จะ migrate ข้อมูล Chrome ไหม ตอบ "ใช่" แล้วมันจะรับ
> login, cookie, extension, bookmark ทั้งหมดมา
>
> README ระบุว่าข้อมูลอยู่บนเครื่อง ไม่ได้ส่งออก ซึ่งน่าเชื่อถือ แต่ผลคือ session
> ของ Cloudflare, Supabase, GitHub, LINE OA, ธนาคาร — ทุกอย่างที่ค้าง login ใน
> Chrome — จะอยู่ในแอปเพิ่มอีกหนึ่งตัว
>
> **แนะนำ: ตอบ "ไม่" แล้วล็อกอินเฉพาะเว็บที่ต้องใช้** ได้ประโยชน์เกือบเท่ากัน
> โดยไม่ต้องยกพวงกุญแจทั้งชุด — โดยเฉพาะตอนนี้ที่คีย์ maxplus และ cointh
> ผ่านแชทไปแล้วทั้งคู่

### 5.2 `cporter202/coreclaw-api-directory` — ไม่ใช่ skill

64 ดาว · 10 commits · เป็น **แคตตาล็อก** ของ 118 "CoreClaw Workers" (API ดึงข้อมูลเว็บ)
ไม่มีอะไรให้ติดตั้ง ไม่มี `SKILL.md`

README ระบุเองว่า *"not affiliated with or endorsed by CoreClaw or Apex DataWorks Limited"*
และการเรียก Worker ต้องมี `Authorization: Bearer YOUR_API_KEY` ของบริการนั้น
ซึ่งยังไม่มีในเครื่อง

**ถ้าจะเก็บไว้อ้างอิง** ให้ clone เข้า vendor dir ตาม pattern เดิม ไม่ต้องผ่าน `skills`:

```bash
git clone --depth 1 https://github.com/cporter202/coreclaw-api-directory \
  /Users/sirinx/tools/project-hermes-vendor-repos/trending/coreclaw-api-directory
```

**ไม่เกี่ยวกับ MaxPlus** — "CoreClaw" คนละเจ้ากับ GhostClaw และ MaxPlus

---

## 6. Tier 2 — sync ของที่มีอยู่แล้ว (ทำก่อน Tier 1 ได้)

ได้ผลมากที่สุดต่อความเสี่ยงน้อยที่สุด เพราะ skill พวกนี้อยู่ในเครื่องอยู่แล้ว
ผ่านการใช้งานมาแล้ว และไม่ได้เพิ่มแหล่งที่มาใหม่

```bash
# ดูว่ามีอะไรอยู่ตรงไหน
npx -y skills@1.5.20 list

# sync skill จาก node_modules เข้า agent directories
npx -y skills@1.5.20 experimental_sync
```

ดูสคริปต์ `tools/skills/sync-agent-skills.sh` ในโฟลเดอร์นี้ — dry-run เป็น default
เหมือน `install-trending-repos.sh` ของเดิม

---

## 7. Tier 3 — เพิ่มจากคลัง 3,283 รายการ

**ยังไม่ทำ** จนกว่าจะเลือกรายการที่ต้องการจริง

วิธีที่เหมาะกว่าการเลือกจากรายชื่อ คือใช้ `skills find` ค้นตามงานที่ต้องการ
แล้วค่อยตรวจตาม §4:

```bash
npx -y skills@1.5.20 find <คำค้น>
npx -y skills@1.5.20 find --owner anthropics
```

repo ที่ปรากฏถี่ที่สุดในคลังและน่าจะคุ้มค่าตรวจก่อน (ยังไม่ได้ตรวจ):
`anthropics/knowledge-work-plugins`, `davila7/claude-code-templates`,
`wshobson/agents`, `vercel-labs/agent-skills`

---

## 8. ลำดับที่แนะนำ

1. **Tier 2** — sync ของเดิม ได้ผลทันที ไม่เพิ่มความเสี่ยง
2. **Tier 1.1** — ego-lite ถ้าต้องการ browser automation (ตอบ "ไม่" ตอนถาม migrate)
3. **Tier 1.2** — clone coreclaw ไว้อ้างอิง ถ้าจะสมัครใช้บริการนั้นจริง
4. **Tier 3** — เลือกทีละตัวตามงานที่เจอ ไม่ใช่ติดตั้งล่วงหน้า

## 9. LABELS

| ข้ออ้าง | สถานะ |
|---|---|
| จำนวน skill ในแต่ละ agent dir | VERIFIED (นับจริง) |
| 3,283 repo ในคลังประวัติ | VERIFIED (grep + sort -u) |
| `skills` เป็นของ vercel-labs, MIT, v1.5.20 | VERIFIED (`npm view skills`) |
| ego-lite: 3,000 ดาว, migrate Chrome data | VERIFIED (README) |
| coreclaw: 64 ดาว, unaffiliated, ต้องใช้ API key | VERIFIED (README) |
| ego-lite ปลอดภัยหรือไม่ | **UNVERIFIED** — ยังไม่ได้อ่านโค้ด อ่านแต่ README |
| repo ใน Tier 3 | UNVERIFIED ทั้งหมด |
