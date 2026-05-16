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
    evidence: ["HTTP 200 baseline", "main website protected", "no internal dashboard routes"]
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
    status: "blocked-for-production",
    mode: "dry-run-only",
    command: "simulate bridge readiness only",
    actionId: "telegram-line-bridge-check",
    approvalGate: "Real sends require token rotation, secret storage, webhook verification, and approval.",
    evidence: ["customer messaging switch off", "Telegram blocker", "LINE planned"]
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
    id: "cloudflare-release",
    title: "Cloudflare Release",
    surface: "Pages, Workers, DNS",
    owner: "Release operator",
    status: "approval-required",
    mode: "preflight-only",
    command: "wrangler read-only inspection first",
    actionId: "cloudflare-subdomain-plan",
    approvalGate: "Production deploy, DNS, Worker route, and secret writes require explicit approval.",
    evidence: ["Cloud mutation switch off", "rollback required", "main router protected"]
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
    title: "Verify SIRINX OS And Hermes",
    status: "done",
    nextCommand: "pnpm verify && pnpm dashboard:e2e",
    output: "Local command center is safe to operate."
  },
  {
    id: "phase-2",
    label: "Phase 2",
    title: "Connect Codex Mobile",
    status: "manual-gate",
    nextCommand: "Open Codex App > Set up Codex mobile > scan QR",
    output: "Mobile becomes command, review, and approval surface."
  },
  {
    id: "phase-3",
    label: "Phase 3",
    title: "Review Repo And Subdomain Inventory",
    status: "ready",
    nextCommand: "GET /api/project-inventory",
    output: "Choose one subdomain candidate without touching www."
  },
  {
    id: "phase-4",
    label: "Phase 4",
    title: "Build Solis Read-Only Connector",
    status: "next",
    nextCommand: "mock-first telemetry connector",
    output: "Telemetry can be inspected without control commands."
  },
  {
    id: "phase-5",
    label: "Phase 5",
    title: "Draft Database Schema",
    status: "planned",
    nextCommand: "schema draft, no migration",
    output: "Customers, sites, devices, telemetry, approvals, audit events."
  },
  {
    id: "phase-6",
    label: "Phase 6",
    title: "Dashboard Telemetry Cards",
    status: "planned",
    nextCommand: "local dashboard only",
    output: "Per-site PV/load/grid/battery/alarm visibility."
  },
  {
    id: "phase-7",
    label: "Phase 7",
    title: "Dry-Run Approval Bridge",
    status: "planned",
    nextCommand: "LINE/Telegram mock only",
    output: "Approval workflow works before customer sends."
  }
];

export function getVibeCommandCenter() {
  const blocked = commandCenterFunctions.filter((item) => item.status.includes("blocked")).length;
  const dryRun = commandCenterFunctions.filter((item) => item.mode.includes("dry") || item.mode.includes("simulation")).length;
  const ready = commandCenterFunctions.filter((item) => ["live-locked", "online-local", "ready-for-review", "active-local"].includes(item.status)).length;

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
      phases: processLane.length
    },
    functions: commandCenterFunctions,
    processLane,
    operatingRule: "Work in order: baseline, verify, mobile setup, inventory, Solis read-only connector, schema, telemetry UI, approval bridge.",
    updatedAt: currentTimestamp()
  };
}
