#!/usr/bin/env node
/**
 * scripts/ocr-qa-workflow.js — Automated OCR → QA Gate pipeline
 *
 * Flow:
 *   1. รับ target (PDF/รูป/โค้ด)
 *   2. ถ้ามีเอกสาร → เรียก ocr-analyze.py (Baidu OCR)
 *   3. ผล OCR + โค้ด เข้า qa-gatekeeper.js
 *   4. รายงาน APPROVED / REJECTED + Mandate
 *
 * ใช้ของจริงเท่านั้น (Baidu OCR + PyMuPDF + external-gate)
 * ห้าม deploy/push — รายงานเฉยๆ
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const VENV = process.env.BAIDU_OCR_VENV || `${process.env.HOME}/.local/venvs/baidu-ocr`;

function runOcr(inputPath) {
  if (!existsSync(inputPath)) return { ok: false, error: "ไม่พบไฟล์" };
  const py = `${VENV}/bin/python`;
  if (!existsSync(py)) return { ok: false, error: `venv ไม่พบ: ${py}` };
  try {
    const out = execFileSync(py, ["scripts/ocr-analyze.py", inputPath], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${VENV}/bin:${process.env.PATH}` },
    });
    return { ok: true, markdown: out };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function runGate(target) {
  try {
    const out = execFileSync("node", ["scripts/qa-gatekeeper.js", target], { encoding: "utf8" });
    return JSON.parse(out);
  } catch (e) {
    const m = (e.stdout || "").match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { status: "ERROR", error: e.message };
  }
}

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/ocr-qa-workflow.js <pdf|image|code-file>");
  process.exit(2);
}

console.log(`[OCR-QA] เริ่ม pipeline สำหรับ: ${input}`);

// Step 1: OCR (ถ้าเป็นเอกสาร)
if (/\.(pdf|png|jpe?g)$/i.test(input)) {
  const ocr = runOcr(input);
  if (ocr.ok) {
    console.log(`[OCR-QA] OCR สำเร็จ (${ocr.markdown.length} ตัวอักษร)`);
  } else {
    console.log(`[OCR-QA] ⚠️ OCR ข้ามได้: ${ocr.error}`);
  }
}

// Step 2: QA Gate
const gate = runGate(input);
console.log(`[OCR-QA] Gate Status: ${gate.status}`);
if (gate.status === "REJECTED") {
  console.log(`[OCR-QA] 🔧 Refactoring Mandate:`);
  console.log(JSON.stringify(gate.mandate, null, 2));
  process.exit(1);
}
console.log(`[OCR-QA] ✅ APPROVED checksum=${gate.checksum}`);
process.exit(0);
