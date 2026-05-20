import { getExternalGateRunnerStatus } from "./external-gate-runner.mjs";

const strictGateOrder = [
  "codex-mobile-qr-mfa",
  "sirinx-os-github-publish",
  "telegram-line-recipient-token",
  "solis-readonly-telemetry",
  "cloudflare-bot-management-review"
];

const clearedLocalWork = [
  "public website production restore, Home Solution SEO/AEO, live energy background, AI avatar motion, mobile PageSpeed pass, and CSP mitigation are complete and protected",
  "Command Center local API/dashboard, Hermes inbox dry-run, approval queue, evidence readiness, and gate runner readiness are implemented",
  "GitHub repo integration is bounded as read-only extraction workstreams; no old repo code is bulk-imported into production",
  "lead backend, ROI preview, proposal draft/review, sales artifacts, and solar ops contracts are local-only and external writes remain disabled"
];

const stopRules = [
  "Do not read `.env` values, tokens, private keys, API secrets, or customer credentials.",
  "Do not deploy, push, create PRs, mutate Cloudflare, send Telegram/LINE messages, call SolisCloud, or write Supabase/CRM without exact gate evidence.",
  "Keep `www.sirinx.co` unchanged unless a later task explicitly targets the public website.",
  "Handle one gate at a time and rerun local checks after each evidence update."
];

function orderRuns(runs) {
  const byId = new Map(runs.map((run) => [run.id, run]));
  const ordered = strictGateOrder.map((id) => byId.get(id)).filter(Boolean);
  const leftovers = runs.filter((run) => !strictGateOrder.includes(run.id));
  return [...ordered, ...leftovers];
}

function buildPendingItem(run, index) {
  return {
    part: index + 1,
    id: run.id,
    title: run.title,
    lane: run.lane,
    owner: run.owner,
    status: run.status,
    evidenceStatus: run.evidenceStatus,
    evidenceFile: run.evidenceFile,
    checkedCount: run.checkedCount,
    requiredCount: run.requiredCount,
    missingCount: run.missingCount,
    missing: run.missing,
    safeLocalChecks: run.localChecks,
    blockedExternalActions: run.blockedExternalActions,
    nextAction: run.operatorNextStep,
    canExecuteNow: false,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false
  };
}

function summarize(items, runner) {
  const readyForHumanReview = items.filter((item) => item.evidenceStatus === "ready-for-human-review").length;
  const unsafe = items.filter((item) => item.evidenceStatus === "unsafe-secret-like-content").length;
  const blocked = items.length - readyForHumanReview;

  return {
    pendingItems: items.length,
    blockedExternalGates: blocked,
    readyForHumanReview,
    unsafeEvidence: unsafe,
    localOnlyRunnable: 0,
    hiddenBacklog: false,
    externalWrites: false,
    executableNow: runner.summary?.executableNow || 0
  };
}

export async function getPendingWorkLedger(options = {}) {
  const runner = await getExternalGateRunnerStatus(options);
  const pendingItems = orderRuns(runner.runs || []).map(buildPendingItem);
  const summary = summarize(pendingItems, runner);

  return {
    title: "SIRINX pending work ledger",
    mode: "local-pending-work-ledger",
    status: summary.unsafeEvidence > 0 ? "blocked-unsafe-evidence" : "blocked-external-gates",
    source: "external-gate-runner plus current local backlog policy",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteNow: false,
    mainWebsiteProtected: true,
    summary,
    clearedLocalWork,
    pendingItems,
    nextLocalCommand: summary.unsafeEvidence > 0
      ? "pnpm external-gates:evidence-check"
      : "pnpm external-gates:evidence-check && pnpm external-gates:runner && pnpm external-gates:check",
    stopRules,
    nextActions: [
      "Start with Part 1 Codex Mobile QR/MFA because it unlocks phone-based review and approval.",
      "Fill only non-secret evidence fields in the matching evidence file.",
      "Rerun `pnpm external-gates:evidence-check` after any evidence edit.",
      "Do not run any blocked external action until that exact gate is evidence-ready and explicitly approved."
    ],
    updatedAt: new Date().toISOString()
  };
}
