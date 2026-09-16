import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoClosedGateViolations } from "./closed-gate-checks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");
const distRoot = resolve(siteRoot, "dist");

const reportPath = "docs/website/SIRINX_SITE_PUBLIC_GUARDIAN_2026-07-03.md";
const evidencePath = ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P042-SIRINX-SITE-PUBLIC-GUARDIAN-20260703.json";

export const lineExpected = {
  displayName: "SIRINX โซล่าเซลล์",
  shortLink: "https://lin.ee/S97R6nj",
  basicId: "@304zrttj",
  premiumIdTarget: "@sirinx",
  qrImageUrl: "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
  addFriendUrl: "https://line.me/R/ti/p/%40304zrttj",
  chatUrl: "https://line.me/R/oaMessage/%40304zrttj"
};

const routeRequirements = {
  home: {
    label: "/",
    snippets: [
      'href="/quote"',
      'href="/line"',
      'href="/contact"',
      "พร้อมประเมินช่วงลดค่าไฟและเงื่อนไขคืนทุนจากข้อมูลไซต์จริง"
    ]
  },
  quote: {
    label: "/quote",
    snippets: [
      "data-readiness-checklist",
      'data-gate-state="closed"',
      "ไม่มีการส่งข้อมูล ไม่มีการบันทึกลงเบราว์เซอร์",
      "ไม่ใช่ quote form และไม่บันทึกข้อมูลลูกค้า",
      "เพิ่มเพื่อน LINE Official"
    ]
  },
  line: {
    label: "/line",
    snippets: [
      lineExpected.qrImageUrl,
      lineExpected.shortLink,
      lineExpected.addFriendUrl,
      lineExpected.chatUrl,
      lineExpected.basicId,
      "data-qr-image"
    ]
  },
  contact: {
    label: "/contact",
    snippets: [
      lineExpected.qrImageUrl,
      lineExpected.shortLink,
      lineExpected.chatUrl,
      "mailto:contact@sirinx.co",
      "data-qr-image"
    ]
  }
};

const darkSurfaceSnippets = [
  "body:not(.production-home)",
  ".line-main-card",
  ".contact-route-card",
  ".proof-stage-card",
  ".assurance-card",
  "background: #0a1628",
  "background: rgba(15, 23, 42, 0.68)",
  "border: 1px solid rgba(148, 163, 184, 0.18)",
  "box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22)"
];

export const forbiddenOutcomeClaimPatterns = [
  { label: "unsupported fixed savings range", pattern: /ลดค่าไฟ\s*30\s*-\s*100\s*%/i },
  { label: "unsupported fixed payback range", pattern: /คืนทุน\s*3\s*-\s*5\s*ปี/i },
  { label: "guaranteed income claim", pattern: /รายได้การันตี/i },
  { label: "guaranteed return claim", pattern: /ผลตอบแทนการันตี/i },
  { label: "guaranteed savings claim", pattern: /ประหยัดแน่นอน/i },
  { label: "guaranteed payback claim", pattern: /คืนทุนแน่นอน/i }
];

function check(name, passed, evidence = {}) {
  return { name, passed, ...evidence };
}

function includesAll(content, snippets) {
  const missing = snippets.filter((snippet) => !content.includes(snippet));
  return { passed: missing.length === 0, missing };
}

function collectForbiddenClaims(routes) {
  return Object.entries(routes).flatMap(([route, content]) =>
    forbiddenOutcomeClaimPatterns
      .filter(({ pattern }) => pattern.test(content))
      .map(({ label }) => ({ route, label }))
  );
}

export function evaluatePublicGuardian({ routes, styles, lineConfig }) {
  const routeChecks = Object.entries(routeRequirements).map(([route, requirement]) => {
    const result = includesAll(routes[route] || "", requirement.snippets);
    return check(`route:${requirement.label}`, result.passed, { missing: result.missing });
  });

  const missingLineFields = Object.entries(lineExpected)
    .filter(([key, value]) => lineConfig?.[key] !== value)
    .map(([key]) => key);
  const lineConfigCheck = check("line:config_exact_match", missingLineFields.length === 0, {
    missing_fields: missingLineFields
  });

  const styleResult = includesAll(styles || "", darkSurfaceSnippets);
  const darkSurfaceCheck = check("style:dark_surface_cards", styleResult.passed, {
    missing: styleResult.missing
  });

  const forbiddenClaims = collectForbiddenClaims(routes);
  const claimCheck = check("claims:no_fake_or_guaranteed_outcome_claims", forbiddenClaims.length === 0, {
    forbidden_claims: forbiddenClaims
  });

  let closedGateCheck = check("closed_gates:no_forms_api_or_runtime_network", true);
  try {
    assertNoClosedGateViolations({
      pages: new Map([
        ["/", routes.home || ""],
        ["/quote", routes.quote || ""],
        ["/line", routes.line || ""],
        ["/contact", routes.contact || ""]
      ]),
      scripts: new Map()
    });
  } catch (error) {
    closedGateCheck = check("closed_gates:no_forms_api_or_runtime_network", false, {
      error: error.message
    });
  }

  const checks = [...routeChecks, lineConfigCheck, darkSurfaceCheck, claimCheck, closedGateCheck];
  const passed = checks.every((item) => item.passed);

  return {
    packet_id: "A2A2A-P042-SIRINX-SITE-PUBLIC-GUARDIAN-20260703",
    status: passed ? "PASS" : "FAIL",
    scope: "apps/sirinx-site public routes /quote, /line, /contact",
    completion_claim_allowed: false,
    deploy_gate: "BLOCKED",
    push_gate: "BLOCKED",
    line_gateway_send: "not_run",
    cloud_mutation: "not_run",
    external_link_network_check: "not_run_by_this_static_guard",
    real_device_qr_scan_proven: false,
    checks,
    next_safe_action: passed
      ? "Run build, check, focused tests, and browser smoke before marking the queue task local_validated."
      : "Fix failing public-guardian checks and rerun."
  };
}

async function readBuiltInputs() {
  return {
    routes: {
      home: await readFile(resolve(distRoot, "index.html"), "utf8"),
      quote: await readFile(resolve(distRoot, "quote", "index.html"), "utf8"),
      line: await readFile(resolve(distRoot, "line", "index.html"), "utf8"),
      contact: await readFile(resolve(distRoot, "contact", "index.html"), "utf8")
    },
    styles: await readFile(resolve(distRoot, "styles.css"), "utf8"),
    lineConfig: JSON.parse(await readFile(resolve(distRoot, "config", "lineOfficial.json"), "utf8"))
  };
}

function renderReport(packet) {
  const rows = packet.checks
    .map((item) => `| ${item.name} | ${item.passed ? "PASS" : "FAIL"} | ${JSON.stringify(item.missing || item.forbidden_claims || item.error || [])} |`)
    .join("\n");

  return `# SIRINX Site Public Guardian

Status: ${packet.status}
Scope: ${packet.scope}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}
Deploy gate: ${packet.deploy_gate}
Push gate: ${packet.push_gate}

## Checks

| Check | Result | Detail |
| --- | --- | --- |
${rows}

## Boundaries

- LINE gateway send: ${packet.line_gateway_send}
- Cloud mutation: ${packet.cloud_mutation}
- External link network check: ${packet.external_link_network_check}
- Real-device QR scan proven: ${packet.real_device_qr_scan_proven}

## Next Safe Action

${packet.next_safe_action}
`;
}

export async function writePublicGuardianEvidence() {
  const packet = {
    ...(evaluatePublicGuardian(await readBuiltInputs())),
    created_at: new Date().toISOString(),
    report_path: reportPath,
    evidence_path: evidencePath
  };

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(evidencePath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, evidencePath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const shouldWrite = process.argv.includes("--write");
  const packet = shouldWrite ? await writePublicGuardianEvidence() : evaluatePublicGuardian(await readBuiltInputs());
  console.log(JSON.stringify(packet, null, 2));
  if (packet.status !== "PASS") {
    process.exitCode = 1;
  }
}
