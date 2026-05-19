const auditRoot = "/Users/sirinx/restore-sources/github-audit";

const repositories = [
  {
    name: "sirinx",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/sirinx`,
    head: "41dced7",
    status: "source-of-truth-mirror",
    lane: "public-website",
    priority: "P0",
    fileCount: 547,
    capabilities: ["public-site", "solar", "lead", "seo", "bess", "ev", "drizzle", "agent-governance"],
    integrationTarget: "Keep as public website source mirror; live source remains /Users/sirinx/restore-sources/ton36475-lgtm-sirinx.",
    nextAction: "Use for public website diffs only; do not overwrite current live repo without review.",
    blockers: ["Public website is protected; all deploys require explicit approval."]
  },
  {
    name: "sirinx-solar-energy",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/sirinx-solar-energy`,
    head: "d3ea5dc",
    status: "candidate-review",
    lane: "solar-ops",
    priority: "P1",
    fileCount: 424,
    capabilities: ["solar", "customer-app", "contractor-app", "cloudflare-workers", "seo", "telegram", "supabase", "agent-warroom"],
    integrationTarget: "Extract admin/customer/contractor workflow ideas, SEO worker patterns, and Supabase schema concepts into Command Center plans.",
    nextAction: "Review app boundaries and Cloudflare worker code locally before selecting one subdomain candidate.",
    blockers: ["Contains future/experimental directories and Cloudflare deploy scripts; keep read-only until scoped."]
  },
  {
    name: "oz-corp-omega-dual-node",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/oz-corp-omega-dual-node`,
    head: "e8dfa8c",
    status: "quarantine-reference",
    lane: "agent-runtime",
    priority: "P1",
    fileCount: 8277,
    capabilities: ["agent-team", "line", "telegram", "seo", "supabase", "openclaw", "hermes-warroom", "solar-dashboard"],
    integrationTarget: "Use as a reference library for agent orchestration, LINE/Telegram flows, Supabase hooks, and solar dashboard concepts.",
    nextAction: "Create bounded extraction tasks per module; never bulk-copy because scope and file count are high.",
    blockers: ["Large experimental repo; must pass secret/file audit and module ownership review before code reuse."]
  },
  {
    name: "automated-marketing-agency",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/automated-marketing-agency`,
    head: "50d3054",
    status: "candidate-review",
    lane: "marketing-automation",
    priority: "P2",
    fileCount: 152,
    capabilities: ["multi-agent-marketing", "campaigns", "crm", "webhooks", "lead", "seo", "drizzle"],
    integrationTarget: "Extract campaign/CRM/webhook models for SIRINX marketing lane after lead backend stabilizes.",
    nextAction: "Map campaign schema to SIRINX lead/customer/site entities.",
    blockers: ["Must remove generic agency assumptions and verify webhook safety."]
  },
  {
    name: "chokma-growth-os",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/chokma-growth-os`,
    head: "b42e11c",
    status: "candidate-review",
    lane: "growth-crm",
    priority: "P2",
    fileCount: 130,
    capabilities: ["lead", "crm", "line", "telegram", "dashboard", "drizzle"],
    integrationTarget: "Extract acquisition and CRM patterns for lead funnel governance.",
    nextAction: "Compare lead schema with current SIRINX lead intake schema.",
    blockers: ["Brand/domain assumptions are not SIRINX-specific."]
  },
  {
    name: "automation-dashboard",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/automation-dashboard`,
    head: "cedaf00",
    status: "reference-only",
    lane: "dashboard-patterns",
    priority: "P3",
    fileCount: 19,
    capabilities: ["next-dashboard", "tailwind"],
    integrationTarget: "Use only for UI pattern reference if Command Center needs a future Next.js surface.",
    nextAction: "No immediate extraction; current Command Center already has local dashboard.",
    blockers: ["Small separate app; avoid duplicating dashboard stack."]
  },
  {
    name: "automation-documentation",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/automation-documentation`,
    head: "8af073a",
    status: "documentation-reference",
    lane: "documentation",
    priority: "P3",
    fileCount: 6,
    capabilities: ["automation-docs", "dashboard-docs", "webhook-docs"],
    integrationTarget: "Review for reusable SOP wording only.",
    nextAction: "Fold useful non-duplicative docs into Obsidian summaries.",
    blockers: ["No runtime code."]
  },
  {
    name: "automation-system-backend",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/automation-system-backend`,
    head: "2e3dae7",
    status: "reference-only",
    lane: "backend-patterns",
    priority: "P3",
    fileCount: 10,
    capabilities: ["docker-compose", "backend-docs", "webhooks"],
    integrationTarget: "Reference backend deployment notes only.",
    nextAction: "No runtime merge until SIRINX backend contract needs it.",
    blockers: ["Sparse repo; unclear production maturity."]
  },
  {
    name: "automation-mobile-app",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/automation-mobile-app`,
    head: "cd2eecb",
    status: "blocked-sensitive-file",
    lane: "mobile",
    priority: "P3",
    fileCount: 113,
    capabilities: ["expo", "react-native", "drizzle", "firebase", "mobile-ui"],
    integrationTarget: "Reference mobile QR/app setup ideas only after sensitive file policy review.",
    nextAction: "Do not copy mobile signing material; inspect architecture docs only.",
    blockers: ["Repository contains android-release.keystore filename; do not read or copy."]
  },
  {
    name: "ghost-claw-os",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/ghost-claw-os`,
    head: "35d19f2e",
    status: "blocked-sensitive-file",
    lane: "creative-factory",
    priority: "P3",
    fileCount: 120,
    capabilities: ["expo", "queue-worker-design", "story-engine", "asset-memory", "review-release-watch"],
    integrationTarget: "Extract docs for Creative Factory/asset memory planning only.",
    nextAction: "Review markdown docs; do not import keystore or mobile build assets.",
    blockers: ["Repository contains android-release.keystore filename and node_modules in working tree."]
  },
  {
    name: "oz_mobile_app",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/oz_mobile_app`,
    head: "cb43ce4",
    status: "reference-only",
    lane: "mobile-agent-ui",
    priority: "P3",
    fileCount: 143,
    capabilities: ["expo", "react-native", "terminal", "cloudflare-tunnel", "backend-worker"],
    integrationTarget: "Reference mobile agent UI and terminal ideas after Codex Mobile pairing stabilizes.",
    nextAction: "Keep as design reference; no production dependency.",
    blockers: ["Mobile runtime not part of current SIRINX OS release gates."]
  },
  {
    name: "sirinx-co",
    owner: "ton36475-lgtm",
    localPath: `${auditRoot}/sirinx-co`,
    head: "046ad37",
    status: "archive",
    lane: "legacy-public-site",
    priority: "P4",
    fileCount: 1,
    capabilities: ["legacy-static-public"],
    integrationTarget: "Archive only; current public site is the restored solar site.",
    nextAction: "Do not use as public homepage source.",
    blockers: ["Superseded by ton36475-lgtm/sirinx."]
  }
];

function summarize(items) {
  const laneCounts = new Map();
  const blocked = items.filter((item) => item.status.startsWith("blocked"));
  for (const item of items) {
    laneCounts.set(item.lane, (laneCounts.get(item.lane) || 0) + 1);
  }
  return {
    repositories: items.length,
    lanes: laneCounts.size,
    p0: items.filter((item) => item.priority === "P0").length,
    p1: items.filter((item) => item.priority === "P1").length,
    p2: items.filter((item) => item.priority === "P2").length,
    p3: items.filter((item) => item.priority === "P3").length,
    blocked: blocked.length,
    externalWrites: false
  };
}

export function getGithubIntegrationInventory() {
  return {
    title: "SIRINX GitHub repository integration inventory",
    mode: "read-only-audit-clones",
    auditRoot,
    status: "inventory-ready",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    summary: summarize(repositories),
    repositories,
    lanes: [
      {
        id: "public-website",
        priority: "P0",
        target: "www.sirinx.co",
        rule: "Protected source; no homepage replacement."
      },
      {
        id: "solar-ops",
        priority: "P1",
        target: "Command Center/Solar Intelligence",
        rule: "Extract workflows only after schema and route review."
      },
      {
        id: "agent-runtime",
        priority: "P1",
        target: "Hermes/agent orchestration",
        rule: "Quarantine large experimental repo; bounded extraction only."
      },
      {
        id: "marketing-automation",
        priority: "P2",
        target: "Lead and campaign operations",
        rule: "Map to SIRINX entities before import."
      },
      {
        id: "mobile",
        priority: "P3",
        target: "Mobile companion research",
        rule: "Signing material and credentials stay blocked."
      }
    ],
    nextActions: [
      "Create bounded extraction tasks for sirinx-solar-energy admin/customer/contractor workflows.",
      "Create bounded extraction tasks for oz-corp-omega-dual-node agent routing, LINE/Telegram, and SEO modules.",
      "Compare automated-marketing-agency and chokma-growth-os lead/CRM schemas against current SIRINX lead entities.",
      "Keep mobile repos blocked until signing files and credential policy are reviewed.",
      "Do not bulk-copy code into www.sirinx.co or sirinx-os without scoped tests."
    ],
    updatedAt: new Date().toISOString()
  };
}
