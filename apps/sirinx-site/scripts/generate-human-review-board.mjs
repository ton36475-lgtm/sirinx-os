import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const packet058Path = "_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json";
const packet060Path = "_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json";
const boardPath = "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html";
const reportPath = "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.md";
const packet061Path = "_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

async function pathExists(path) {
  return Boolean(await stat(path).catch(() => null));
}

function routeLabel(route) {
  if (route === "/") return "Homepage";
  return route.replaceAll("/", "") || "Homepage";
}

function renderBoard({ screenshotManifest, masterAudit, screenshotChecks }) {
  const screenshots = screenshotManifest.screenshots
    .map(
      (screenshot) => `
        <article class="shot">
          <div>
            <p class="eyebrow">${escapeHtml(screenshot.viewport)}</p>
            <h2>${escapeHtml(routeLabel(screenshot.route))}</h2>
            <p>${escapeHtml(screenshot.route)} · ${screenshotChecks[screenshot.path] ? "file found" : "file missing"}</p>
          </div>
          <img src="file://${escapeHtml(screenshot.path)}" alt="SIRINX review screenshot ${escapeHtml(
            screenshot.route
          )} ${escapeHtml(screenshot.viewport)}" loading="lazy" />
        </article>`
    )
    .join("\n");
  const pending = masterAudit.pending_requirements
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.required_evidence)}</span>
        </li>`
    )
    .join("\n");
  const localRequirements = masterAudit.local_requirements
    .map((item) => `<li><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(item.status)}</span></li>`)
    .join("\n");

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SIRINX Website Human Review Board</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #06110f;
        color: #edf8f3;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at 20% 0%, rgba(21, 128, 61, 0.16), transparent 28%),
          linear-gradient(180deg, #071512 0%, #0b1815 44%, #07110f 100%);
      }
      main {
        max-width: 1180px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      header {
        display: grid;
        gap: 16px;
        padding: 32px 0;
      }
      h1,
      h2,
      h3,
      p {
        margin: 0;
      }
      h1 {
        max-width: 920px;
        font-size: clamp(2rem, 5vw, 4rem);
        line-height: 1;
        letter-spacing: 0;
      }
      h2 {
        font-size: 1.15rem;
      }
      .eyebrow,
      .meta {
        color: #8bd8b8;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .lede {
        max-width: 760px;
        color: #c5d9d0;
        font-size: 1.08rem;
        line-height: 1.7;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin: 24px 0 32px;
      }
      .tile,
      .panel,
      .shot {
        background: rgba(15, 23, 42, 0.54);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        backdrop-filter: blur(12px);
      }
      .tile {
        padding: 20px;
      }
      .tile strong {
        display: block;
        margin-top: 8px;
        font-size: 1.4rem;
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 24px;
        margin-bottom: 32px;
      }
      .panel {
        padding: 24px;
      }
      .panel ul {
        display: grid;
        gap: 12px;
        margin: 16px 0 0;
        padding: 0;
        list-style: none;
      }
      .panel li {
        display: grid;
        gap: 4px;
        padding: 12px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .panel span,
      .shot p {
        color: #b9cec5;
        line-height: 1.55;
      }
      .shots {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }
      .shot {
        display: grid;
        gap: 16px;
        overflow: hidden;
        padding: 16px;
      }
      .shot img {
        width: 100%;
        height: auto;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: #0f172a;
      }
      .warning {
        color: #f8d581;
      }
      @media (max-width: 820px) {
        main {
          padding: 32px 16px 48px;
        }
        .summary,
        .grid,
        .shots {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">Local-only review artifact</p>
        <h1>SIRINX Website Human Review Board</h1>
        <p class="lede">
          ใช้บอร์ดนี้สำหรับตรวจภาพหน้าเว็บ, LINE QR, mobile layout, inquiry/bot path และสถานะ gate ก่อนอนุมัติ push หรือ deploy.
          บอร์ดนี้ไม่ใช่ deploy approval และไม่เชื่อม production analytics, webhook หรือ CRM.
        </p>
      </header>

      <section class="summary" aria-label="Review summary">
        <div class="tile"><span class="meta">Screenshots</span><strong>${screenshotManifest.screenshots.length}</strong></div>
        <div class="tile"><span class="meta">Routes</span><strong>${screenshotManifest.routes.length}</strong></div>
        <div class="tile"><span class="meta">Local status</span><strong>${escapeHtml(masterAudit.status)}</strong></div>
        <div class="tile"><span class="meta">Completion claim</span><strong>${masterAudit.completion_claim_allowed ? "Allowed" : "Blocked"}</strong></div>
      </section>

      <section class="grid" aria-label="Review gates">
        <div class="panel">
          <p class="eyebrow">Pending human checks</p>
          <ul>${pending}</ul>
        </div>
        <div class="panel">
          <p class="eyebrow">Local evidence map</p>
          <ul>${localRequirements}</ul>
        </div>
      </section>

      <section class="panel" aria-label="Review instructions">
        <p class="eyebrow">Manual review steps</p>
        <ul>
          <li><strong>1. Visual pass</strong><span>เปิด screenshot desktop/mobile ทุก route แล้วดูความสวย, spacing, CTA, header/footer และเนื้อหา.</span></li>
          <li><strong>2. QR scan</strong><span>สแกน QR จากหน้า /line หรือ contact ด้วยมือถือจริง และยืนยันว่าเปิดบัญชี SIRINX โซล่าเซลล์.</span></li>
          <li><strong>3. Inquiry/bot path</strong><span>เปิด floating contact, LINE panel, inquiry panel และ mobile sheet ใน local preview.</span></li>
          <li><strong>4. Gate decision</strong><span class="warning">อย่า push/deploy จนกว่าจะมี approval แยกชัดเจนหลังตรวจครบ.</span></li>
        </ul>
        <p class="warning">This board is not push approval and not deploy approval.</p>
      </section>

      <section class="shots" aria-label="Screenshots">${screenshots}</section>
    </main>
  </body>
</html>
`;
}

function renderReport({ screenshotManifest, masterAudit, boardPath }) {
  return `# SIRINX Website Human Review Board

Status: local-only human review artifact
Date: 2026-07-03T02:35:00+0700
Board: \`${boardPath}\`

## Purpose

This board packages the latest screenshot evidence and master-plan audit into one local review surface for human approval work.

## Inputs

- Screenshot manifest: \`${screenshotManifest.manifest_path || screenshotManifest.output_dir + "/manifest.json"}\`
- Screenshot count: ${screenshotManifest.screenshots.length}
- Master-plan audit status: \`${masterAudit.status}\`
- Completion claim allowed: \`${masterAudit.completion_claim_allowed}\`

## Pending Manual Checks

${masterAudit.pending_requirements.map((item) => `- ${item.title}: ${item.required_evidence}`).join("\n")}

## Closed Gates

${masterAudit.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

Open the local board in a browser, review all screenshots, scan the LINE QR on a real device, and manually confirm inquiry/bot behavior before any exact push or deploy approval.

This board is not push approval and not deploy approval.
`;
}

export async function collectHumanReviewBoardInputs() {
  const screenshotPacket = await readJson(packet058Path);
  const masterAudit = await readJson(packet060Path);
  const screenshotManifest = JSON.parse(await readFile(screenshotPacket.screenshot_manifest, "utf8"));
  const screenshotChecks = Object.fromEntries(
    await Promise.all(
      screenshotManifest.screenshots.map(async (screenshot) => [screenshot.path, await pathExists(screenshot.path)])
    )
  );

  return {
    screenshotPacket,
    screenshotManifest: {
      ...screenshotManifest,
      manifest_path: screenshotPacket.screenshot_manifest
    },
    masterAudit,
    screenshotChecks
  };
}

export function createHumanReviewBoardPacket({ screenshotManifest, masterAudit, screenshotChecks }) {
  const missingScreenshots = Object.entries(screenshotChecks)
    .filter(([, exists]) => !exists)
    .map(([path]) => path);

  return {
    packet_id: "packet_061_sirinx_website_human_review_board",
    created_at: "2026-07-03T02:35:00+0700",
    status: missingScreenshots.length === 0 ? "READY_FOR_HUMAN_REVIEW" : "SCREENSHOT_EVIDENCE_INCOMPLETE",
    mode: "local_only_human_review_board",
    board: boardPath,
    report: reportPath,
    screenshot_manifest: screenshotManifest.manifest_path,
    screenshot_count: screenshotManifest.screenshots.length,
    missing_screenshots: missingScreenshots,
    master_plan_status: masterAudit.status,
    completion_claim_allowed: masterAudit.completion_claim_allowed,
    pending_requirements: masterAudit.pending_requirements.map((requirement) => requirement.id),
    closed_gates: masterAudit.closed_gates,
    next_safe_action:
      "Open the local review board, scan LINE QR on a real device, and manually confirm existing bot/inquiry behavior before any exact push or deploy approval."
  };
}

export async function writeHumanReviewBoard() {
  const inputs = await collectHumanReviewBoardInputs();
  const packet = createHumanReviewBoardPacket(inputs);
  await mkdir(resolve(repoRoot, dirname(boardPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packet061Path)), { recursive: true });
  await writeFile(resolve(repoRoot, boardPath), renderBoard(inputs), "utf8");
  await writeFile(resolve(repoRoot, reportPath), renderReport({ ...inputs, boardPath }), "utf8");
  await writeFile(resolve(repoRoot, packet061Path), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeHumanReviewBoard();
  console.log(JSON.stringify(packet, null, 2));
}
