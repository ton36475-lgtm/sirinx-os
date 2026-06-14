import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const defaultRoot = process.env.SIRINX_PROJECT_ROOT || "/Users/sirinx/sirinx-os";
const defaultEvidenceRoot = path.join(defaultRoot, "docs/knowledge/external-gates/evidence");
const evidenceFile = "telegram-line-recipient-token.md";

export const hermesAgentAuditBlockedActions = [
  "hermes_gateway_restart_from_api",
  "telegram_send",
  "line_send",
  "whatsapp_send",
  "discord_send",
  "secret_read_or_print",
  "provider_switch_without_approval",
  "real_mcp_execution",
  "external_connector_activation",
  "customer_message_send"
];

const manualRestartCommands = ["hermes gateway status", "hermes gateway restart"];

const gatewayRules = [
  {
    id: "telegram",
    title: "Telegram",
    required: [
      "Telegram token rotated or owner-confirmed",
      "Telegram intended recipient named",
      "Telegram recipient has messaged bot or joined target chat",
      "no message-send smoke before final target approval"
    ],
    nextAction: "Confirm token ownership/rotation and target proof before any smoke send."
  },
  {
    id: "line",
    title: "LINE OA",
    required: [
      "LINE OA channel confirmed or explicitly not in scope",
      "no message-send smoke before final target approval"
    ],
    nextAction: "Confirm LINE scope and raw-body signature verification before any LINE send."
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    required: [
      "WhatsApp gateway explicitly out of scope for this approval",
      "no message-send smoke before final target approval"
    ],
    nextAction: "Mark WhatsApp out of scope or provide session/target policy evidence without sending."
  },
  {
    id: "discord",
    title: "Discord",
    required: [
      "Discord gateway explicitly out of scope for this approval",
      "no message-send smoke before final target approval"
    ],
    nextAction: "Mark Discord out of scope or provide bot/target policy evidence without sending."
  }
];

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,
  /\b[A-Za-z0-9_-]{8,}:[A-Za-z0-9_-]{20,}\b/,
  /\bLINE_CHANNEL_ACCESS_TOKEN\s*=/i,
  /\bLINE_CHANNEL_SECRET\s*=/i,
  /\bTELEGRAM_BOT_TOKEN\s*=/i,
  /\bDISCORD_BOT_TOKEN\s*=/i,
  /\bWHATSAPP_[A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD)\s*=/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function lock() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRestartGateway: false,
    canSendMessages: false,
    canRunMcp: false,
    canReadSecrets: false,
    commandExecuted: false,
    gatewayRestarted: false,
    messageSent: false,
    secretsRead: false,
    requiresHumanApproval: true
  };
}

function hasChecked(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`- \\[[xX]\\]\\s+${escaped}`).test(content);
}

function hasSecretLikeContent(content) {
  return secretPatterns.some((pattern) => pattern.test(content));
}

async function readEvidence(evidenceRoot) {
  const file = path.join(evidenceRoot, evidenceFile);

  if (!existsSync(file)) {
    return {
      exists: false,
      unsafe: false,
      file,
      content: ""
    };
  }

  const content = await readFile(file, "utf8");
  return {
    exists: true,
    unsafe: hasSecretLikeContent(content),
    file,
    content
  };
}

function inspectGateway(rule, evidence) {
  if (!evidence.exists) {
    return {
      id: rule.id,
      title: rule.title,
      status: "missing-evidence",
      ready: false,
      unsafe: false,
      checkedCount: 0,
      requiredCount: rule.required.length,
      missing: rule.required,
      nextAction: rule.nextAction
    };
  }

  const missing = rule.required.filter((label) => !hasChecked(evidence.content, label));
  const checkedCount = rule.required.length - missing.length;

  return {
    id: rule.id,
    title: rule.title,
    status: evidence.unsafe ? "unsafe-secret-like-content" : missing.length === 0 ? "ready-for-human-review" : "incomplete-evidence",
    ready: !evidence.unsafe && missing.length === 0,
    unsafe: evidence.unsafe,
    checkedCount,
    requiredCount: rule.required.length,
    missing,
    nextAction: rule.nextAction
  };
}

function summarize(gateways) {
  const hasUnsafeEvidence = gateways.some((gateway) => gateway.unsafe);

  return {
    gateways: gateways.length,
    ready: gateways.filter((gateway) => gateway.ready).length,
    blocked: gateways.filter((gateway) => !gateway.ready).length,
    unsafe: hasUnsafeEvidence ? 1 : 0,
    checkedItems: gateways.reduce((sum, gateway) => sum + gateway.checkedCount, 0),
    requiredItems: gateways.reduce((sum, gateway) => sum + gateway.requiredCount, 0)
  };
}

export async function getHermesAgentAuditStatus(options = {}) {
  const evidenceRoot = options.evidenceRoot || defaultEvidenceRoot;
  const evidence = await readEvidence(evidenceRoot);
  const gateways = gatewayRules.map((rule) => inspectGateway(rule, evidence));
  const summary = summarize(gateways);
  const ready = summary.ready === summary.gateways && summary.unsafe === 0;

  return {
    title: "Hermes Agent Messaging Audit",
    status: summary.unsafe > 0
      ? "blocked-unsafe-evidence"
      : ready
        ? "ready-for-manual-gateway-restart-approval"
        : "blocked-evidence-incomplete",
    mode: "local-only-hermes-messaging-audit",
    ...lock(),
    evidenceRoot,
    evidenceFile,
    evidenceExists: evidence.exists,
    summary,
    gateways,
    blockedActions: hermesAgentAuditBlockedActions,
    manualCommands: ready ? manualRestartCommands : [],
    manualCommandsExecutableByApi: false,
    approvalPhrase:
      "I approve manual Hermes gateway restart after reviewing messaging evidence; no message send is approved.",
    nextActions: ready
      ? [
          "Review the approval packet and exact manual commands.",
          "Run `hermes gateway status` manually first.",
          "Run `hermes gateway restart` manually only after the operator approval phrase is supplied.",
          "Do not run any message-send smoke in this approval."
        ]
      : [
          "Complete missing non-secret evidence in the Telegram/LINE evidence file.",
          "Mark WhatsApp and Discord explicitly out of scope or add non-secret gateway policy evidence.",
          "Run the audit again before requesting manual restart approval.",
          "Do not restart Hermes or send messages while any gateway is blocked."
        ],
    stopPoint: "HERMES MESSAGING AUDIT READY - MANUAL GATEWAY RESTART APPROVAL REQUIRED",
    updatedAt: nowIso(options)
  };
}

export async function createHermesAgentAuditApprovalDryRun(body = {}, options = {}) {
  const status = await getHermesAgentAuditStatus(options);
  const requestId = String(body.requestId || "hermes-agent-audit-approval-dry-run").trim();

  return {
    title: "Hermes Agent Messaging Audit Approval Dry-Run",
    status:
      status.status === "ready-for-manual-gateway-restart-approval"
        ? "dry-run-hermes-agent-audit-approval-ready"
        : "blocked-hermes-agent-audit-approval",
    mode: "local-only-approval-packet",
    requestId,
    requestedBy: String(body.requestedBy || "local-operator"),
    ...lock(),
    auditStatus: status.status,
    approvalPhrase: status.approvalPhrase,
    manualCommands: status.manualCommands,
    manualCommandsExecutableByApi: false,
    gatewaySummary: status.summary,
    gateways: status.gateways,
    blockedActions: status.blockedActions,
    requiredHumanSteps: [
      "Verify gateway evidence without exposing secrets.",
      "Confirm no message-send smoke is included in this approval.",
      "Copy manual command text only after evidence is ready.",
      "Stop before message send, connector activation, MCP, deploy, push, or publish."
    ],
    stopPoint: status.stopPoint,
    updatedAt: nowIso(options)
  };
}
