#!/usr/bin/env node
/**
 * scripts/brainstorm-workflow.js — Brain Storm Decision Analysis System
 *
 * ระบบวิเคราะห์โครงสร้างของคำสั่งก่อนอนุมัติการทำงาน
 * ให้ AI ตัดสินใจแทนมนุษย์ได้โดยอิงจากโครงสร้างคำสั่ง (ไม่ใช่เดา)
 *
 * Pipeline:
 *   1. PARSER    — แตกคำสั่งเป็น tokens / flags / targets
 *   2. ANALYZER  — จับคู่กับ policy rules (อิง AGENTS.md)
 *   3. DECIDER   — ให้คะแนน risk + ข้อเสนอการตัดสินใจ
 *
 * Output (JSON):
 *   {
 *     command, parsed, risk_score, risk_level,
 *     matched_rules[], recommendation, autosafe,
 *     human_decision_needed: bool
 *   }
 *
 * Safety:
 *   - อ่านได้เฉพาะ argv (ห้าม shell eval / อ่านไฟล์ระบบ)
 *   - ไม่แก้ไขสถานะใดๆ — วิเคราะห์เฉยๆ
 *   - ห้ามอ่าน .env / secret
 */

// ============ 1. PARSER ============
function parseCommand(raw) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const cmd = tokens[0] || "";
  const flags = tokens.filter((t) => t.startsWith("-"));
  const args = tokens.slice(1).filter((t) => !t.startsWith("-"));
  // target: path / url / repo
  const target = args.find((a) => /\.|\/|:/.test(a)) || args[0] || "";
  return { raw, tokens, cmd, flags, args, target };
}

// ============ 2. ANALYZER (policy rules from AGENTS.md) ============
const RULES = [
  { id: "DEPLOY", pattern: /(deploy|release|rollout|ship)/i, risk: 5,
    note: "Deploy/Release — ต้อง human gate (Tier C)" },
  { id: "GIT_PUSH", pattern: /(git push|gh pr|publish)/i, risk: 4,
    note: "Git push / PR — ห้ามโดยไม่มี human approval" },
  { id: "CLOUD_MUTATE", pattern: /(cloudflare|r2|aws|gcp|mutation|terraform)/i, risk: 5,
    note: "Cloud mutation — ต้อง human gate" },
  { id: "SECRET_WRITE", pattern: /(create.*(token|key|secret)|export.*(API_KEY|PASSWORD))/i, risk: 6,
    note: "สร้าง/เขียน secret — ห้ามเด็ดขาด" },
  { id: "ENV_EDIT", pattern: /(edit|\.env|write.*\.env)/i, risk: 4,
    note: "แก้ไข .env — ห้าม (ใช้ .env.example เท่านั้น)" },
  { id: "EXTERNAL_SEND", pattern: /(send.*(line|telegram|email|customer)|notify.*external)/i, risk: 5,
    note: "ส่งข้อความลูกค้าจริง — ต้อง human approval" },
  { id: "DESTRUCTIVE", pattern: /(rm -rf|drop table|delete.*force|format)/i, risk: 7,
    note: "คำสั่งทำลายข้อมูล — ห้ามรันอัตโนมัติ" },
  { id: "SHELL_INJECT", pattern: /(curl.*\|.*sh|wget.*\|.*sh|eval|base64.*decode)/i, risk: 6,
    note: "Pipe-to-shell / eval — เสี่ยง prompt injection" },
  { id: "READ_ONLY", pattern: /(cat|head|tail|ls|grep|node --check|python -c|status|health)/i, risk: 1,
    note: "Read-only / inspect — ปลอดภัย" },
  { id: "LOCAL_BUILD", pattern: /(npm (run )?build|pnpm|tsc|vitest|pytest|node scripts)/i, risk: 2,
    note: "Local build / test — ปลอดภัยใน workspace" },
  { id: "OCR_ANALYZE", pattern: /(ocr-analyze|ocr-qa-workflow|qa-gatekeeper)/i, risk: 1,
    note: "OCR / QA Gate — ปลอดภัย (read-only analysis)" },
];

function analyze(parsed) {
  const matched = [];
  for (const r of RULES) {
    if (r.pattern.test(parsed.raw) || r.pattern.test(parsed.cmd)) {
      matched.push({ id: r.id, risk: r.risk, note: r.note });
    }
  }
  const riskScore = matched.length ? Math.max(...matched.map((m) => m.risk)) : 1;
  return { matched, riskScore };
}

// ============ 3. DECIDER ============
function decide(parsed, analysis) {
  const { riskScore, matched } = analysis;
  let level = "LOW";
  if (riskScore >= 6) level = "CRITICAL";
  else if (riskScore >= 4) level = "HIGH";
  else if (riskScore >= 3) level = "MEDIUM";

  const humanNeeded = riskScore >= 4;
  let recommendation;
  if (riskScore >= 6) recommendation = "BLOCK — ห้ามรันโดยอัตโนมัติ (เสี่ยงสูงสุด)";
  else if (riskScore >= 4) recommendation = "HUMAN_GATE — รอมนุษย์อนุมัติก่อน";
  else if (riskScore >= 2) recommendation = "AUTO_SAFE — รันได้หากผ่าน safety scan";
  else recommendation = "AUTO_APPROVE — ปลอดภัย เช่น inspect";

  return {
    command: parsed.raw,
    parsed: { cmd: parsed.cmd, flags: parsed.flags, target: parsed.target },
    risk_score: riskScore,
    risk_level: level,
    matched_rules: matched,
    recommendation,
    autosafe: !humanNeeded,
    human_decision_needed: humanNeeded,
  };
}

// ============ CLI ============
const input = process.argv.slice(2).join(" ");
if (!input) {
  console.error("Usage: node scripts/brainstorm-workflow.js \"<command to evaluate>\"");
  process.exit(2);
}
const parsed = parseCommand(input);
const analysis = analyze(parsed);
const decision = decide(parsed, analysis);
console.log(JSON.stringify(decision, null, 2));
process.exit(0);
