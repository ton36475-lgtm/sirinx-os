# แผนที่ระบบ — อะไรมีอยู่จริง อะไรทับซ้อน

**สถานะ:** `[FINDINGS]` · วัดจากเครื่องจริง 2026-07-25
**เป้าหมายที่สั่ง:** *"ทุกระบบต้องมีอยู่จริงและไม่ทับซ้อนการทำงาน"*

---

## 1. Worktree — ทับซ้อน 4 ชั้น

```
$ git worktree list
/Users/sirinx/sirinx-os                                  9bad43c [main]
.worktrees/ghostclaw-durable-outbox                      b55f81e [codex/…-20260719]
.worktrees/ghostclaw-durable-outbox-admission-20260724   b55f81e [codex/…-admission-20260724]
.worktrees/ghostclaw-durable-outbox-final                b55f81e [codex/…-final-20260719]
.worktrees/project-state-truth-20260719                  b55f81e [codex/project-state-truth-20260719]

$ git diff --stat codex/…-20260719 codex/…-final-20260719
(ว่าง)
$ git diff --stat codex/…-20260719 codex/project-state-truth-20260719
(ว่าง)
```

**สี่ branch ชี้ commit เดียวกัน และ diff ว่างเปล่า = เนื้อหาเหมือนกันทุกไบต์**

| worktree | uncommitted | ขนาด |
|---|---|---|
| `ghostclaw-durable-outbox` | 14 | 100M |
| `ghostclaw-durable-outbox-admission-20260724` | 31 | **2.7G** |
| `ghostclaw-durable-outbox-final` | 3 | 100M |
| `project-state-truth-20260719` | 2 | 99M |

รวม `.worktrees` = **3.1G**

**ผลที่เกิดขึ้นจริงแล้ว:** งานทั้งหมดของเซสชัน 2026-07-25 (maxplus lane, cointh lane,
permission crate, `/goal` orchestrator, spec) อยู่ใน `admission-20260724` เท่านั้น
อีกสามตัวไม่มีเลย ใครเปิดผิดตัวก็เริ่มนับหนึ่งใหม่

ชื่อ `-final` และ `project-state-truth` สื่อว่าเป็น "ตัวจริง" ทั้งคู่ ทั้งที่ไม่มีตัวไหนจริง

## 2. Skills — กระจาย 10 ที่ ไม่มีที่ไหนครบ

```
~/.codex/skills        60      ~/.gemini/skills        9
~/.hermes/skills       36      ~/.deepseek/skills      5
~/.claude/skills       17      ~/.cua-driver/skills    1
~/.opencode/skills     11      ~/.zcode/skills         0
~/.agents/skills       10      ~/.openjarvis/skills    0
```

skill ที่นับเฉพาะโฟลเดอร์ที่มี `SKILL.md` จริง = **79 ตัวไม่ซ้ำ** · ต้อง copy **681 ครั้ง**
ถึงจะครบทุกที่

`zcode` และ `openjarvis` มี **0** ทั้งที่ zcode กำลังรันงานจริงอยู่ตอนนี้

เครื่องมือ: `tools/skills/sync-agent-skills.sh` (dry-run เป็น default)

## 3. z.code กำลังทำงานทับซ้อนกับเซสชันนี้ ณ ตอนนี้

```
$ ps | grep ZCode          → ZCode (pid 79211) + zcode-cli (pid 31197) รันอยู่
$ ls -lt ~/.zcode/cli/rollout
model-io-sess_subagent_agent_13cbfa94… 18:17
model-io-sess_subagent_agent_2f0d7d66… 18:17
model-io-sess_subagent_agent_6f0a8373… 18:17
```

3 subagent **GLM-5.2 / effort=max / thinking budget 32,000** กำลังสำรวจอยู่

path ที่มันแตะมากที่สุด:

```
108  ~/.zcode/cli/plugins
 68  ~/sirinx-sovereign-swarm
 50  ~/sirinx-os
 26  ~/SIRINXDev/sirinx-agent-native-os
 24  ~/sirinx-os/.worktrees/ghostclaw-durable-outbox-final
 22  ~/sirinx-os/.worktrees/claude
 12  ~/sirinx-os/.worktrees/project-state-truth-20260719
 12  ~/sirinx-os/.worktrees/ghostclaw-durable-outbox-admission-20260724
```

**มันกำลังสำรวจ worktree ชุดเดียวกับที่เซสชันนี้สำรวจ** — รวมถึงสามตัวที่ §1 พิสูจน์แล้วว่า
เนื้อหาเหมือนกันทุกไบต์ แปลว่ามีทั้ง agent ทับกันเอง และ agent ทับกับ worktree ที่ซ้ำกันอยู่แล้ว

## 4. โค้ดที่มีสองชุด

| ของ | ที่หนึ่ง | ที่สอง |
|---|---|---|
| Telegram bot | `ghostclaw-os/crates/telegram` — **ทำงานได้** long-polling + callback | `crates/ghostclaw-telegram` — ทุก method เป็น `unimplemented!()` |
| `LlmProvider` trait | `ghostclaw-os/crates/providers/src/lib.rs:39` — canonical ตาม v1.0 [5] | `crates/ghostclaw-providers/src/lib.rs:15` — drift |
| ไฟล์ provider ที่ไม่ถูกคอมไพล์ | — | `glm_provider.rs`, `ollama_provider.rs` ไม่ได้ประกาศเป็น `mod` |

## 5. เว็บ production ไม่มี source ในเครื่อง

`www.sirinx.co/projects/` (http 200) แสดงเรือนแพ รอยัลปาร์ค + โฮลาเทลริมน่าน ครบ
แต่ `apps/sirinx-site/src/projects/index.html` ในทั้ง 5 worktree **ไม่มีคำว่า "เรือนแพ" เลย**
(193 บรรทัดเหมือนกันหมด) และ `dist/` ที่ build ค้างไว้ตั้งแต่ 7 ก.ค. ก็ไม่มี

**ความเสี่ยง:** deploy จาก tree ไหนก็ได้ในเครื่องนี้ = เนื้อหาโรงแรมบนเว็บหายทั้งหมด

## 6. RED อนุมัติตัวเองได้

ดู `docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md` — บล็อกงาน automation loop
จนกว่าจะตัดสินใจ

---

## ลำดับที่แนะนำ

1. **ตัด worktree ซ้ำ** — เก็บ `admission-20260724` (มีงานทั้งหมด) ลบอีกสาม คืนพื้นที่ ~300M
   และตัดโอกาสทำงานผิดที่
   ```bash
   git worktree remove .worktrees/ghostclaw-durable-outbox
   git worktree remove .worktrees/ghostclaw-durable-outbox-final
   git worktree remove .worktrees/project-state-truth-20260719
   ```
   ⚠️ ทั้งสามมี uncommitted อยู่ (14 / 3 / 2 ไฟล์) — ตรวจก่อนลบ

2. **แจ้ง z.code ว่าสำรวจอะไรไปแล้ว** — ผลของ §1–§5 อยู่ในเอกสารนี้แล้ว ไม่ต้องให้ 3 subagent
   ที่ effort=max ไล่ซ้ำ

3. **sync skills** — `./tools/skills/sync-agent-skills.sh --execute` (อ่านสัก 2–3 ตัวก่อน)

4. **หา source เว็บจริง** — ก่อนแตะ `apps/sirinx-site` ใด ๆ

5. **P100** — รอคำตอบ Tony

## LABELS

ทุกตัวเลขในเอกสารนี้วัดจากเครื่องจริง (`git worktree list`, `git diff --stat`, `du -sh`,
`ps`, `find`, `curl`) — **VERIFIED** ทั้งหมด
ยกเว้น: source ของเว็บ production อยู่ที่ไหน — **UNVERIFIED**, ยังหาไม่เจอ
