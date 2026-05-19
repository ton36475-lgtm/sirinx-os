import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";
const evidenceRoot = path.join(root, "docs/knowledge/external-gates/evidence");

const gates = [
  {
    id: "codex-mobile-qr-mfa",
    file: "codex-mobile-qr-mfa.md",
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
    file: "telegram-line-recipient-token.md",
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
    file: "solis-readonly-telemetry.md",
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
    file: "cloudflare-bot-management-review.md",
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

async function inspectGate(gate) {
  const targetPath = path.join(evidenceRoot, gate.file);

  if (!existsSync(targetPath)) {
    return {
      id: gate.id,
      file: targetPath,
      status: "missing-evidence",
      ready: false,
      unsafe: false,
      missing: gate.required
    };
  }

  const content = await readFile(targetPath, "utf8");
  const unsafe = hasSecretLikeContent(content);
  const missing = gate.required.filter((label) => !hasChecked(content, label));

  return {
    id: gate.id,
    file: targetPath,
    status: unsafe ? "unsafe-secret-like-content" : missing.length === 0 ? "ready-for-human-review" : "incomplete-evidence",
    ready: !unsafe && missing.length === 0,
    unsafe,
    missing
  };
}

const results = [];
for (const gate of gates) {
  results.push(await inspectGate(gate));
}

const unsafe = results.filter((result) => result.unsafe);
const ready = results.filter((result) => result.ready);
const blocked = results.filter((result) => !result.ready && !result.unsafe);

const output = {
  title: "SIRINX external gate evidence check",
  mode: "local-evidence-only",
  evidenceRoot,
  externalWrites: false,
  productionWrites: false,
  canExecuteExternally: false,
  summary: {
    gates: results.length,
    ready: ready.length,
    blocked: blocked.length,
    unsafe: unsafe.length
  },
  results: results.map((result) => ({
    id: result.id,
    status: result.status,
    ready: result.ready,
    unsafe: result.unsafe,
    missingCount: result.missing.length,
    missing: result.missing
  }))
};

console.log(JSON.stringify(output, null, 2));

if (unsafe.length > 0) {
  process.exit(1);
}
