import { getExternalGateEvidenceStatus } from "./external-gate-evidence.mjs";

const runnerRules = {
  "sirinx-os-github-publish": {
    lane: "devops",
    localChecks: [
      "git status --short --branch",
      "git remote -v",
      "pnpm verify",
      "pnpm external-gates:evidence-check"
    ],
    blockedExternalActions: [
      "git remote add",
      "git push",
      "gh pr create",
      "gh pr edit"
    ],
    operatorNextStep: "Fill GitHub owner/repo, remote URL, branch, PR title/body, and rollback evidence before any remote or push action."
  },
  "codex-mobile-qr-mfa": {
    lane: "shogun",
    localChecks: [
      "hermes pairing list",
      "pnpm external-gates:evidence-check",
      "pnpm external-gates:check"
    ],
    blockedExternalActions: [
      "bypass QR",
      "bypass MFA",
      "use mismatched workspace",
      "pair unknown host"
    ],
    operatorNextStep: "Complete official Codex Mobile QR/MFA pairing on the Mac and phone, then check the evidence items."
  },
  "telegram-line-recipient-token": {
    lane: "backend",
    localChecks: [
      "pnpm external-gates:evidence-check",
      "hermes gateway status"
    ],
    blockedExternalActions: [
      "/Users/sirinx/.local/bin/hermes-telegram-test",
      "Telegram smoke send",
      "LINE push/reply send",
      "role messaging enable"
    ],
    operatorNextStep: "Rotate or confirm token ownership and recipient target before any smoke send."
  },
  "solis-readonly-telemetry": {
    lane: "solis",
    localChecks: [
      "pnpm external-gates:evidence-check",
      "test -f policies/solis-load-control-policy.yaml"
    ],
    blockedExternalActions: [
      "SolisCloud credential login",
      "Solis telemetry call",
      "inverter control",
      "battery dispatch",
      "export-limit change"
    ],
    operatorNextStep: "Record consent, credential storage path, station mapping, read-only scope, and disabled control path first."
  },
  "cloudflare-bot-management-review": {
    lane: "devops",
    localChecks: [
      "pnpm external-gates:check",
      "curl -fsSI https://www.sirinx.co/"
    ],
    blockedExternalActions: [
      "Cloudflare WAF mutation",
      "Bot Management setting change",
      "DNS change",
      "Access policy change",
      "Pages route change"
    ],
    operatorNextStep: "Record Cloudflare zone permission, candidate rule, rollback, and smoke matrix before any dashboard/API mutation."
  }
};

function summarize(runs) {
  return {
    gates: runs.length,
    readyForHumanReview: runs.filter((run) => run.evidenceStatus === "ready-for-human-review").length,
    blocked: runs.filter((run) => run.status !== "ready-for-human-review").length,
    unsafe: runs.filter((run) => run.evidenceUnsafe).length,
    externalWrites: false,
    executableNow: 0
  };
}

function buildRun(result) {
  const rule = runnerRules[result.id] || {
    lane: result.owner || "shogun",
    localChecks: ["pnpm external-gates:evidence-check"],
    blockedExternalActions: ["unmapped external action"],
    operatorNextStep: result.nextAction
  };
  const ready = result.status === "ready-for-human-review" && result.unsafe === false;

  return {
    id: result.id,
    title: result.title,
    lane: rule.lane,
    owner: result.owner,
    status: ready ? "ready-for-human-review" : result.unsafe ? "blocked-unsafe-evidence" : "blocked-evidence-incomplete",
    evidenceStatus: result.status,
    evidenceReady: result.ready,
    evidenceUnsafe: result.unsafe,
    checkedCount: result.checkedCount,
    requiredCount: result.requiredCount,
    missingCount: result.missingCount,
    missing: result.missing,
    evidenceFile: result.file,
    localChecks: rule.localChecks,
    blockedExternalActions: rule.blockedExternalActions,
    operatorNextStep: ready ? "Human may review this gate evidence, but external execution still requires exact target approval." : rule.operatorNextStep,
    canExecuteNow: false,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false
  };
}

export async function getExternalGateRunnerStatus(options = {}) {
  const evidence = await getExternalGateEvidenceStatus(options);
  const runs = evidence.results.map(buildRun);

  return {
    title: "SIRINX external gate runner readiness",
    mode: "local-runner-readiness",
    status: evidence.summary.unsafe > 0 ? "blocked-unsafe-evidence" : "blocked-external-execution",
    evidenceStatus: evidence.status,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteNow: false,
    summary: summarize(runs),
    runs,
    nextActions: [
      "Use localChecks for inspection only.",
      "Fill evidence files before requesting human review.",
      "Do not run blockedExternalActions until evidence is ready and exact target approval exists.",
      "Handle one gate at a time."
    ],
    updatedAt: new Date().toISOString()
  };
}
