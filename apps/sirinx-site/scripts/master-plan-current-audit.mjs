import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");
const reportPath = "docs/website/SIRINX_WEBSITE_MASTER_PLAN_CURRENT_AUDIT_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json";

const closedGates = [
  "deploy",
  "push",
  "line_webhook",
  "production_analytics",
  "crm_customer_data_storage",
  "customer_data_collection",
  "external_message_send",
  "provider_call",
  "paid_provider_call",
  "public_tunnel",
  "package_install",
  "production_mutation",
  "database_write_or_migration",
  "secret_or_env_read"
];

const canonicalLineConfig = {
  displayName: "SIRINX โซล่าเซลล์",
  shortLink: "https://lin.ee/S97R6nj",
  basicId: "@304zrttj",
  premiumIdTarget: "@sirinx",
  qrImageUrl: "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
  addFriendUrl: "https://line.me/R/ti/p/%40304zrttj",
  chatUrl: "https://line.me/R/oaMessage/%40304zrttj",
  defaultMessage: "สวัสดีครับ สนใจให้ SIRINX ประเมินระบบ Solar Carport / Rooftop Solar / BESS / EV Charger เบื้องต้นครับ",
  purpose:
    "ส่งบิลค่าไฟ รูปพื้นที่ ขอประเมิน Solar Carport / Rooftop Solar / BESS / EV Charger และ AI Energy Management"
};

const sourceFiles = {
  lineConfig: "apps/sirinx-site/src/config/lineOfficial.json",
  home: "apps/sirinx-site/src/index.html",
  floatingContact: "apps/sirinx-site/src/_partials/floating-contact.html",
  line: "apps/sirinx-site/src/line/index.html",
  contact: "apps/sirinx-site/src/contact/index.html",
  projects: "apps/sirinx-site/src/projects/index.html",
  trustCenter: "apps/sirinx-site/src/trust-center/index.html",
  quote: "apps/sirinx-site/src/quote/index.html",
  roi: "apps/sirinx-site/src/roi-calculator/index.html",
  app: "apps/sirinx-site/src/app.js",
  qualityAudit: "docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md",
  localEvidence: "docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md",
  releasePacket: "_A2A_QUEUE/outbox/packet_057_sirinx_website_release_readiness_dry_run_receipt.json",
  screenshotPacket: "_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json",
  githubPacket: "_A2A_QUEUE/outbox/packet_059_sirinx_website_github_current_recheck.json",
  githubLiveLocalPacket: "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
  lineQrLinkPacket: "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
  manualReviewIntakePacket: "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
  manualReviewEvidenceContractPacket: "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
  localPreviewHealthPacket: "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
  manualReviewReceiptPacket: "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"
};

const specFiles = [
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
  "docs/runbooks/LINE_OFFICIAL_WEBSITE_INTEGRATION_RUNBOOK.md"
];

async function readRepoFile(path) {
  return readFile(resolve(repoRoot, path), "utf8");
}

async function fileExists(path) {
  return Boolean(await stat(resolve(repoRoot, path)).catch(() => null));
}

function includesAll(content, snippets) {
  return snippets.every((snippet) => content.includes(snippet));
}

function createRequirement(id, title, evidence, isSatisfied) {
  return {
    id,
    title,
    status: isSatisfied ? "proven_locally" : "missing_or_weak",
    evidence
  };
}

function createPendingRequirement(id, title, requiredEvidence) {
  return {
    id,
    title,
    status: "pending_human_or_explicit_gate",
    required_evidence: requiredEvidence
  };
}

export async function collectMasterPlanCurrentAudit() {
  const entries = Object.fromEntries(
    await Promise.all(Object.entries(sourceFiles).map(async ([key, path]) => [key, await readRepoFile(path)]))
  );
  const lineConfig = JSON.parse(entries.lineConfig);
  const releasePacket = JSON.parse(entries.releasePacket);
  const screenshotPacket = JSON.parse(entries.screenshotPacket);
  const githubPacket = JSON.parse(entries.githubPacket);
  const githubLiveLocalPacket = JSON.parse(entries.githubLiveLocalPacket);
  const lineQrLinkPacket = JSON.parse(entries.lineQrLinkPacket);
  const manualReviewIntakePacket = JSON.parse(entries.manualReviewIntakePacket);
  const manualReviewEvidenceContractPacket = JSON.parse(entries.manualReviewEvidenceContractPacket);
  const localPreviewHealthPacket = JSON.parse(entries.localPreviewHealthPacket);
  const manualReviewReceiptPacket = JSON.parse(entries.manualReviewReceiptPacket);
  const allSpecsExist = (await Promise.all(specFiles.map(fileExists))).every(Boolean);
  const allLineFieldsMatch = Object.entries(canonicalLineConfig).every(([key, value]) => lineConfig[key] === value);
  const routeContents = [entries.line, entries.contact, entries.projects, entries.trustCenter, entries.quote, entries.roi];
  const combinedSite = [
    entries.home,
    entries.floatingContact,
    entries.line,
    entries.contact,
    entries.projects,
    entries.trustCenter,
    entries.quote,
    entries.roi,
    entries.app
  ].join("\n");

  const localRequirements = [
    createRequirement(
      "phase_0_read_only_audit",
      "Read-only website audit exists before implementation claims",
      ["docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md"],
      includesAll(entries.qualityAudit, [
        "Current Architecture",
        "Page Inventory",
        "Component Inventory",
        "Existing Bot",
        "Rollback Plan"
      ])
    ),
    createRequirement(
      "phase_1_quality_upgrade",
      "Website quality upgrade is represented by local source and route evidence",
      ["apps/sirinx-site/src/index.html", "apps/sirinx-site/src/styles.css"],
      includesAll(entries.home, ["เปลี่ยนที่จอดรถ", "ขอใบเสนอราคา Solar Carport", "href=\"/projects\""]) &&
        includesAll(entries.localEvidence, ["Theme Correction After Human Review", "106 Playwright checks"])
    ),
    createRequirement(
      "phase_2_central_line_config",
      "Canonical LINE Official configuration is centralized and matches approved data",
      ["apps/sirinx-site/src/config/lineOfficial.json"],
      allLineFieldsMatch
    ),
    createRequirement(
      "phase_3_floating_contact_cluster",
      "Floating LINE contact group coexists with the existing inquiry/contact path",
      ["apps/sirinx-site/src/_partials/floating-contact.html", "apps/sirinx-site/src/components/floating-contact.js"],
      includesAll(entries.floatingContact, [
        "floating-contact-cluster",
        "คุยกับบอท / แอด LINE Official",
        "line-panel",
        "inquiry-panel",
        "mobile-panel",
        "https://lin.ee/S97R6nj",
        "https://line.me/R/oaMessage/%40304zrttj"
      ])
    ),
    createRequirement(
      "phase_4_line_page",
      "/line page exists with QR, quick actions, trust links, FAQ, and CTAs",
      ["apps/sirinx-site/src/line/index.html"],
      includesAll(entries.line, [
        "ติดต่อ SIRINX ผ่าน LINE Official",
        "QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX",
        "ส่งบิลค่าไฟ",
        "ประเมิน Solar Carport สำหรับองค์กร",
        "ต้องเตรียมข้อมูลอะไรบ้าง",
        "เพิ่มเพื่อนใน LINE"
      ])
    ),
    createRequirement(
      "phase_5_line_cta_distribution",
      "LINE CTA appears across homepage, footer, contact, quote, trust, project, and ROI surfaces",
      [
        "apps/sirinx-site/src/index.html",
        "apps/sirinx-site/src/contact/index.html",
        "apps/sirinx-site/src/projects/index.html",
        "apps/sirinx-site/src/trust-center/index.html",
        "apps/sirinx-site/src/quote/index.html",
        "apps/sirinx-site/src/roi-calculator/index.html"
      ],
      routeContents.every((content) => content.includes("https://lin.ee/S97R6nj")) &&
        entries.home.includes("href=\"/line\"") &&
        combinedSite.includes("LINE Official")
    ),
    createRequirement(
      "phase_6_existing_bot_preservation",
      "Existing website inquiry/contact behavior remains represented beside LINE contact",
      ["apps/sirinx-site/src/_partials/floating-contact.html", "apps/sirinx-site/tests/line-integration.spec.ts"],
      includesAll(entries.floatingContact, ["inquiry-trigger", "Website Inquiry Panel", "ขอ Solar Carport", "สแกน QR LINE"])
    ),
    createRequirement(
      "phase_7_tracking_placeholders",
      "Analytics event placeholders exist without production analytics wiring",
      ["apps/sirinx-site/src/_partials/floating-contact.html", "apps/sirinx-site/src/index.html"],
      includesAll(combinedSite, ["line_add_friend_click", "line_chat_click", "line_shortlink_click", "quote_cta_click"]) &&
        entries.localEvidence.includes("Production analytics")
    ),
    createRequirement(
      "phase_8_seo_aeo_trust",
      "SEO/AEO metadata, schema, and trust routes are guarded without fake claims",
      ["apps/sirinx-site/tests/line-integration.spec.ts", "docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md"],
      includesAll(entries.localEvidence, [
        "SEO/AEO metadata",
        "FAQPage",
        "BreadcrumbList",
        "Avoided fabricated project results",
        "No guaranteed savings claims"
      ])
    ),
    createRequirement(
      "phase_9_spec_packs",
      "Website, LINE OA, quote, ROI, CRM readiness specs and runbooks exist",
      specFiles,
      allSpecsExist
    ),
    createRequirement(
      "phase_10_implementation_order_evidence",
      "Implementation evidence follows audit, specs, config, components, routes, CTAs, events, accessibility, metadata, verification",
      ["docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md"],
      includesAll(entries.localEvidence, [
        "Website audit",
        "Website quality specs",
        "LINE OA specs",
        "LINE Official Canonical Data",
        "Verified Locally"
      ])
    ),
    createRequirement(
      "phase_11_component_equivalents",
      "Static-site component equivalents exist for LINE card, QR panel, floating contact, dock, mobile sheet, and CTA",
      [
        "apps/sirinx-site/src/_partials/floating-contact.html",
        "apps/sirinx-site/src/components/floating-contact.css",
        "apps/sirinx-site/src/components/floating-contact.js",
        "apps/sirinx-site/src/line/index.html"
      ],
      includesAll(entries.floatingContact, ["line-panel", "mobile-panel", "panel-button", "sheet-button"]) &&
        includesAll(entries.line, ["line-card", "qr-large", "primary-action", "secondary-action"])
    ),
    createRequirement(
      "phase_12_local_acceptance_tests",
      "Local acceptance checks cover build, check, LINE UAT, closed gates, server, review gates, release readiness, and screenshots",
      ["docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md", "_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json"],
      includesAll(entries.localEvidence, [
        "pnpm --filter @sirinx/site build",
        "pnpm --filter @sirinx/site check",
        "pnpm --filter @sirinx/site test:line",
        "pnpm --filter @sirinx/site test:closed-gates",
        "pnpm --filter @sirinx/site test:review-gates",
        "pnpm --filter @sirinx/site test:release-readiness",
        "pnpm --filter @sirinx/site review:screenshots"
      ]) && screenshotPacket.screenshot_count === 14
    ),
    createRequirement(
      "phase_13_future_ready_closed_gates",
      "Quote form, ROI, CRM, LINE webhook, and automation are prepared as docs/readiness only",
      [
        "docs/specs/quote-roi-crm-readiness/FUTURE_ARCHITECTURE.md",
        "apps/sirinx-site/src/quote/index.html",
        "apps/sirinx-site/src/roi-calculator/index.html"
      ],
      includesAll(entries.quote, ["data-crm-handoff-readiness", "data-gate-state=\"closed\""]) &&
        includesAll(entries.roi, ["data-readiness-checklist", "ROI"]) &&
        entries.localEvidence.includes("No guaranteed savings claims were added")
    ),
    createRequirement(
      "phase_14_verification_commands",
      "Safe verification commands are recorded and current gate scripts keep deploy/push blocked",
      ["apps/sirinx-site/scripts/release-readiness.mjs", "_A2A_QUEUE/outbox/packet_057_sirinx_website_release_readiness_dry_run_receipt.json"],
      releasePacket.expected_readiness?.status === "READY_FOR_HUMAN_REVIEW" &&
        releasePacket.expected_readiness?.deploy_gate === "BLOCKED_FOR_DEPLOY" &&
        releasePacket.expected_readiness?.push_gate === "BLOCKED_UNTIL_EXPLICIT_APPROVAL"
    ),
    createRequirement(
      "github_current_recheck",
      "GitHub current recheck proves no PR, no push, and local branch still ahead",
      ["_A2A_QUEUE/outbox/packet_059_sirinx_website_github_current_recheck.json"],
      githubPacket.status === "verified_locally_read_only" &&
        githubPacket.repository.open_pull_requests_returned === 0 &&
        githubPacket.branch_evidence.push_performed === false &&
        githubPacket.branch_evidence.deploy_performed === false
    ),
    createRequirement(
      "github_live_local_automated_recheck",
      "Automated GitHub/live/local source comparison keeps the local Solar/LINE work as the review target",
      ["_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json"],
      githubLiveLocalPacket.status === "GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED" &&
        githubLiveLocalPacket.decision.copy_github_index_to_local === false &&
        githubLiveLocalPacket.decision.deploy_gate === "BLOCKED_FOR_DEPLOY" &&
        githubLiveLocalPacket.decision.push_gate === "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL"
    ),
    createRequirement(
      "line_qr_link_asset_recheck",
      "LINE QR image and public LINE links pass read-only asset/link checks while real-device scan remains pending",
      ["_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json"],
      lineQrLinkPacket.status === "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN" &&
        lineQrLinkPacket.qr_asset?.acceptable_for_local_review === true &&
        lineQrLinkPacket.decision?.real_device_scan_proven === false &&
        lineQrLinkPacket.decision?.deploy_gate === "BLOCKED_FOR_DEPLOY"
    ),
    createRequirement(
      "manual_review_intake_readiness",
      "Manual review checklist and result template are current with latest automated evidence and ready for human input",
      ["_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json"],
      manualReviewIntakePacket.status === "MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT" &&
        manualReviewIntakePacket.docs_fresh === true &&
        manualReviewIntakePacket.stale_checklist_matches?.length === 0 &&
        manualReviewIntakePacket.deploy_gate === "BLOCKED_FOR_DEPLOY"
    ),
    createRequirement(
      "manual_review_evidence_contract",
      "Manual review result evidence is machine-checkable before deploy or push discussion",
      ["_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json"],
      manualReviewEvidenceContractPacket.status === "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE" &&
        manualReviewEvidenceContractPacket.required_checks_count === 17 &&
        manualReviewEvidenceContractPacket.manual_checks_total === 17 &&
        manualReviewEvidenceContractPacket.human_evidence_complete === false &&
        manualReviewEvidenceContractPacket.completion_claim_allowed === false &&
        manualReviewEvidenceContractPacket.deploy_gate === "BLOCKED_FOR_DEPLOY"
    ),
    createRequirement(
      "local_preview_health_readiness",
      "Local preview can serve every human-review route on localhost without public tunnel",
      ["_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json"],
      localPreviewHealthPacket.status === "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW" &&
        localPreviewHealthPacket.local_only_base_url === true &&
        localPreviewHealthPacket.routes_ready === true &&
        localPreviewHealthPacket.route_count === 7 &&
        localPreviewHealthPacket.completion_claim_allowed === false &&
        localPreviewHealthPacket.deploy_gate === "BLOCKED_FOR_DEPLOY"
    ),
    createRequirement(
      "manual_review_receipt_readiness",
      "Manual review receipt records human-review, QR, bot, and deploy approval status without allowing completion",
      ["_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"],
      manualReviewReceiptPacket.status === "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT" &&
        manualReviewReceiptPacket.manual_checks_total === 17 &&
        manualReviewReceiptPacket.manual_checks_pending?.length === 17 &&
        manualReviewReceiptPacket.receipt_complete === false &&
        manualReviewReceiptPacket.qr_scan?.status === "pending" &&
        manualReviewReceiptPacket.existing_bot?.behavior_status === "pending" &&
        manualReviewReceiptPacket.completion_claim_allowed === false &&
        manualReviewReceiptPacket.deploy_gate === "BLOCKED_FOR_DEPLOY"
    )
  ];

  const pendingRequirements = [
    createPendingRequirement("manual_visual_acceptance", "Human visual acceptance after rejected design direction", "Human review of local preview and screenshot set"),
    createPendingRequirement("real_device_qr_scan", "LINE QR is scannable on a real device", "Real phone scan confirming the QR opens the SIRINX LINE Official account"),
    createPendingRequirement("existing_bot_manual_behavior", "Existing bot/inquiry behavior is preserved exactly", "Manual browser check of the website inquiry path and expected bot behavior"),
    createPendingRequirement("mobile_spacing_real_review", "Mobile overlap and spacing are acceptable on a real device or trusted viewport", "Human mobile review evidence"),
    createPendingRequirement("explicit_push_deploy_gate", "Push or deploy can proceed only after a separate exact approval", "Fresh explicit approval naming target, branch, and deploy action")
  ];
  const missingLocalRequirements = localRequirements.filter((requirement) => requirement.status !== "proven_locally");

  return {
    packet_id: "packet_060_sirinx_website_master_plan_current_audit",
    created_at: "2026-07-03T02:20:00+0700",
    status:
      missingLocalRequirements.length > 0
        ? "LOCAL_EVIDENCE_INCOMPLETE"
        : "LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE",
    mode: "local_only_master_plan_completion_audit",
    scope: "apps/sirinx-site",
    local_requirements: localRequirements,
    missing_local_requirements: missingLocalRequirements.map((requirement) => requirement.id),
    pending_requirements: pendingRequirements,
    completion_claim_allowed: false,
    deploy_approval: "not_granted",
    push_approval: "not_granted",
    closed_gates: closedGates,
    report: reportPath,
    source_packets: [
      "_A2A_QUEUE/outbox/packet_057_sirinx_website_release_readiness_dry_run_receipt.json",
      "_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json",
      "_A2A_QUEUE/outbox/packet_059_sirinx_website_github_current_recheck.json",
      "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
      "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
      "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
      "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
      "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
      "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"
    ],
    next_safe_action:
      "Human review the local website and screenshot evidence, scan the LINE QR on a real device, and manually confirm existing bot/inquiry behavior before any exact push or deploy approval."
  };
}

function renderMarkdown(audit) {
  const localRows = audit.local_requirements
    .map((requirement) => `| ${requirement.id} | ${requirement.title} | ${requirement.status} |`)
    .join("\n");
  const pendingRows = audit.pending_requirements
    .map((requirement) => `| ${requirement.id} | ${requirement.title} | ${requirement.required_evidence} |`)
    .join("\n");

  return `# SIRINX Website Master Plan Current Audit

Status: ${audit.status}
Date: ${audit.created_at}
Scope: \`${audit.scope}\`
Mode: ${audit.mode}
Completion claim allowed: ${audit.completion_claim_allowed ? "yes" : "no"}
Deploy approval: ${audit.deploy_approval}
Push approval: ${audit.push_approval}

## Purpose

This packet maps the website-first master plan to current local evidence. It separates local implementation evidence from human/manual gates so the website lane cannot be over-claimed as complete before real review.

## Local Requirements

| Requirement ID | Requirement | Status |
| --- | --- | --- |
${localRows}

## Pending Human Or Explicit-Gate Requirements

| Requirement ID | Requirement | Required evidence |
| --- | --- | --- |
${pendingRows}

## Closed Gates

${audit.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Source Packets

${audit.source_packets.map((packet) => `- \`${packet}\``).join("\n")}

## Finding

Local evidence is ready for human review, but the master objective is not complete because manual visual acceptance, real-device LINE QR scan, existing bot/inquiry behavior confirmation, mobile spacing review, and explicit push/deploy approval remain pending.

## Next Safe Action

${audit.next_safe_action}

This audit is not push approval and not deploy approval.
`;
}

export async function writeMasterPlanCurrentAudit() {
  const audit = await collectMasterPlanCurrentAudit();
  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderMarkdown(audit));
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(audit, null, 2)}\n`);
  return audit;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const shouldWrite = process.argv.includes("--write");
  const audit = shouldWrite ? await writeMasterPlanCurrentAudit() : await collectMasterPlanCurrentAudit();
  console.log(JSON.stringify(audit, null, 2));
}
