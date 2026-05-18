import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const projectRoot = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";
const profilesRoot = process.env.HERMES_PROFILES_ROOT || join(homedir(), ".hermes", "profiles");
const wrapperRoot = process.env.HERMES_WRAPPER_ROOT || join(homedir(), ".local", "bin");

export const activeRoninProfiles = [
  {
    name: "shogun",
    title: "Commander",
    lane: "approval",
    responsibility: "Orchestrates priorities, approval routing, and final integration.",
    connectors: ["GitHub", "Cloudflare", "Notion", "ClickUp", "Obsidian"],
    approvalGate: "Any external write or production change requires explicit approval."
  },
  {
    name: "planner",
    title: "System Planner",
    lane: "planning",
    responsibility: "Keeps backlog order, system design, blockers, and test matrix current.",
    connectors: ["GitHub", "Notion", "ClickUp", "Google Drive", "Obsidian"],
    approvalGate: "Planning writes require a target page/list/folder."
  },
  {
    name: "frontend",
    title: "Frontend Builder",
    lane: "website",
    responsibility: "Builds public website and Command Center UI inside approved scope.",
    connectors: ["GitHub", "Figma", "Canva", "Browser", "Chrome"],
    approvalGate: "Public homepage edits and deploys require explicit public-site approval."
  },
  {
    name: "backend",
    title: "Backend Integrator",
    lane: "backend",
    responsibility: "Owns APIs, lead capture, integrations, schemas, and service contracts.",
    connectors: ["GitHub", "Supabase", "Cloudflare", "OpenAI Developers"],
    approvalGate: "Migrations, production writes, and runtime config changes require approval."
  },
  {
    name: "devops",
    title: "Release Operator",
    lane: "release",
    responsibility: "Runs local stack, Cloudflare preflight, GitHub release flow, and rollback checks.",
    connectors: ["GitHub", "Cloudflare", "Browser", "Chrome"],
    approvalGate: "Deploy, DNS, route, secret, and PR mutation gates stay explicit."
  },
  {
    name: "qa",
    title: "Verification Lead",
    lane: "quality",
    responsibility: "Runs tests, browser QA, PageSpeed, SEO/AEO checks, and regression review.",
    connectors: ["Browser", "Chrome", "GitHub", "Spreadsheets"],
    approvalGate: "Production POST probes and customer-facing checks require approval."
  },
  {
    name: "growth",
    title: "Growth Strategist",
    lane: "marketing",
    responsibility: "Owns SEO/AEO, 77-province content, campaign logic, and claim hygiene.",
    connectors: ["Notion", "Google Drive", "Canva", "Figma", "GitHub"],
    approvalGate: "Publication, ads, and public copy changes require review approval."
  },
  {
    name: "sales",
    title: "Sales Operator",
    lane: "leads",
    responsibility: "Owns lead triage, local qualification lanes, CRM handoff, proposal workflow, and customer next actions.",
    connectors: ["ClickUp", "Notion", "Google Drive", "Telegram", "LINE"],
    approvalGate: "Customer sends and CRM writes require valid recipient and approval."
  },
  {
    name: "data",
    title: "Data Steward",
    lane: "data",
    responsibility: "Owns Supabase, analytics, spreadsheets, schemas, reports, and lineage.",
    connectors: ["Supabase", "Spreadsheets", "Google Drive", "GitHub"],
    approvalGate: "Schema and production data writes require migration plan approval."
  },
  {
    name: "solis",
    title: "Solis Safety Planner",
    lane: "energy",
    responsibility: "Owns read-only inverter telemetry, simulation, and load-balancing safety planning.",
    connectors: ["Supabase", "Spreadsheets", "GitHub", "Documents"],
    approvalGate: "Device control requires consent, credentials, engineer signoff, and pilot approval."
  },
  {
    name: "design",
    title: "Design Producer",
    lane: "creative",
    responsibility: "Owns Figma, Canva, presentations, documents, and reusable brand assets.",
    connectors: ["Figma", "Canva", "Presentations", "Documents", "Google Drive"],
    approvalGate: "External publishing/export to shared workspaces requires target approval."
  },
  {
    name: "scribe",
    title: "Knowledge Steward",
    lane: "memory",
    responsibility: "Owns Obsidian, Notion, Google Drive notes, runbooks, and memory hygiene.",
    connectors: ["Obsidian", "Notion", "Google Drive", "Documents"],
    approvalGate: "No raw chat logs, secrets, or private customer data may become memory."
  }
];

export const roninRoleRoster = [
  ["shogun", "Command orchestration", "approval"],
  ["planner", "Backlog and system design", "planning"],
  ["frontend", "Website and Command Center UI", "website"],
  ["backend", "API and integration contracts", "backend"],
  ["devops", "Cloudflare, GitHub, release gates", "release"],
  ["qa", "Testing and debugging", "quality"],
  ["growth", "SEO/AEO and campaigns", "marketing"],
  ["sales", "Lead triage and CRM handoff", "leads"],
  ["data", "Supabase, analytics, reporting", "data"],
  ["solis", "Solis telemetry and load balancing", "energy"],
  ["design", "Figma, Canva, decks, documents", "creative"],
  ["scribe", "Obsidian and knowledge hygiene", "memory"],
  ["security", "Secrets, access, and policy review", "risk"],
  ["messenger", "Telegram/LINE delivery guard", "messaging"],
  ["seo", "Technical SEO", "marketing"],
  ["pageperf", "Core Web Vitals and loading", "quality"],
  ["contentth", "Thai content refinement", "marketing"],
  ["contenten", "English content refinement", "marketing"],
  ["provinces", "77-province local pages", "marketing"],
  ["leadops", "Lead funnel operations", "leads"],
  ["crm", "CRM and customer status hygiene", "leads"],
  ["finance", "Savings, ROI, payback assumptions", "business"],
  ["legal", "Claims, consent, and contract review", "risk"],
  ["cloudflare", "Workers, Pages, DNS, Access", "release"],
  ["github", "Branches, PRs, CI, release notes", "release"],
  ["supabase", "Postgres, auth, storage, realtime", "data"],
  ["clickup", "Task execution and status reporting", "ops"],
  ["notion", "Executive knowledge and specs", "memory"],
  ["drive", "Docs, Sheets, Slides handoff", "memory"],
  ["figma", "Design system and UI review", "creative"],
  ["canva", "Marketing asset production", "creative"],
  ["slides", "Executive presentations", "creative"],
  ["documents", "Formal docs and proposals", "business"],
  ["sheets", "Calculators and operating reports", "data"],
  ["analytics", "Traffic and funnel analytics", "data"],
  ["automation", "n8n and recurring workflows", "ops"],
  ["browserqa", "Browser automation checks", "quality"],
  ["mobilecodex", "Codex Mobile setup and runbook", "ops"],
  ["obsidian", "Local brain and digest hygiene", "memory"],
  ["customer", "Customer journey and approval UX", "leads"],
  ["support", "Issue intake and customer support", "ops"],
  ["procurement", "Equipment/vendor workflow", "business"],
  ["fieldengineer", "Site survey and install reality check", "energy"],
  ["energyengineer", "PV/BESS/EMS technical review", "energy"],
  ["inverter", "Inverter telemetry and alarms", "energy"],
  ["bess", "Battery storage design assumptions", "energy"],
  ["ev", "EV charging integration planning", "energy"]
].map(([id, title, lane], index) => ({
  number: index + 1,
  id,
  title,
  lane,
  runtime: activeRoninProfiles.some((profile) => profile.name === id) ? "active-profile" : "virtual-roster",
  candidateProfile: id
}));

export const connectorPolicy = [
  {
    connector: "GitHub",
    mode: "write-ready",
    rule: "Read repos, PRs, issues, and CI first. Commits, pushes, labels, and PR edits require explicit target approval."
  },
  {
    connector: "Supabase",
    mode: "write-ready",
    rule: "Read schema/config first. Migrations, data writes, and secret changes require a migration plan and approval."
  },
  {
    connector: "Notion",
    mode: "write-ready",
    rule: "Write only summaries, plans, and decisions to an approved workspace/page target."
  },
  {
    connector: "ClickUp",
    mode: "write-ready",
    rule: "Create or update tasks only in an approved SIRINX list with owner/status fields."
  },
  {
    connector: "Google Drive",
    mode: "write-ready",
    rule: "Create or edit Docs/Sheets/Slides only inside an approved folder or file."
  },
  {
    connector: "Figma/Canva/Presentations/Documents/Spreadsheets",
    mode: "write-ready",
    rule: "Generate assets only from an approved brief and target. Do not publish externally without approval."
  },
  {
    connector: "Browser/Chrome/Computer Use",
    mode: "operator-gated",
    rule: "Use for inspection, local verification, and dashboard operation. Purchases, deletes, sends, and public posts require approval."
  },
  {
    connector: "Telegram/LINE",
    mode: "blocked-until-target-fixed",
    rule: "No real sends until a valid chat/channel target is confirmed and a smoke send succeeds."
  }
];

export const agentBacklogGates = [
  {
    id: "codex-mobile-qr",
    title: "Codex Mobile QR/MFA pairing",
    owner: "mobilecodex",
    status: "manual-gate",
    nextAction: "User scans QR in Codex App and completes MFA/SSO on ChatGPT mobile."
  },
  {
    id: "telegram-target",
    title: "Telegram/LINE target rotation",
    owner: "messenger",
    status: "blocked-target-fix",
    nextAction: "Confirm a deliverable Telegram chat/channel before enabling sends."
  },
  {
    id: "solis-consent",
    title: "Solis API consent and read-only telemetry",
    owner: "solis",
    status: "approval-gate",
    nextAction: "Collect customer consent, API credentials, and station mapping for read-only telemetry."
  },
  {
    id: "github-public-pr",
    title: "Public website PR merge/push",
    owner: "github",
    status: "review-gate",
    nextAction: "Review draft PR and merge only after public website acceptance."
  },
  {
    id: "seo-aeo-pagespeed",
    title: "SEO/AEO and PageSpeed work",
    owner: "qa",
    status: "ready",
    nextAction: "Run public website audit and patch content/performance in a protected branch."
  },
  {
    id: "lead-monitoring",
    title: "Production lead backend monitoring",
    owner: "backend",
    status: "active-monitor",
    nextAction: "Monitor safe GET and existing production smoke evidence without creating duplicate leads."
  },
  {
    id: "lead-qualification-routing",
    title: "Local lead qualification routing",
    owner: "sales",
    status: "active-local",
    nextAction: "Use /api/lead-health qualificationModel to route sales-engineering-review, qualification-follow-up, nurture, and missing-contact lanes before any CRM write."
  },
  {
    id: "obsidian-brain",
    title: "Obsidian brain recording",
    owner: "scribe",
    status: "active-local",
    nextAction: "Append concise decisions and test evidence; do not store raw chat logs."
  }
];

function readConfiguredCwd(profileName) {
  const configPath = join(profilesRoot, profileName, "config.yaml");
  try {
    const config = readFileSync(configPath, "utf8");
    const match = config.match(/^\s+cwd:\s+(.+)$/m);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

export function getRoninAgentTeam() {
  const activeProfiles = activeRoninProfiles.map((profile) => {
    const profilePath = join(profilesRoot, profile.name);
    const aliasPath = join(wrapperRoot, profile.name);
    const profileReady = existsSync(profilePath);
    const aliasReady = existsSync(aliasPath);
    const configuredCwd = readConfiguredCwd(profile.name);
    const cwdReady = configuredCwd === projectRoot;

    return {
      ...profile,
      profilePath,
      aliasPath,
      command: `${profile.name} chat`,
      cwd: configuredCwd || projectRoot,
      status: profileReady && cwdReady ? "profile-ready" : "profile-needs-check",
      gateway: "stopped",
      aliasReady,
      cwdReady,
      telegram: "blocked-target-fix",
      externalWrites: "approval-gated"
    };
  });

  const readyProfiles = activeProfiles.filter((profile) => profile.status === "profile-ready").length;
  const aliasReady = activeProfiles.filter((profile) => profile.aliasReady).length;

  return {
    title: "SIRINX 47 Ronin Agent Team",
    mode: "12-active-profiles-plus-47-role-roster",
    externalWrites: false,
    connectorMode: "write-ready-approval-gated",
    mainWebsiteProtected: true,
    telegramDelivery: "blocked-target-fix",
    projectRoot,
    profilesRoot,
    summary: {
      activeProfiles: activeProfiles.length,
      readyProfiles,
      aliases: aliasReady,
      rosterRoles: roninRoleRoster.length,
      connectorPolicies: connectorPolicy.length,
      backlogGates: agentBacklogGates.length
    },
    activeProfiles,
    roleRoster: roninRoleRoster,
    connectorPolicy,
    backlogGates: agentBacklogGates
  };
}
