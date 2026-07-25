import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { assertNoClosedGateViolations } from "./closed-gate-checks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const repoRoot = resolve(root, "..", "..");
const dist = resolve(root, "dist");
const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "_headers",
  "_redirects",
  "robots.txt",
  "config/lineOfficial.json",
  "components/floating-contact.css",
  "components/floating-contact.js",
  "line/index.html",
  "contact/index.html",
  "trust-center/index.html",
  "projects/index.html",
  "quote/index.html",
  "roi-calculator/index.html"
];
const requiredSpecFiles = [
  "docs/specs/website-quality/BRD.md",
  "docs/specs/website-quality/FRD.md",
  "docs/specs/website-quality/UI_FLOW.md",
  "docs/specs/website-quality/TEST_CASES.md",
  "docs/specs/website-quality/ROLLBACK_PLAN.md",
  "docs/specs/line-oa-flow/BRD.md",
  "docs/specs/line-oa-flow/FRD.md",
  "docs/specs/line-oa-flow/UI_FLOW.md",
  "docs/specs/line-oa-flow/DATA_CONTRACT.md",
  "docs/specs/line-oa-flow/TEST_CASES.md",
  "docs/specs/line-oa-flow/ROLLBACK_PLAN.md",
  "docs/specs/quote-roi-crm-readiness/BRD.md",
  "docs/specs/quote-roi-crm-readiness/FRD.md",
  "docs/specs/quote-roi-crm-readiness/UI_FLOW.md",
  "docs/specs/quote-roi-crm-readiness/DATA_CONTRACT.md",
  "docs/specs/quote-roi-crm-readiness/FUTURE_ARCHITECTURE.md",
  "docs/specs/quote-roi-crm-readiness/TEST_CASES.md",
  "docs/specs/quote-roi-crm-readiness/ROLLBACK_PLAN.md",
  "docs/runbooks/SIRINX_WEBSITE_QUALITY_RUNBOOK.md",
  "docs/runbooks/LINE_OFFICIAL_WEBSITE_INTEGRATION_RUNBOOK.md",
  "docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md",
  "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_CHECKLIST_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_COMPLETION_AUDIT_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_LIVE_INDEX_SOURCE_SYNC_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_GITHUB_BASELINE_REVIEW_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_GITHUB_CONNECTOR_RECHECK_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_GITHUB_CURRENT_RECHECK_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_GITHUB_LIVE_LOCAL_AUTOMATED_RECHECK_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html",
  "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_LINE_QR_LINK_RECHECK_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_LOCAL_PREVIEW_HEALTH_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_LOCAL_REVIEW_RUN_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_EVIDENCE_CONTRACT_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_INTAKE_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RECEIPT_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_GATE_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_MASTER_PLAN_CURRENT_AUDIT_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_RELEASE_PREFLIGHT_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_REVIEW_STAGING_MANIFEST_2026-07-03.md",
  "docs/website/SIRINX_WEBSITE_REVIEW_EVIDENCE_REFRESH_2026-07-03.md",
  "docs/website/SIRINX_SITE_ROI_CALCULATOR_TASK_RECEIPT_2026-07-03.md"
];
const requiredTestFiles = [
  "apps/sirinx-site/scripts/capture-review-screenshots.mjs",
  "apps/sirinx-site/scripts/capture-review-screenshots.test.mjs",
  "apps/sirinx-site/scripts/closed-gate-checks.test.mjs",
  "apps/sirinx-site/scripts/generate-human-review-board.mjs",
  "apps/sirinx-site/scripts/generate-human-review-board.test.mjs",
  "apps/sirinx-site/scripts/github-live-local-recheck.mjs",
  "apps/sirinx-site/scripts/github-live-local-recheck.test.mjs",
  "apps/sirinx-site/scripts/line-qr-link-recheck.mjs",
  "apps/sirinx-site/scripts/line-qr-link-recheck.test.mjs",
  "apps/sirinx-site/scripts/local-preview-health.mjs",
  "apps/sirinx-site/scripts/local-preview-health.test.mjs",
  "apps/sirinx-site/scripts/local-review-run.mjs",
  "apps/sirinx-site/scripts/local-review-run.test.mjs",
  "apps/sirinx-site/scripts/manual-review-evidence-contract.mjs",
  "apps/sirinx-site/scripts/manual-review-evidence-contract.test.mjs",
  "apps/sirinx-site/scripts/manual-review-intake.mjs",
  "apps/sirinx-site/scripts/manual-review-intake.test.mjs",
  "apps/sirinx-site/scripts/manual-review-receipt.mjs",
  "apps/sirinx-site/scripts/manual-review-receipt.test.mjs",
  "apps/sirinx-site/scripts/manual-review-gate.mjs",
  "apps/sirinx-site/scripts/manual-review-gate.test.mjs",
  "apps/sirinx-site/scripts/master-plan-current-audit.mjs",
  "apps/sirinx-site/scripts/master-plan-current-audit.test.mjs",
  "apps/sirinx-site/scripts/release-readiness.mjs",
  "apps/sirinx-site/scripts/release-readiness.test.mjs",
  "apps/sirinx-site/scripts/review-gate-checks.test.mjs",
  "apps/sirinx-site/scripts/review-evidence-refresh.mjs",
  "apps/sirinx-site/scripts/review-evidence-refresh.test.mjs",
  "apps/sirinx-site/src/roi-calculator/roi-calculator.guard.test.mjs",
  "apps/sirinx-site/scripts/server.test.mjs",
  "apps/sirinx-site/tests/line-integration.spec.ts"
];
const requiredPacketFiles = [
  "_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json",
  "_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json",
  "_A2A_QUEUE/outbox/packet_041_sirinx_website_visual_correction_evidence_receipt.json",
  "_A2A_QUEUE/outbox/packet_042_sirinx_website_seo_aeo_metadata_evidence_receipt.json",
  "_A2A_QUEUE/outbox/packet_043_sirinx_website_accessibility_performance_guardrail_receipt.json",
  "_A2A_QUEUE/outbox/packet_044_sirinx_website_human_review_checklist_receipt.json",
  "_A2A_QUEUE/outbox/packet_045_sirinx_website_manual_review_result_template_receipt.json",
  "_A2A_QUEUE/outbox/packet_046_sirinx_website_professional_copy_seo_aeo_breadcrumb_receipt.json",
  "_A2A_QUEUE/outbox/packet_047_sirinx_line_faqpage_aeo_schema_receipt.json",
  "_A2A_QUEUE/outbox/packet_048_sirinx_website_theme_correction_receipt.json",
  "_A2A_QUEUE/outbox/packet_049_sirinx_website_theme_nav_guardrail_receipt.json",
  "_A2A_QUEUE/outbox/packet_050_sirinx_website_completion_audit_receipt.json",
  "_A2A_QUEUE/outbox/packet_051_sirinx_website_live_index_source_sync_receipt.json",
  "_A2A_QUEUE/outbox/packet_052_sirinx_website_evidence_docs_live_index_refresh.json",
  "_A2A_QUEUE/outbox/packet_053_sirinx_website_github_baseline_review.json",
  "_A2A_QUEUE/outbox/packet_054_sirinx_website_review_staging_manifest.json",
  "_A2A_QUEUE/outbox/packet_055_sirinx_website_check_guardrail_receipt.json",
  "_A2A_QUEUE/outbox/packet_056_sirinx_website_review_gate_regression_receipt.json",
  "_A2A_QUEUE/outbox/packet_057_sirinx_website_release_readiness_dry_run_receipt.json",
  "_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json",
  "_A2A_QUEUE/outbox/packet_059_sirinx_website_github_current_recheck.json",
  "_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json",
  "_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json",
  "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json",
  "_A2A_QUEUE/outbox/packet_063_sirinx_website_local_review_run.json",
  "_A2A_QUEUE/outbox/packet_064_sirinx_website_github_connector_recheck.json",
  "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
  "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
  "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
  "_A2A_QUEUE/outbox/packet_068_sirinx_website_review_evidence_refresh.json",
  "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
  "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
  "_A2A_QUEUE/outbox/packet_071_sirinx_website_release_preflight.json",
  "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json",
  "_A2A_QUEUE/outbox/packet_073_sirinx_site_roi_calculator_task_receipt.json"
];
const secretPrefixPatterns = [
  ["sk", "[A-Za-z0-9_-]{20,}"].join("-"),
  ["ghp", "[A-Za-z0-9_]{20,}"].join("_"),
  ["AK", "IA[0-9A-Z]{16}"].join(""),
  ["xox", "[baprs]-[A-Za-z0-9-]{10,}"].join("")
];
const secretPattern = new RegExp(
  `(${secretPrefixPatterns.join("|")}|BEGIN (RSA|OPENSSH|PRIVATE) KEY)|^\\s*(API_KEY|PASSWORD|TOKEN|SECRET)\\s*[:=]`,
  "m"
);
const lineExpected = {
  displayName: "SIRINX โซล่าเซลล์",
  shortLink: "https://lin.ee/S97R6nj",
  basicId: "@304zrttj",
  premiumIdTarget: "@sirinx",
  qrImageUrl: "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
  addFriendUrl: "https://line.me/R/ti/p/%40304zrttj",
  chatUrl: "https://line.me/R/oaMessage/%40304zrttj"
};
const liveHomeOgImage =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663541525436/DfaBNh7LYBahFVi2JKfAUv/sirinx-og-image-hbNko5JADXArPGo26hmGrN.png";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

for (const file of requiredFiles) {
  const item = await stat(join(dist, file)).catch(() => null);
  if (!item?.isFile()) {
    throw new Error(`Missing build output file: ${file}`);
  }
}

for (const file of requiredSpecFiles) {
  const item = await stat(join(repoRoot, file)).catch(() => null);
  if (!item?.isFile()) {
    throw new Error(`Missing website governance document: ${file}`);
  }
}

for (const file of requiredTestFiles) {
  const item = await stat(join(repoRoot, file)).catch(() => null);
  if (!item?.isFile()) {
    throw new Error(`Missing website verification file: ${file}`);
  }
}

for (const file of requiredPacketFiles) {
  const packetPath = join(repoRoot, file);
  const item = await stat(packetPath).catch(() => null);
  if (!item?.isFile()) {
    throw new Error(`Missing website A2A packet: ${file}`);
  }

  JSON.parse(await readFile(packetPath, "utf8"));
}

const files = await walk(dist);
for (const file of files) {
  if (file.includes(".bak.")) {
    throw new Error(`Backup file leaked into build output: ${file}`);
  }

  if (file.includes(`${join("src", "_partials")}`) || file.includes("_partials")) {
    throw new Error(`Source partial leaked into build output: ${file}`);
  }
}

for (const file of files) {
  const content = await readFile(file, "utf8").catch(() => "");
  if (secretPattern.test(content)) {
    throw new Error(`Secret-like pattern found in ${file}`);
  }
}

const index = await readFile(join(dist, "index.html"), "utf8");
if (!index.includes("sirinx.co")) {
  throw new Error("index.html must reference sirinx.co");
}

const linePage = await readFile(join(dist, "line", "index.html"), "utf8");
const contactPage = await readFile(join(dist, "contact", "index.html"), "utf8");
const trustCenterPage = await readFile(join(dist, "trust-center", "index.html"), "utf8");
const projectsPage = await readFile(join(dist, "projects", "index.html"), "utf8");
const quotePage = await readFile(join(dist, "quote", "index.html"), "utf8");
const roiPage = await readFile(join(dist, "roi-calculator", "index.html"), "utf8");
const styles = await readFile(join(dist, "styles.css"), "utf8");
const app = await readFile(join(dist, "app.js"), "utf8");
const javascriptRuntimeContents = new Map(
  await Promise.all(
    files
      .filter((file) => file.endsWith(".js"))
      .map(async (file) => [file, await readFile(file, "utf8")])
  )
);
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const lineConfig = JSON.parse(await readFile(join(dist, "config", "lineOfficial.json"), "utf8"));
const combinedBuiltSite = [
  index,
  linePage,
  contactPage,
  trustCenterPage,
  projectsPage,
  quotePage,
  roiPage,
  app
].join("\n");
const forbiddenOutcomeClaimPatterns = [
  { pattern: /ลดค่าไฟ\s*30\s*-\s*100\s*%/i, reason: "unsupported fixed savings range" },
  { pattern: /คืนทุน\s*3\s*-\s*5\s*ปี/i, reason: "unsupported fixed payback range" },
  { pattern: /รายได้การันตี/i, reason: "guaranteed income claim" },
  { pattern: /ผลตอบแทนการันตี/i, reason: "guaranteed return claim" },
  { pattern: /ประหยัดแน่นอน/i, reason: "guaranteed savings claim" },
  { pattern: /คืนทุนแน่นอน/i, reason: "guaranteed payback claim" }
];
const specContents = new Map(
  await Promise.all(
    requiredSpecFiles.map(async (file) => [file, await readFile(join(repoRoot, file), "utf8")])
  )
);

for (const [key, value] of Object.entries(lineExpected)) {
  if (lineConfig[key] !== value) {
    throw new Error(`LINE config mismatch for ${key}`);
  }
}

const requiredHomepageSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  "SIRINX | Solar Carport วางแผนลดค่าไฟองค์กร พร้อม EV Charger, BESS &amp; AI Energy",
  "เปลี่ยนที่จอดรถ",
  "เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์",
  "ผลิตไฟฟ้า ให้ร่มเงา รองรับ EV Charger พร้อมประเมินช่วงลดค่าไฟและเงื่อนไขคืนทุนจากข้อมูลไซต์จริง",
  "ขอใบเสนอราคา Solar Carport",
  "ดูผลงานจริง",
  'href="/contact"',
  'href="/line"',
  'href="/projects"',
  'href="/trust-center"',
  'href="/quote"',
  'href="/roi-calculator"',
  'rel="preload" as="image"',
  'id="floating-contact-cluster"',
  'aria-label="คุยกับบอท / แอด LINE Official"',
  'aria-controls="line-panel"',
  'aria-controls="inquiry-panel"',
  'aria-controls="mobile-panel"',
  'aria-expanded="false"',
  'width="240"',
  'height="240"',
  'width="280"',
  'height="280"',
  'decoding="async"',
  "data-qr-image",
  "QR ไม่แสดง? กดปุ่มเพิ่มเพื่อน LINE ด้านล่าง",
  'data-track-events="line_add_friend_click line_shortlink_click"',
  'data-track-event="line_chat_click"',
  'data-track-event="quote_cta_click"',
  "https://lin.ee/S97R6nj",
  "https://line.me/R/oaMessage/%40304zrttj",
  "QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX"
];

const requiredLinePageSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  'rel="preload" as="image"',
  "ติดต่อ SIRINX ผ่าน LINE Official",
  "เลือกโจทย์ที่ต้องการให้ทีมประเมินเบื้องต้น",
  '"@type": "FAQPage"',
  '"acceptedAnswer"',
  'href="https://lin.ee/S97R6nj"',
  'href="https://line.me/R/ti/p/%40304zrttj"',
  'href="https://line.me/R/oaMessage/%40304zrttj"',
  lineExpected.qrImageUrl,
  'width="320"',
  'height="320"',
  'fetchpriority="high"',
  'decoding="async"',
  "data-qr-image",
  "QR ไม่แสดง? กดปุ่มเพิ่มเพื่อน LINE ด้านล่าง",
  'data-track-events="line_add_friend_click line_shortlink_click"',
  'data-track-event="line_add_friend_click"',
  'data-track-event="line_chat_click"',
  'data-track-event="line_shortlink_click"',
  'data-track-event="quote_cta_click"',
  lineExpected.basicId,
  "ส่งบิลค่าไฟให้ทีมประเมิน",
  "ประเมิน Solar Carport สำหรับองค์กร",
  "ประเมิน Rooftop Solar สำหรับอาคาร",
  "EV Charger / BESS",
  "นัดสำรวจหน้างาน",
  "เว็บไซต์บริษัท",
  "บริการหลัก",
  "ช่องทางติดต่อ",
  "ทีมประเมินระบบ",
  "ต้องเตรียมข้อมูลอะไรบ้าง",
  "ประเมินเบื้องต้นฟรีไหม",
  "ใช้เวลาประเมินกี่วัน",
  "ถ้าไม่มีบิลค่าไฟทำได้ไหม",
  "ส่งรูปพื้นที่แทนได้ไหม",
  "ขอใบเสนอราคา",
  "ดูผลงาน"
];

const requiredContactPageSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  'rel="preload" as="image"',
  "คุยกับทีม SIRINX เพื่อประเมินระบบพลังงานองค์กร",
  'href="https://lin.ee/S97R6nj"',
  'href="https://line.me/R/oaMessage/%40304zrttj"',
  'href="mailto:contact@sirinx.co"',
  lineExpected.qrImageUrl,
  'width="320"',
  'height="320"',
  'fetchpriority="high"',
  'decoding="async"',
  "data-qr-image",
  "QR ไม่แสดง? กดปุ่มเพิ่มเพื่อน LINE ด้านล่าง",
  'data-track-events="line_add_friend_click line_shortlink_click"',
  'data-track-event="line_chat_click"',
  'data-track-event="quote_cta_click"',
  lineExpected.basicId,
  "LINE Official เหมาะสำหรับส่งบิลค่าไฟ",
  "เริ่มจากข้อมูลจริง ก่อนตัดสินใจลงทุน",
  "บิลค่าไฟล่าสุด",
  "รูปหลังคาหรือพื้นที่ติดตั้ง"
];

const requiredTrustCenterSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  'href="/projects"',
  'href="/trust-center"',
  "Trust Center ของ SIRINX สำหรับงาน Solar และ AI Energy",
  "หลักการที่ใช้ก่อนเปิดระบบหรือเผยแพร่ข้อมูล",
  "หลักฐานก่อนคำกล่าวอ้าง",
  "อนุมัติก่อนระบบอัตโนมัติ",
  "ขอบเขตข้อมูลลูกค้า",
  "เส้นทางย้อนกลับ",
  "การเปิดใช้ LINE webhook",
  "analytics บนระบบจริง",
  "CRM และที่เก็บข้อมูลลูกค้า",
  "การเขียนฐานข้อมูลหรือ MongoDB",
  "ระบบที่ยังต้องรออนุมัติแยกต่างหาก"
];

const requiredProjectsSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  'href="/projects"',
  'href="/trust-center"',
  "ผลงาน SIRINX และมาตรฐานหลักฐานโครงการ",
  "มาตรฐานก่อนเผยแพร่เคสโครงการ",
  "ไม่ใช้รูปหน้างาน",
  "สิทธิ์เผยแพร่จากลูกค้า",
  "ขอบเขตทางเทคนิค",
  "ตรวจสอบรูปและสื่อ",
  "ภาษาที่ไม่กล่าวอ้างเกินจริง",
  "Solar Carport",
  "Rooftop Solar",
  "AI Energy Management",
  "ข้อมูลที่ตรวจสอบได้"
];

const requiredQuotePageSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  'href="/quote"',
  'href="/roi-calculator"',
  "เตรียมข้อมูลขอประเมิน Solar Carport และ Rooftop Solar กับ SIRINX",
  "เช็กลิสต์บนหน้านี้ช่วยให้เตรียมข้อมูล",
  "ไม่มีการส่งข้อมูล",
  "ยังไม่รับข้อมูลลูกค้าผ่านเว็บ",
  "บิลค่าไฟล่าสุด",
  "รูปหลังคา ลานจอดรถ หรือพื้นที่ติดตั้ง",
  "ตรวจความพร้อมของข้อมูลโครงการก่อนส่ง LINE",
  "data-readiness-checklist",
  "data-readiness-option",
  "data-readiness-status",
  "ไม่มีการส่งข้อมูล ไม่มีการบันทึกลงเบราว์เซอร์",
  "ไม่ใช่ quote form และไม่บันทึกข้อมูลลูกค้า",
  "CRM และที่เก็บข้อมูลลูกค้า",
  "LINE webhook",
  "analytics บนระบบจริง",
  "data-crm-handoff-readiness",
  'data-gate-state="closed"',
  "เส้นทางรับ lead เข้า CRM ที่ยังปิดไว้",
  "ขอความยินยอมก่อนจัดเก็บ",
  "ใช้ข้อมูลเท่าที่จำเป็น",
  "ตรวจข้อมูลก่อนส่ง CRM",
  "ออกหลักฐานหลังอนุมัติ",
  "ยังไม่เชื่อมฐานข้อมูลจริง",
  "เพิ่มเพื่อน LINE Official"
];

const requiredRoiPageSnippets = [
  'property="og:title"',
  'type="application/ld+json"',
  'href="/quote"',
  'href="/roi-calculator"',
  "เตรียมประเมิน ROI โซลาร์สำหรับองค์กร",
  "เตรียมบิลค่าไฟ พื้นที่ติดตั้ง",
  "คำนวณกรอบ ROI เบื้องต้นในเบราว์เซอร์",
  "data-roi-calculator",
  'data-roi-input="monthlyBill"',
  'data-roi-input="area"',
  'data-roi-input="daytimeUse"',
  'data-roi-input="electricityRate"',
  "data-roi-size-output",
  "data-roi-saving-output",
  "data-roi-payback-output",
  "ช่วงค่าไฟรายเดือน",
  "การใช้ไฟช่วงกลางวัน",
  "ผลลัพธ์เป็นช่วงประมาณการ",
  "ตรวจความพร้อมข้อมูลสำหรับช่วง ROI",
  "data-readiness-checklist",
  "data-readiness-option",
  "data-readiness-status",
  "คำนวณเป็นกรอบประมาณการเท่านั้น",
  "ไม่บันทึกข้อมูลลูกค้าและไม่ส่งข้อมูลออกจากหน้าเว็บ",
  "ไม่รับประกันผลประหยัดจากหน้าเว็บ",
  "ยังไม่มี CRM หรือที่เก็บข้อมูลลูกค้า",
  "ยังไม่มี analytics บนระบบจริง"
];

const requiredStyleSnippets = [
  ".sr-only",
  ".line-main-card",
  ".contact-route-grid",
  ".contact-route-card",
  ".assurance-grid",
  ".proof-stage-grid",
  ".quote-step-grid",
  ".roi-assumption-grid",
  ".roi-estimator",
  ".roi-result-panel",
  ".evidence-row",
  ".proof-category-grid",
  ".readiness-validator",
  ".readiness-checklist",
  ".readiness-option",
  ".readiness-status",
  ".quick-actions-grid",
  ".trust-link-grid",
  ".faq-list",
  ".floating-contact-cluster",
  ".contact-dock-desktop",
  ".mobile-bottom-sheet",
  ".qr-image-mobile",
  ".qr-fallback",
  ".qr-error + .qr-fallback",
  "aspect-ratio: 1 / 1",
  "object-fit: contain",
  "translate3d(0, 24px, 0)",
  "will-change: transform"
];

const requiredAppSnippets = [
  "if (!mobileTrigger || !desktopDock)",
  "function initQrFallbacks()",
  "function initReadinessChecklists()",
  "data-readiness-checklist",
  "data-readiness-option",
  "data-readiness-status",
  "data-qr-image",
  "data-qr-status",
  "qr-error",
  "function setExpanded(controlId, expanded)",
  "setAttribute('aria-expanded'",
  "window.openLinePanel",
  "window.closeLinePanel",
  "window.toggleMobilePanel",
  "window.trackEvent = existingTrackEvent || emitTrackEvent",
  "data-track-event",
  "line_floating_open",
  "line_qr_view",
  "contact_cluster_open",
  "website_bot_open",
  "website_bot_line_group_open"
];

const requiredEventSnippets = [
  "line_floating_open",
  "line_qr_view",
  "line_add_friend_click",
  "line_chat_click",
  "line_shortlink_click",
  "quote_cta_click",
  "contact_cluster_open",
  "website_bot_open",
  "website_bot_line_group_open"
];

const requiredFloatingContactSnippets = [
  'id="floating-contact-cluster"',
  'class="floating-contact-cluster"',
  'aria-label="คุยกับบอท / แอด LINE Official"',
  'aria-controls="line-panel"',
  'aria-controls="inquiry-panel"',
  'aria-controls="mobile-panel"',
  'width="240"',
  'height="240"',
  'width="280"',
  'height="280"',
  "QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX",
  "https://lin.ee/S97R6nj",
  "https://line.me/R/oaMessage/%40304zrttj"
];

const pagesWithoutLeadCapture = new Map([
  ["/", index],
  ["/line", linePage],
  ["/contact", contactPage],
  ["/trust-center", trustCenterPage],
  ["/projects", projectsPage],
  ["/quote", quotePage],
  ["/roi-calculator", roiPage]
]);
const routeSeoExpectations = new Map([
  [
    "/",
    {
      content: index,
      url: "https://www.sirinx.co/",
      image: liveHomeOgImage
    }
  ],
  [
    "/line",
    {
      content: linePage,
      url: "https://www.sirinx.co/line",
      image: lineExpected.qrImageUrl
    }
  ],
  [
    "/contact",
    {
      content: contactPage,
      url: "https://www.sirinx.co/contact",
      image: lineExpected.qrImageUrl
    }
  ],
  [
    "/trust-center",
    {
      content: trustCenterPage,
      url: "https://www.sirinx.co/trust-center",
      image: "https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg"
    }
  ],
  [
    "/projects",
    {
      content: projectsPage,
      url: "https://www.sirinx.co/projects",
      image: "https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg"
    }
  ],
  [
    "/quote",
    {
      content: quotePage,
      url: "https://www.sirinx.co/quote",
      image: "https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg"
    }
  ],
  [
    "/roi-calculator",
    {
      content: roiPage,
      url: "https://www.sirinx.co/roi-calculator",
      image: "https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg"
    }
  ]
]);
const routeBreadcrumbExpectations = new Map([
  [
    "/line",
    {
      content: linePage,
      url: "https://www.sirinx.co/line",
      name: "LINE Official"
    }
  ],
  [
    "/contact",
    {
      content: contactPage,
      url: "https://www.sirinx.co/contact",
      name: "ติดต่อ"
    }
  ],
  [
    "/trust-center",
    {
      content: trustCenterPage,
      url: "https://www.sirinx.co/trust-center",
      name: "Trust Center"
    }
  ],
  [
    "/projects",
    {
      content: projectsPage,
      url: "https://www.sirinx.co/projects",
      name: "ผลงาน"
    }
  ],
  [
    "/quote",
    {
      content: quotePage,
      url: "https://www.sirinx.co/quote",
      name: "ขอใบเสนอราคา"
    }
  ],
  [
    "/roi-calculator",
    {
      content: roiPage,
      url: "https://www.sirinx.co/roi-calculator",
      name: "ROI"
    }
  ]
]);
const routeFaqExpectations = new Map([
  [
    "/line",
    {
      content: linePage,
      questions: [
        "ต้องเตรียมข้อมูลอะไรบ้าง",
        "ประเมินเบื้องต้นฟรีไหม",
        "ใช้เวลาประเมินกี่วัน",
        "ถ้าไม่มีบิลค่าไฟทำได้ไหม",
        "ส่งรูปพื้นที่แทนได้ไหม"
      ],
      answers: [
        "บิลค่าไฟล่าสุด รูปพื้นที่ติดตั้ง ตำแหน่งโดยประมาณ ประเภทระบบที่สนใจ และเป้าหมายโครงการช่วยให้ทีมประเมินได้เร็วขึ้น",
        "การคุยเบื้องต้นผ่าน LINE ใช้เพื่อประเมินข้อมูลและแจ้งขั้นตอนถัดไป ยังไม่ใช่ใบเสนอราคาและยังไม่มีการผูกมัดงานติดตั้ง",
        "ระยะเวลาขึ้นกับความครบถ้วนของข้อมูล ขนาดโครงการ และคำถามทางเทคนิคที่ต้องตรวจต่อ ทีมจะแจ้งขั้นตอนถัดไปผ่าน LINE",
        "ทำได้ในระดับประเมินเบื้องต้น โดยส่งข้อมูลการใช้ไฟโดยประมาณ รูปพื้นที่ และเป้าหมายโครงการให้ทีมช่วยดูแนวทางก่อน",
        "ได้ รูปหลังคา ลานจอดรถ ตู้ไฟ พื้นที่ติดตั้ง หรือจุดที่มีข้อจำกัดช่วยให้ทีมแยกประเภทระบบและคำถามหน้างานได้ดีขึ้น"
      ]
    }
  ]
]);
const routeCurrentNavExpectations = new Map([
  ["/line", 'href="/line" aria-current="page"'],
  ["/contact", 'href="/contact" aria-current="page"'],
  ["/trust-center", 'href="/trust-center" aria-current="page"'],
  ["/projects", 'href="/projects" aria-current="page"'],
  ["/quote", 'href="/quote" aria-current="page"'],
  ["/roi-calculator", 'href="/roi-calculator" aria-current="page"']
]);
const subpageNavItems = [
  { href: "/projects", label: "ผลงาน" },
  { href: "/trust-center", label: "Trust" },
  { href: "/quote", label: "Quote" },
  { href: "/roi-calculator", label: "ROI" },
  { href: "/contact", label: "ติดต่อ" },
  { href: "/line", label: "LINE" }
];
const legacySubpageNavLabels = [">หน้าแรก</a>", ">ความสามารถ</a>", ">ขอใบเสนอราคา</a>", ">Trust Center</a>", ">LINE Official</a>"];

function extractNav(content, route) {
  const match = content.match(/<nav\b[^>]*class="[^"]*\bnav-links\b[^"]*"[^>]*>[\s\S]*?<\/nav>/);
  if (!match) {
    throw new Error(`${route} is missing nav-links navigation`);
  }

  return match[0];
}

assertNoClosedGateViolations({
  pages: pagesWithoutLeadCapture,
  scripts: javascriptRuntimeContents
});

for (const [route, content] of pagesWithoutLeadCapture) {
  for (const { pattern, reason } of forbiddenOutcomeClaimPatterns) {
    if (pattern.test(content)) {
      throw new Error(`${route} includes blocked outcome claim: ${reason}`);
    }
  }

  const requiredAccessibilitySnippets = [
    '<html lang="th">',
    '<a class="skip-link" href="#main">',
    '<main id="main"',
    'aria-label="เมนูหลัก"'
  ];

  for (const snippet of requiredAccessibilitySnippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${route} is missing accessibility snippet: ${snippet}`);
    }
  }

  const currentNavSnippet = routeCurrentNavExpectations.get(route);
  if (currentNavSnippet && !content.includes(currentNavSnippet)) {
    throw new Error(`${route} is missing current navigation marker: ${currentNavSnippet}`);
  }

  if (route !== "/") {
    const requiredSubpageThemeSnippets = [
      '<header class="production-header" aria-label="เมนูหลัก">',
      '<span class="production-brand-mark" aria-hidden="true">SIRINX</span>',
      '<nav class="nav-links production-nav" aria-label="ลิงก์หลัก">',
      '<footer class="production-footer">',
      "SIRINX Solar Carport, EV Charger, BESS &amp; AI Energy"
    ];
    const blockedSubpageThemeSnippets = [
      '<span class="brand-mark" aria-hidden="true">SX</span>',
      "<small>solar + AI energy</small>",
      '<footer class="site-footer">',
      "SIRINX solar + AI energy"
    ];

    for (const snippet of requiredSubpageThemeSnippets) {
      if (!content.includes(snippet)) {
        throw new Error(`${route} is missing homepage-aligned theme snippet: ${snippet}`);
      }
    }

    for (const snippet of blockedSubpageThemeSnippets) {
      if (content.includes(snippet)) {
        throw new Error(`${route} still contains legacy mixed theme snippet: ${snippet}`);
      }
    }

    const nav = extractNav(content, route);
    let lastIndex = -1;

    for (const item of subpageNavItems) {
      const linkPattern = new RegExp(`<a href="${item.href}"(?: aria-current="page")?>${item.label}</a>`);
      const itemIndex = nav.search(linkPattern);
      if (itemIndex === -1) {
        throw new Error(`${route} navigation is missing homepage-aligned item: ${item.label} (${item.href})`);
      }
      if (itemIndex <= lastIndex) {
        throw new Error(`${route} navigation item is out of homepage-aligned order: ${item.label}`);
      }
      lastIndex = itemIndex;
    }

    for (const legacyLabel of legacySubpageNavLabels) {
      if (nav.includes(legacyLabel)) {
        throw new Error(`${route} navigation still contains legacy label: ${legacyLabel}`);
      }
    }
  }

  const imageTags = content.match(/<img\b[^>]*>/g) || [];
  for (const imageTag of imageTags) {
    if (!/\salt="[^"]+"/.test(imageTag)) {
      throw new Error(`${route} has an image without non-empty alt text: ${imageTag}`);
    }

    if (!/\swidth="\d+"/.test(imageTag) || !/\sheight="\d+"/.test(imageTag)) {
      throw new Error(`${route} has an image without stable width and height: ${imageTag}`);
    }
  }
}

for (const [route, { content, url, image }] of routeSeoExpectations) {
  const requiredSeoSnippets = [
    "<title>",
    'name="description"',
    `<meta property="og:url" content="${url}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="SIRINX" />',
    'property="og:title"',
    'property="og:description"',
    `<meta property="og:image" content="${image}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:image" content="${image}" />`,
    '<meta name="robots" content="index, follow" />',
    '<meta name="theme-color" content="#0a1628" />',
    `<link rel="canonical" href="${url}" />`,
    'type="application/ld+json"'
  ];

  for (const snippet of requiredSeoSnippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${route} is missing SEO/AEO metadata snippet: ${snippet}`);
    }
  }

  if (!/<title>[^<]{20,}<\/title>/.test(content)) {
    throw new Error(`${route} must include a descriptive title`);
  }

  if (!/<meta\s+name="description"\s+content="[^"]{80,}"/.test(content)) {
    throw new Error(`${route} must include a descriptive meta description`);
  }
}

for (const [route, { content, url, name }] of routeBreadcrumbExpectations) {
  const requiredBreadcrumbSnippets = [
    '"@type": "BreadcrumbList"',
    '"@type": "ListItem"',
    '"position": 1',
    '"name": "หน้าแรก"',
    '"item": "https://www.sirinx.co/"',
    '"position": 2',
    `"name": "${name}"`,
    `"item": "${url}"`
  ];

  for (const snippet of requiredBreadcrumbSnippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${route} is missing breadcrumb schema snippet: ${snippet}`);
    }
  }
}

for (const [route, { content, questions, answers }] of routeFaqExpectations) {
  const requiredFaqSnippets = ['"@type": "FAQPage"', '"@type": "Question"', '"acceptedAnswer"'];

  for (const snippet of requiredFaqSnippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${route} is missing FAQ schema snippet: ${snippet}`);
    }
  }

  for (const question of questions) {
    if (!content.includes(`"name": "${question}"`) || !content.includes(`<summary>${question}</summary>`)) {
      throw new Error(`${route} FAQ schema or visible FAQ is missing question: ${question}`);
    }
  }

  for (const answer of answers) {
    if (!content.includes(`"text": "${answer}"`) || !content.includes(`<p>${answer}</p>`)) {
      throw new Error(`${route} FAQ schema or visible FAQ is missing answer: ${answer}`);
    }
  }
}

for (const snippet of requiredHomepageSnippets) {
  if (!index.includes(snippet)) {
    throw new Error(`Homepage is missing required LINE/contact snippet: ${snippet}`);
  }
}

for (const snippet of requiredLinePageSnippets) {
  if (!linePage.includes(snippet)) {
    throw new Error(`/line page is missing required snippet: ${snippet}`);
  }
}

for (const snippet of requiredContactPageSnippets) {
  if (!contactPage.includes(snippet)) {
    throw new Error(`/contact page is missing required snippet: ${snippet}`);
  }
}

for (const snippet of requiredTrustCenterSnippets) {
  if (!trustCenterPage.includes(snippet)) {
    throw new Error(`/trust-center page is missing required snippet: ${snippet}`);
  }
}

for (const snippet of requiredProjectsSnippets) {
  if (!projectsPage.includes(snippet)) {
    throw new Error(`/projects page is missing required snippet: ${snippet}`);
  }
}

for (const snippet of requiredQuotePageSnippets) {
  if (!quotePage.includes(snippet)) {
    throw new Error(`/quote page is missing required snippet: ${snippet}`);
  }
}

for (const snippet of requiredRoiPageSnippets) {
  if (!roiPage.includes(snippet)) {
    throw new Error(`/roi-calculator page is missing required snippet: ${snippet}`);
  }
}

for (const snippet of requiredStyleSnippets) {
  if (!styles.includes(snippet)) {
    throw new Error(`styles.css is missing required contact style: ${snippet}`);
  }
}

for (const snippet of requiredAppSnippets) {
  if (!app.includes(snippet)) {
    throw new Error(`app.js is missing required contact behavior: ${snippet}`);
  }
}

for (const snippet of requiredEventSnippets) {
  if (!combinedBuiltSite.includes(snippet)) {
    throw new Error(`Built site is missing required tracking placeholder: ${snippet}`);
  }
}

for (const [route, content] of pagesWithoutLeadCapture) {
  for (const snippet of requiredFloatingContactSnippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${route} is missing required floating contact cluster snippet: ${snippet}`);
    }
  }
}

for (const route of [
  "https://www.sirinx.co/line",
  "https://www.sirinx.co/contact",
  "https://www.sirinx.co/trust-center",
  "https://www.sirinx.co/projects",
  "https://www.sirinx.co/quote",
  "https://www.sirinx.co/roi-calculator"
]) {
  if (!sitemap.includes(route)) {
    throw new Error(`sitemap.xml is missing route: ${route}`);
  }
}

const requiredSpecSnippets = {
  "docs/specs/website-quality/BRD.md": ["Business Objective", "no deploy", "no production mutation"],
  "docs/specs/website-quality/FRD.md": [
    "WQ-FR-002 Contact Route",
    "WQ-FR-007 Trust Center Route",
    "WQ-FR-008 Project Proof Route",
    "WQ-FR-009 Quote Readiness Route",
    "WQ-FR-010 ROI Readiness Route"
  ],
  "docs/specs/website-quality/UI_FLOW.md": ["Homepage Flow", "/contact", "/trust-center", "/projects", "/quote", "/roi-calculator"],
  "docs/specs/website-quality/TEST_CASES.md": [
    "pnpm --filter @sirinx/site test:line",
    "pnpm --filter @sirinx/site test:closed-gates",
    "Negative Closed-Gate Checks",
    "Night Watch",
    "/trust-center",
    "/projects",
    "/quote",
    "/roi-calculator"
  ],
  "docs/specs/website-quality/ROLLBACK_PLAN.md": ["No external rollback is needed", "No deploy occurred"],
  "docs/specs/line-oa-flow/BRD.md": [lineExpected.displayName, lineExpected.shortLink, lineExpected.qrImageUrl],
  "docs/specs/line-oa-flow/FRD.md": ["LINE-FR-001 Central Config", "Tracking Placeholders"],
  "docs/specs/line-oa-flow/UI_FLOW.md": ["Desktop Floating Flow", "Mobile Floating Flow"],
  "docs/specs/line-oa-flow/DATA_CONTRACT.md": [lineExpected.basicId, lineExpected.chatUrl, "defaultMessage"],
  "docs/specs/line-oa-flow/TEST_CASES.md": ["Manual UAT", "No matches"],
  "docs/specs/line-oa-flow/ROLLBACK_PLAN.md": ["No external rollback is needed", "LINE webhook"],
  "docs/specs/quote-roi-crm-readiness/BRD.md": [
    "Quote form architecture notes",
    "LINE webhook activation",
    "CRM/customer data storage"
  ],
  "docs/specs/quote-roi-crm-readiness/FRD.md": [
    "QRC-FR-001 Quote Form Readiness",
    "QRC-FR-002 ROI Calculator Readiness",
    "QRC-FR-003 Lead CRM Handoff Readiness"
  ],
  "docs/specs/quote-roi-crm-readiness/UI_FLOW.md": [
    "Future Quote Flow",
    "Future ROI Flow",
    "Future LINE Automation Flow"
  ],
  "docs/specs/quote-roi-crm-readiness/DATA_CONTRACT.md": [
    "Future Quote Payload",
    "Future ROI Payload",
    "Required Future Gates"
  ],
  "docs/specs/quote-roi-crm-readiness/FUTURE_ARCHITECTURE.md": [
    "Quote Form",
    "LINE Webhook",
    "Project Proof CMS"
  ],
  "docs/specs/quote-roi-crm-readiness/TEST_CASES.md": [
    "Closed-Gate Review",
    "pnpm --filter @sirinx/site test:closed-gates",
    "Negative Closed-Gate Checks",
    "CRM/customer data storage remains blocked",
    "Night Watch"
  ],
  "docs/specs/quote-roi-crm-readiness/ROLLBACK_PLAN.md": [
    "No external rollback is needed",
    "Activate LINE webhook",
    "Run Stagehand UAT"
  ],
  "docs/runbooks/SIRINX_WEBSITE_QUALITY_RUNBOOK.md": ["Safety Boundary", "Stop Conditions"],
  "docs/runbooks/LINE_OFFICIAL_WEBSITE_INTEGRATION_RUNBOOK.md": [lineExpected.shortLink, "Future Approval Gates"],
  "docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md": [
    "Website Bot",
    "Inquiry panel",
    "LINE Integration",
    "Rollback Plan"
  ],
  "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_CHECKLIST_2026-07-03.md": [
    "Human review",
    "Real-device LINE QR scan",
    "Existing bot"
  ],
  "docs/website/SIRINX_WEBSITE_COMPLETION_AUDIT_2026-07-03.md": [
    "Completion status: not complete",
    "Proven by local evidence",
    "Pending manual evidence",
    "No deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md": [
    "pending human input",
    "Real-device LINE QR scan",
    "Existing bot / inquiry path behavior",
    "106 Playwright checks"
  ],
  "docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md": [
    "packet_054",
    "packet_060",
    "packet_061",
    "packet_062",
    "packet_063",
    "packet_065",
    "packet_066",
    "packet_067",
    "packet_072",
    "Master plan current audit",
    "Human review board",
    "GitHub baseline review",
    "Review staging manifest"
  ],
  "docs/website/SIRINX_WEBSITE_LIVE_INDEX_SOURCE_SYNC_2026-07-03.md": [
    "https://www.sirinx.co/",
    "เปลี่ยนที่จอดรถ",
    "106 Playwright checks"
  ],
  "docs/website/SIRINX_WEBSITE_GITHUB_BASELINE_REVIEW_2026-07-03.md": [
    "GitHub baseline",
    "Controlled AI Operations",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_GITHUB_CONNECTOR_RECHECK_2026-07-03.md": [
    "GitHub Connector Recheck",
    "Controlled AI Operations",
    "Do not replace the local",
    "After human review"
  ],
  "docs/website/SIRINX_WEBSITE_GITHUB_CURRENT_RECHECK_2026-07-03.md": [
    "GitHub Repository Evidence",
    "Local branch relationship",
    "not deploy approval",
    "not push approval"
  ],
  "docs/website/SIRINX_WEBSITE_GITHUB_LIVE_LOCAL_AUTOMATED_RECHECK_2026-07-03.md": [
    "GitHub Live Local Automated Recheck",
    "rerunnable local automation",
    "Copy GitHub index to local: no",
    "does not push",
    "does not deploy"
  ],
  "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html": [
    "SIRINX Website Human Review Board",
    "Pending human checks",
    "Manual review steps",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.md": [
    "local-only human review artifact",
    "Pending Manual Checks",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_LINE_QR_LINK_RECHECK_2026-07-03.md": [
    "LINE QR Link Recheck",
    "PNG signature: valid",
    "Acceptable for local review: yes",
    "does not prove the QR was scanned"
  ],
  "docs/website/SIRINX_WEBSITE_LOCAL_REVIEW_RUN_2026-07-03.md": [
    "SIRINX Website Local Review Run",
    "LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT",
    "Local preview command",
    "does not push",
    "does not deploy"
  ],
  "docs/website/SIRINX_WEBSITE_LOCAL_PREVIEW_HEALTH_2026-07-03.md": [
    "SIRINX Website Local Preview Health",
    "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW",
    "ephemeral local port",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_INTAKE_2026-07-03.md": [
    "Manual Review Intake",
    "MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT",
    "Docs fresh: yes",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_GATE_2026-07-03.md": [
    "SIRINX Website Manual Review Gate",
    "BLOCKED_PENDING_HUMAN_REVIEW",
    "Completion claim allowed: no",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_EVIDENCE_CONTRACT_2026-07-03.md": [
    "Manual Review Evidence Contract",
    "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE",
    "machine-checkable",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RECEIPT_2026-07-03.md": [
    "SIRINX Website Manual Review Receipt",
    "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT",
    "Receipt complete: no",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_MASTER_PLAN_CURRENT_AUDIT_2026-07-03.md": [
    "Local Requirements",
    "Pending Human Or Explicit-Gate Requirements",
    "Completion claim allowed: no",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_RELEASE_PREFLIGHT_2026-07-03.md": [
    "SIRINX Website Release Preflight",
    "READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY",
    "Release Blockers",
    "not push approval",
    "not deploy approval"
  ],
  "docs/website/SIRINX_WEBSITE_REVIEW_STAGING_MANIFEST_2026-07-03.md": [
    "Exclude Or Review Carefully Before Any Push",
    "floating-contact.bak.html",
    "Mode: no staging, no commit, no push, no deploy"
  ],
  "docs/website/SIRINX_WEBSITE_REVIEW_EVIDENCE_REFRESH_2026-07-03.md": [
    "Review Evidence Refresh",
    "REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT",
    "one-command local evidence refresh",
    "does not push",
    "does not deploy"
  ],
  "docs/website/SIRINX_SITE_ROI_CALCULATOR_TASK_RECEIPT_2026-07-03.md": [
    "SIRINX Site ROI Calculator Task Receipt",
    "COMPLETE_LOCAL_SAFE_READY_FOR_HUMAN_REVIEW",
    "browser-only ROI estimate",
    "no form submit",
    "not push approval",
    "not deploy approval"
  ]
};

const requiredTestSnippets = {
  "apps/sirinx-site/scripts/capture-review-screenshots.mjs": [
    "local_only_visual_review_evidence",
    "packet_058_sirinx_website_review_screenshot_evidence",
    "crm_customer_data_storage"
  ],
  "apps/sirinx-site/scripts/capture-review-screenshots.test.mjs": [
    "covers all human-review routes",
    "/roi-calculator/",
    "local-only manifest"
  ],
  "apps/sirinx-site/scripts/release-readiness.mjs": [
    "packet_071_sirinx_website_release_preflight",
    "READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY",
    "BLOCKED_FOR_DEPLOY",
    "real_device_qr_scan_missing",
    "manual_review_receipt_incomplete",
    "writeReleasePreflight",
    "crm_customer_data_storage"
  ],
  "apps/sirinx-site/scripts/release-readiness.test.mjs": [
    "reports local evidence ready for human review",
    "BLOCKED_UNTIL_EXPLICIT_APPROVAL",
    "packet_071_sirinx_website_release_preflight",
    "real_device_qr_scan_missing"
  ],
  "apps/sirinx-site/scripts/review-gate-checks.test.mjs": [
    "Completion status: not complete",
    "Do not push or deploy from this manifest alone",
    "crm_customer_data_storage"
  ],
  "apps/sirinx-site/scripts/review-evidence-refresh.mjs": [
    "packet_068_sirinx_website_review_evidence_refresh",
    "local_only_serial_review_evidence_refresh_no_push_no_deploy",
    "writeGithubLiveLocalRecheck",
    "writeLineQrLinkRecheck",
    "writeLocalPreviewHealth",
    "writeManualReviewIntake",
    "writeManualReviewReceipt",
    "writeLocalReviewRun"
  ],
  "apps/sirinx-site/scripts/review-evidence-refresh.test.mjs": [
    "summarizes the refreshed local evidence lane",
    "requires attention",
    "real_device_scan_proven",
    "crm_customer_data_storage"
  ],
  "apps/sirinx-site/scripts/closed-gate-checks.test.mjs": [
    "HTML form submit",
    "MongoDB connection string",
    "allows static LINE links"
  ],
  "apps/sirinx-site/scripts/generate-human-review-board.mjs": [
    "packet_061_sirinx_website_human_review_board",
    "local_only_human_review_board",
    "SCREENSHOT_EVIDENCE_INCOMPLETE",
    "not push approval and not deploy approval"
  ],
  "apps/sirinx-site/scripts/generate-human-review-board.test.mjs": [
    "keeps the board local-only",
    "blocks completion claims",
    "real_device_qr_scan"
  ],
  "apps/sirinx-site/scripts/local-review-run.mjs": [
    "packet_063_sirinx_website_local_review_run",
    "LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT",
    "local_only_review_run_no_server_no_push_no_deploy",
    "does not start a public tunnel"
  ],
  "apps/sirinx-site/scripts/local-review-run.test.mjs": [
    "summarizes the ready-for-review state",
    "manual input is still required",
    "reports attention required"
  ],
  "apps/sirinx-site/scripts/local-preview-health.mjs": [
    "packet_070_sirinx_website_local_preview_health",
    "local_only_ephemeral_preview_health_no_public_tunnel_no_push_no_deploy",
    "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW",
    "id=\"floating-contact-cluster\""
  ],
  "apps/sirinx-site/scripts/local-preview-health.test.mjs": [
    "marks the local preview ready",
    "requires attention",
    "no_public_tunnel_no_push_no_deploy",
    "BLOCKED_FOR_DEPLOY"
  ],
  "apps/sirinx-site/scripts/github-live-local-recheck.mjs": [
    "packet_065_sirinx_website_github_live_local_recheck_automation",
    "github_contents_api",
    "local_only_read_only_github_live_local_recheck_no_push_no_deploy",
    "copy_github_index_to_local"
  ],
  "apps/sirinx-site/scripts/github-live-local-recheck.test.mjs": [
    "keeps the local working copy as the review target",
    "GitHub is older",
    "requires attention",
    "line_webhook"
  ],
  "apps/sirinx-site/scripts/line-qr-link-recheck.mjs": [
    "packet_066_sirinx_website_line_qr_link_recheck",
    "local_only_read_only_line_qr_link_recheck_no_message_send",
    "real_device_scan_proven",
    "LINE webhook: not activated"
  ],
  "apps/sirinx-site/scripts/line-qr-link-recheck.test.mjs": [
    "reads PNG dimensions",
    "real-device scan gate",
    "requires attention",
    "line_webhook"
  ],
  "apps/sirinx-site/scripts/manual-review-intake.mjs": [
    "packet_067_sirinx_website_manual_review_intake",
    "local_only_manual_review_intake_no_push_no_deploy",
    "stale_checklist_matches",
    "MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT"
  ],
  "apps/sirinx-site/scripts/manual-review-evidence-contract.mjs": [
    "packet_069_sirinx_website_manual_review_evidence_contract",
    "local_only_manual_review_evidence_contract_no_push_no_deploy",
    "passed_without_evidence",
    "exact_approval_before_manual_complete"
  ],
  "apps/sirinx-site/scripts/manual-review-evidence-contract.test.mjs": [
    "accepts the current pending template shape",
    "passed manual check has no meaningful evidence",
    "contradictory deploy approval",
    "BLOCKED_FOR_DEPLOY"
  ],
  "apps/sirinx-site/scripts/manual-review-receipt.mjs": [
    "packet_072_sirinx_website_manual_review_receipt",
    "local_only_manual_review_receipt_no_push_no_deploy",
    "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT",
    "receipt_complete"
  ],
  "apps/sirinx-site/scripts/manual-review-receipt.test.mjs": [
    "records the current pending human review state",
    "ready for deploy discussion",
    "requires evidence details",
    "BLOCKED_FOR_DEPLOY"
  ],
  "apps/sirinx-site/scripts/manual-review-intake.test.mjs": [
    "reference current evidence",
    "70 Playwright checks",
    "Confirm primary CTA routes to `/quote`",
    "BLOCKED_FOR_DEPLOY"
  ],
  "apps/sirinx-site/scripts/manual-review-gate.mjs": [
    "packet_062_sirinx_website_manual_review_gate",
    "BLOCKED_PENDING_HUMAN_REVIEW",
    "EXACT_APPROVAL_RECORDED_STILL_NO_DEPLOY_RUN",
    "not push approval and not deploy approval"
  ],
  "apps/sirinx-site/scripts/manual-review-gate.test.mjs": [
    "blocks the current repository template",
    "allows only deploy discussion",
    "records exact deploy approval without running deploy"
  ],
  "apps/sirinx-site/scripts/master-plan-current-audit.mjs": [
    "packet_060_sirinx_website_master_plan_current_audit",
    "LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE",
    "pending_human_or_explicit_gate",
    "completion_claim_allowed"
  ],
  "apps/sirinx-site/scripts/master-plan-current-audit.test.mjs": [
    "without allowing a completion claim",
    "real-device QR",
    "GitHub recheck"
  ],
  "apps/sirinx-site/scripts/server.test.mjs": [
    "does not duplicate the existing homepage floating contact cluster"
  ],
  "apps/sirinx-site/tests/line-integration.spec.ts": [
    "homepage primary CTA follows the live index contact route",
    "mobile contact sheet opens and closes with scannable QR",
    "estimates locally without storage or network submission"
  ],
  "apps/sirinx-site/src/roi-calculator/roi-calculator.guard.test.mjs": [
    "SIRINX ROI calculator guard",
    "forbidden guaranteed-outcome claims",
    "no form, storage, network, or CRM path"
  ]
};

for (const [file, snippets] of Object.entries(requiredSpecSnippets)) {
  const content = specContents.get(file) || "";
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${file} is missing required governance snippet: ${snippet}`);
    }
  }
}

for (const [file, snippets] of Object.entries(requiredTestSnippets)) {
  const content = await readFile(join(repoRoot, file), "utf8");
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${file} is missing required verification snippet: ${snippet}`);
    }
  }
}

console.log(`sirinx-site check passed for ${files.length} files`);
