# Reverse Engineering Canvas

## 1. Target
agency-agents (msitarzewski/agency-agents)

## 2. Purpose
147 specialized AI agents organized into 12 business divisions - เป็น pattern สำหรับ GhostClaw worker dispatch

## 3. User Flow
ผู้ใช้ git clone → มี 147 agent folder → แต่ละ agent เป็น markdown ที่อธิบาย role → ใช้กับ Claude/Codex/Gemini CLI

## 4. Core Capabilities
- Agent personas แบบ business-oriented (Engineering, Design, Marketing, QA)
- One-command installation
- Production-ready workflows
- Compatible กับหลาย platform

## 5. System Components
- UI: CLI + Agent instruction format
- API: ไม่มี (static agents)
- Backend: ไม่มี (framework agnostic)
- Worker: 147 markdown-based agents

## 6. Data Flow
Repo clone → Agent read → CLI invoke → Task execute

## 7. State Model
- Agent library loaded
- Agent dispatched
- Task completed
- Result returned

## 8. API Surface
ไม่มี API - static markdown interface

## 9. Security Boundary
Public repo - ไม่มี secret

## 10. Policy Risk
**X (Research Only)** - ใช้เป็น pattern reference ไม่ได้ install/run/bypass

## 11. What to Copy as Pattern
- Business division structure (12 divisions)
- Agent role format
- CLI integration approach

## 12. What Not to Copy
- Direct installation scripts
- Any cloud provider configs

## 13. Build Equivalent in GhostClaw
- เพิ่ม agency-agent pattern ไปยัง openspec/divisions/
- สร้าง GhostClaw worker dispatch ตาม division
- ใช้เป็น benchmark สำหรับ agent orchestration

## 14. Open Questions
- รายชื่อ 147 agents เท่าไรบ้าง
- Engineering division มีอะไรบ้าง