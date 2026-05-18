import { getRoninAgentTeam } from "./agent-team.mjs";

const currentTimestamp = () => new Date().toISOString();

export const commandCenterFunctions = [
  {
    id: "public-website",
    title: "Public Website Control",
    surface: "www.sirinx.co",
    owner: "Hermes release gate",
    status: "live-locked",
    mode: "monitor-only",
    command: "pnpm check && pnpm test && pnpm build",
    actionId: "baseline-check",
    approvalGate: "Deploy or router changes require explicit approval.",
    evidence: ["HTTP 200 baseline", "main website protected", "no internal dashboard routes", "contact fallback remains active"]
  },
  {
    id: "lead-backend-preflight",
    title: "Lead Backend Preflight",
    surface: "www.sirinx.co/api/trpc/lead.submit",
    owner: "Hermes backend integrator",
    status: "production-handler-live-smoke-passed",
    mode: "production-monitor",
    command: "pnpm cloudflare:main-router:check && pnpm cloudflare:main-router:test",
    actionId: "lead-backend-preflight",
    approvalGate: "Further schema, DNS, or D1 changes require explicit approval.",
    evidence: ["local mock D1 self-test", "tRPC batch parser test", "Cloudflare main-router deployed", "production smoke lead ec8dd128-a57c-4d6d-b0f8-4b91c1b94c2b"]
  },
  {
    id: "lead-qualification-routing",
    title: "Lead Qualification Routing",
    surface: "Command Center /api/lead-health",
    owner: "Hermes sales operator",
    status: "active-local",
    mode: "local-only",
    command: "curl /api/lead-health",
    actionId: "lead-backend-preflight",
    approvalGate: "CRM writes and customer sends still require explicit target and approval.",
    evidence: ["lead intake schema", "lead qualification model", "47 Ronin sales/backend lanes", "externalWrites=false"]
  },
  {
    id: "hermes-runtime",
    title: "Hermes Runtime",
    surface: "Local Command Center",
    owner: "Hermes devops runner",
    status: "online-local",
    mode: "dry-run",
    command: "pnpm dashboard:run && pnpm dashboard:e2e",
    actionId: "dashboard-qa",
    approvalGate: "No production exposure without Cloudflare Access plan approval.",
    evidence: ["Control API health", "Playwright desktop/mobile checks", "safe dispatcher"]
  },
  {
    id: "codex-mobile-host",
    title: "Codex Mobile Host",
    surface: "Mac mini local host",
    owner: "Human operator",
    status: "host-ready",
    mode: "manual-qr-pairing",
    command: "Open Codex App > Set up Codex mobile",
    actionId: "baseline-check",
    approvalGate: "QR scan, MFA, SSO, and workspace confirmation must be completed by the user on mobile.",
    evidence: ["Codex App running", "Codex CLI installed", "Mac sleep disabled on AC power"]
  },
  {
    id: "repo-subdomain-inventory",
    title: "Repo And Subdomain Inventory",
    surface: "Subdomain candidates",
    owner: "Hermes project planner",
    status: "ready-for-review",
    mode: "read-only",
    command: "curl /api/project-inventory",
    actionId: "subdomain-build-preflight",
    approvalGate: "DNS, Pages, Worker, and route writes require approval.",
    evidence: ["www locked", "subdomain map", "repo hygiene blockers"]
  },
  {
    id: "solis-load-balancing",
    title: "Solis Load Balancing",
    surface: "Solar intelligence",
    owner: "Safety validator",
    status: "dry-run-engine",
    mode: "simulation-only",
    command: "pnpm --filter @sirinx/solar-intelligence test",
    actionId: "solis-readonly-preflight",
    approvalGate: "Customer consent, API access, engineer signoff, and pilot approval are required before control.",
    evidence: ["read-only API plan", "safety policy", "19 solar tests"]
  },
  {
    id: "customer-approval",
    title: "Approval And Audit",
    surface: "Human approval queue",
    owner: "Audit incident agent",
    status: "active-local",
    mode: "approval-gated",
    command: "curl /api/approval-queue && curl /api/audit-events",
    actionId: "approval-queue-preflight",
    approvalGate: "Customer-facing sends and external writes stay blocked unless explicitly approved.",
    evidence: ["approval queue", "audit trail", "kill switch checks"]
  },
  {
    id: "telegram-line",
    title: "Telegram / LINE Bridge",
    surface: "Messaging integrations",
    owner: "Connector guard",
    status: "telegram-gateway-connected-target-invalid",
    mode: "dry-run-only",
    command: "simulate bridge readiness only",
    actionId: "telegram-line-bridge-check",
    approvalGate: "Real sends require valid recipient target, token rotation/confirmation, secret storage, webhook verification, and approval.",
    evidence: ["Telegram gateway connected", "home target not deliverable", "LINE not configured"]
  },
  {
    id: "obsidian-brain",
    title: "Obsidian Brain",
    surface: "Knowledge memory",
    owner: "Brain steward",
    status: "indexed-local",
    mode: "read-only-preview",
    command: "curl /api/brain",
    actionId: "brain-index-preflight",
    approvalGate: "No raw chat logs, secrets, or customer private data may become memory.",
    evidence: ["Obsidian roots", "project docs", "Solis plan note"]
  },
  {
    id: "ronin-agent-team",
    title: "47 Ronin Agent Team",
    surface: "Hermes profiles and Command Center",
    owner: "shogun",
    status: "profile-ready",
    mode: "write-ready-approval-gated",
    command: "hermes profile list && curl /api/vibe-command-center",
    actionId: "agent-team-profile-check",
    approvalGate: "External SaaS writes, messaging, deploys, and public website changes still require explicit target approval.",
    evidence: ["12 active Hermes profiles", "47-role roster", "profile cwd locked to sirinx-os", "Telegram target still blocked"]
  },
  {
    id: "cloudflare-release",
    title: "Cloudflare Release",
    surface: "Pages, Workers, DNS",
    owner: "Release operator",
    status: "main-router-deployed",
    mode: "monitor-and-review",
    command: "wrangler read-only inspection first",
    actionId: "cloudflare-subdomain-plan",
    approvalGate: "Additional DNS, route, Worker, Pages, and secret writes require explicit approval.",
    evidence: ["sirinx-main-router deployed", "D1 binding verified", "www proxy protected"]
  }
];

export const processLane = [
  {
    id: "phase-0",
    label: "Phase 0",
    title: "Freeze Public Website Baseline",
    status: "done",
    nextCommand: "pnpm check && pnpm test && pnpm build",
    output: "www.sirinx.co remains locked and healthy."
  },
  {
    id: "phase-1",
    label: "Phase 1",
    title: "Lock Command Center Design",
    status: "done",
    nextCommand: "git show ebc8cc4 --stat",
    output: "System design, wiring plan, blockers, and test matrix are committed."
  },
  {
    id: "phase-2",
    label: "Phase 2",
    title: "Lead Backend Local Preflight",
    status: "done",
    nextCommand: "pnpm cloudflare:main-router:test",
    output: "Main-router lead handler supports tRPC batch payloads and mock D1 inserts."
  },
  {
    id: "phase-3",
    label: "Phase 3",
    title: "Command Center Lead Health",
    status: "done",
    nextCommand: "GET /api/lead-health",
    output: "Dashboard shows local handler readiness and no-write production probe state."
  },
  {
    id: "phase-3b",
    label: "Phase 3B",
    title: "Local Lead Qualification Routing",
    status: "done",
    nextCommand: "GET /api/lead-health",
    output: "Command Center maps local lead probes into sales workflow lanes without CRM writes."
  },
  {
    id: "phase-4",
    label: "Phase 4",
    title: "Cloudflare Domain Cleanup Plan",
    status: "done",
    nextCommand: "open docs/knowledge/SIRINX_CLOUDFLARE_DOMAIN_CONFIG_CLEANUP_PLAN.md",
    output: "Legacy .com references are inventoried; no deploy or rewrite was performed."
  },
  {
    id: "phase-5",
    label: "Phase 5",
    title: "Deploy Lead Handler",
    status: "done",
    nextCommand: "git show bd729c9 --stat",
    output: "Cloudflare main-router deployed, production lead POST smoke passed, and evidence recorded."
  },
  {
    id: "phase-6",
    label: "Phase 6",
    title: "Connect Codex Mobile",
    status: "manual-gate",
    nextCommand: "Open Codex App > Set up Codex mobile > scan QR",
    output: "Mobile becomes command, review, and approval surface."
  },
  {
    id: "phase-7",
    label: "Phase 7",
    title: "Review Repo And Subdomain Inventory",
    status: "ready",
    nextCommand: "GET /api/project-inventory",
    output: "Dirty/reference repos are explicit; choose one subdomain candidate without touching www."
  },
  {
    id: "phase-8",
    label: "Phase 8",
    title: "Build Solis Read-Only Connector",
    status: "planned",
    nextCommand: "mock-first telemetry connector",
    output: "Telemetry can be inspected without control commands."
  },
  {
    id: "phase-9",
    label: "Phase 9",
    title: "Draft Database Schema",
    status: "planned",
    nextCommand: "schema draft, no migration",
    output: "Customers, sites, devices, telemetry, approvals, audit events."
  },
  {
    id: "phase-10",
    label: "Phase 10",
    title: "Dashboard Telemetry Cards",
    status: "planned",
    nextCommand: "local dashboard only",
    output: "Per-site PV/load/grid/battery/alarm visibility."
  },
  {
    id: "phase-11",
    label: "Phase 11",
    title: "Dry-Run Approval Bridge",
    status: "planned",
    nextCommand: "LINE/Telegram mock only",
    output: "Approval workflow works before customer sends."
  },
  {
    id: "phase-12",
    label: "Phase 12",
    title: "Create 47 Ronin Agent Team",
    status: "done",
    nextCommand: "hermes profile list",
    output: "12 active Hermes profiles are configured; 47 roles remain managed as a roster."
  }
];

export function getVibeCommandCenter() {
  const agentTeam = getRoninAgentTeam();
  const blocked = commandCenterFunctions.filter((item) => item.status.includes("blocked")).length;
  const dryRun = commandCenterFunctions.filter((item) => item.mode.includes("dry") || item.mode.includes("simulation")).length;
  const ready = commandCenterFunctions.filter((item) =>
    item.status.includes("done") ||
    item.status.includes("ready") ||
    item.status.includes("online") ||
    item.status.includes("live") ||
    item.status.includes("active")
  ).length;

  return {
    title: "Vibe Coding Command Center",
    mode: "local-dry-run",
    externalWrites: false,
    mainWebsiteProtected: true,
    summary: {
      functions: commandCenterFunctions.length,
      ready,
      dryRun,
      blocked,
      phases: processLane.length,
      activeProfiles: agentTeam.summary.activeProfiles,
      readyProfiles: agentTeam.summary.readyProfiles,
      rosterRoles: agentTeam.summary.rosterRoles
    },
    functions: commandCenterFunctions,
    processLane,
    agentTeam,
    operatingRule: "Work in order: public baseline, design lock, lead local preflight, lead health visibility, completed Cloudflare lead deploy evidence, then mobile/Telegram/Solis/SEO work through the 47 Ronin profile lanes.",
    updatedAt: currentTimestamp()
  };
}
