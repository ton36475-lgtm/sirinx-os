import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const defaultRoot = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";
const defaultEvidenceRoot = path.join(defaultRoot, "docs/knowledge/external-gates/evidence");

export const externalGateEvidenceRules = [
  {
    id: "sirinx-os-github-publish",
    title: "SIRINX OS GitHub Publish Target",
    file: "sirinx-os-github-publish.md",
    owner: "devops",
    nextAction: "Record the exact GitHub owner/repo, remote URL, branch, PR target, and rollback rule before any push.",
    required: [
      "target GitHub owner/repo confirmed",
      "target remote URL recorded",
      "target branch and base branch recorded",
      "PR title/body approved",
      "no force-push rollback rule recorded"
    ]
  },
  {
    id: "codex-mobile-qr-mfa",
    title: "Codex Mobile QR/MFA Pairing",
    file: "codex-mobile-qr-mfa.md",
    owner: "shogun",
    nextAction: "Complete QR/MFA pairing on the Mac and phone, then check the completed evidence items.",
    required: [
      "same ChatGPT account/workspace confirmed",
      "Mac host appears online in ChatGPT mobile Codex",
      "MFA/SSO/passkey completed",
      "Mac keep-awake confirmed",
      "wrong-account rollback understood"
    ]
  },
  {
    id: "telegram-line-recipient-token",
    title: "Telegram/LINE Recipient And Token Setup",
    file: "telegram-line-recipient-token.md",
    owner: "backend",
    nextAction: "Rotate or confirm messaging credentials and recipient target before any smoke send.",
    required: [
      "Telegram token rotated or owner-confirmed",
      "Telegram intended recipient named",
      "Telegram recipient has messaged bot or joined target chat",
      "LINE OA channel confirmed or explicitly not in scope",
      "no message-send smoke before final target approval"
    ]
  },
  {
    id: "solis-readonly-telemetry",
    title: "Solis API Consent And Read-Only Telemetry",
    file: "solis-readonly-telemetry.md",
    owner: "solis",
    nextAction: "Record customer consent, credential storage path, and station mapping before any Solis API call.",
    required: [
      "customer/site consent recorded",
      "credential storage path approved",
      "station/inverter/logger/meter mapping recorded",
      "read-only smoke scope confirmed",
      "control/write path disabled"
    ]
  },
  {
    id: "cloudflare-bot-management-review",
    title: "Cloudflare Bot Management Official Review",
    file: "cloudflare-bot-management-review.md",
    owner: "devops",
    nextAction: "Record zone permission, candidate rule, rollback, and smoke matrix before any Cloudflare rule mutation.",
    required: [
      "Cloudflare zone and permission scope confirmed",
      "current CSP mitigation acknowledged",
      "admin/API/auth/webhook/telemetry protection preserved",
      "candidate rule and rollback path recorded",
      "post-change smoke matrix recorded"
    ]
  }
];

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,
  /\b[A-Za-z0-9_-]{24,}:[A-Za-z0-9_-]{24,}\b/,
  /\bLINE_CHANNEL_ACCESS_TOKEN\s*=/i,
  /\bLINE_CHANNEL_SECRET\s*=/i,
  /\bTELEGRAM_BOT_TOKEN\s*=/i,
  /\bOPENAI_API_KEY\s*=/i,
  /\bSOLIS(?:CLOUD)?_[A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)\s*=/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

function hasChecked(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`- \\[[xX]\\]\\s+${escaped}`).test(content);
}

function hasSecretLikeContent(content) {
  return secretPatterns.some((pattern) => pattern.test(content));
}

async function inspectGate(gate, evidenceRoot) {
  const targetPath = path.join(evidenceRoot, gate.file);

  if (!existsSync(targetPath)) {
    return {
      id: gate.id,
      title: gate.title,
      owner: gate.owner,
      file: targetPath,
      status: "missing-evidence",
      ready: false,
      unsafe: false,
      checkedCount: 0,
      missingCount: gate.required.length,
      requiredCount: gate.required.length,
      missing: gate.required,
      nextAction: gate.nextAction
    };
  }

  const content = await readFile(targetPath, "utf8");
  const unsafe = hasSecretLikeContent(content);
  const missing = gate.required.filter((label) => !hasChecked(content, label));
  const checkedCount = gate.required.length - missing.length;

  return {
    id: gate.id,
    title: gate.title,
    owner: gate.owner,
    file: targetPath,
    status: unsafe ? "unsafe-secret-like-content" : missing.length === 0 ? "ready-for-human-review" : "incomplete-evidence",
    ready: !unsafe && missing.length === 0,
    unsafe,
    checkedCount,
    missingCount: missing.length,
    requiredCount: gate.required.length,
    missing,
    nextAction: gate.nextAction
  };
}

function summarize(results) {
  const unsafe = results.filter((result) => result.unsafe);
  const ready = results.filter((result) => result.ready);
  const missing = results.filter((result) => result.status === "missing-evidence");
  const incomplete = results.filter((result) => result.status === "incomplete-evidence");

  return {
    gates: results.length,
    ready: ready.length,
    blocked: results.length - ready.length,
    missingEvidenceFiles: missing.length,
    incomplete: incomplete.length,
    unsafe: unsafe.length,
    checkedItems: results.reduce((sum, result) => sum + result.checkedCount, 0),
    requiredItems: results.reduce((sum, result) => sum + result.requiredCount, 0)
  };
}

export async function getExternalGateEvidenceStatus(options = {}) {
  const evidenceRoot = options.evidenceRoot || defaultEvidenceRoot;
  const rules = options.rules || externalGateEvidenceRules;
  const results = [];

  for (const gate of rules) {
    results.push(await inspectGate(gate, evidenceRoot));
  }

  const summary = summarize(results);

  return {
    title: "SIRINX external gate evidence status",
    mode: "local-evidence-only",
    status: summary.unsafe > 0 ? "blocked-unsafe-evidence" : summary.ready === summary.gates ? "ready-for-human-review" : "blocked-evidence-incomplete",
    evidenceRoot,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    summary,
    results,
    nextActions: [
      "Fill only non-secret evidence labels in the matching evidence file.",
      "Check only items that are actually complete.",
      "Run `pnpm external-gates:evidence-check` after each evidence update.",
      "Do not execute the external gate until that gate reports `ready-for-human-review`."
    ],
    updatedAt: new Date().toISOString()
  };
}
