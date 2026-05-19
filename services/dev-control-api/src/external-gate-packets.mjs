import { mkdir, writeFile } from "node:fs/promises";

const packetRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Approval Packets";

const packets = [
  {
    id: "gate-codex-mobile-qr-mfa",
    gate: "Gate 1",
    title: "Codex Mobile QR/MFA Pairing",
    risk: "medium",
    target: "Codex App host on this Mac mini and ChatGPT mobile on the user's phone",
    approvalPhrase:
      "Open Codex App on Mac > Set up Codex mobile > scan QR in ChatGPT mobile > complete MFA/SSO/passkey.",
    action:
      "Pair the phone as the command, review, and approval surface while this Mac mini remains the execution host.",
    rollback:
      "Disconnect the mobile host from Codex App settings if the wrong account, workspace, or device is paired.",
    verificationCommands: [
      "Confirm the Mac host appears in ChatGPT mobile Codex.",
      "Confirm same ChatGPT account and workspace on Mac and phone.",
      "Confirm Codex App remains open and the Mac stays online/awake."
    ],
    stopRule: "Stop if QR, MFA, passkey, account, or workspace checks do not match."
  },
  {
    id: "gate-telegram-line-target-token",
    gate: "Gate 2",
    title: "Telegram/LINE Recipient And Token Setup",
    risk: "high",
    target: "Confirmed Telegram or LINE test recipient only",
    approvalPhrase:
      "Approve Gate 2: rotate or confirm messaging credentials, discover the confirmed test recipient, and run one smoke send to that recipient only.",
    action:
      "Prepare Telegram/LINE delivery only after token rotation/confirmation, recipient discovery, and allowed-recipient policy are explicit.",
    rollback:
      "Disable role messaging, remove the bad target metadata, and rotate/revoke the credential if discovery or smoke send fails.",
    verificationCommands: [
      "Confirm the intended Telegram recipient has messaged the bot or added the bot to the intended chat.",
      "Confirm LINE OA channel, webhook target, and signature verification before any LINE send.",
      "Inspect incoming metadata without printing token values.",
      "Run one smoke send only after the exact recipient is confirmed."
    ],
    stopRule:
      "Stop if target is a bot username, hidden registration id, stale chat id, unverified LINE webhook, or if token rotation is not complete."
  },
  {
    id: "gate-solis-readonly-telemetry",
    gate: "Gate 3",
    title: "Solis API Consent And Read-Only Telemetry",
    risk: "high",
    target: "Customer-approved SolisCloud station/inverter telemetry in read-only mode",
    approvalPhrase:
      "Approve Gate 3: configure Solis read-only telemetry smoke with approved customer consent, credential storage path, and station mapping.",
    action:
      "Run read-only Solis telemetry smoke after consent, credentials, station mapping, kill switch, and audit path exist.",
    rollback:
      "Remove local telemetry config, keep the control adapter disabled, and mark the station mapping invalid if consent or mapping is wrong.",
    verificationCommands: [
      "Confirm written customer/site consent.",
      "Confirm credential storage path without printing credentials.",
      "Confirm SolisCloud station, inverter, logger, meter, and customer/site mapping.",
      "Fetch read-only station/inverter metadata, telemetry snapshot, and alarm state.",
      "Verify no control, schedule, export-limit, battery dispatch, or load command was sent."
    ],
    stopRule:
      "Stop if customer consent, credential storage path, station mapping, alarm status, or engineer signoff is missing."
  },
  {
    id: "gate-cloudflare-bot-management-review",
    gate: "Gate 4",
    title: "Cloudflare Bot Management Official Review",
    risk: "high",
    target: "sirinx.co Cloudflare zone security settings for public marketing routes",
    approvalPhrase:
      "Approve Gate 4: review Cloudflare Bot Management/JavaScript Detections settings for sirinx.co without weakening admin, API, auth, webhook, or telemetry routes.",
    action:
      "Review official Cloudflare Bot Management, JavaScript Detections, WAF rules, and security events to decide whether to replace the current CSP mitigation with a cleaner reversible rule.",
    rollback:
      "Keep the current CSP mitigation until an official rule is tested. Revert any dashboard/API security rule if public routes or protected internal routes regress.",
    verificationCommands: [
      "Confirm current live CSP header still allows deployed /assets/ scripts.",
      "Confirm public pages do not load /cdn-cgi/challenge-platform/scripts/jsd/main.js.",
      "Confirm admin/API/auth/webhook/telemetry routes are not loosened.",
      "Run live Lighthouse and browser smoke after any official rule change."
    ],
    stopRule:
      "Stop before changing Bot Management, WAF, DNS, route, Access, or security settings unless the exact rule, target paths, and rollback path are recorded."
  }
];

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function packetSummary(items) {
  return {
    packets: items.length,
    highRisk: items.filter((item) => item.risk === "high").length,
    mediumRisk: items.filter((item) => item.risk === "medium").length,
    canExecuteNow: 0,
    externalWrites: false
  };
}

export function getExternalGatePackets() {
  return {
    title: "SIRINX current external gate approval packets",
    mode: "local-approval-phrase-generator",
    status: "ready-local-packets",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteNow: false,
    packetTargetRoot: packetRoot,
    summary: packetSummary(packets),
    packets: packets.map((packet) => ({
      ...packet,
      canExecuteNow: false,
      externalWrites: false,
      requiresExactApprovalPhrase: true,
      requiresTargetedRollback: true,
      requiresVerification: true
    })),
    nextActions: [
      "Run Gate 1 manually first because mobile approval/review improves every later gate.",
      "Do not treat broad approval as permission for external writes.",
      "Move one gate at a time only after the exact target, verification loop, and stop rule are visible."
    ],
    updatedAt: new Date().toISOString()
  };
}

function buildExternalGatePacketFile(packetSet) {
  return `---
title: "SIRINX Current External Gate Approval Packets"
created: ${new Date().toISOString()}
status: ${packetSet.status}
system: SIRINX
generated_by: sirinx-external-gate-packet-writer
external_writes: false
can_execute_now: false
packet_count: ${packetSet.summary.packets}
high_risk_packets: ${packetSet.summary.highRisk}
---

# SIRINX Current External Gate Approval Packets

## Summary

- Status: ${packetSet.status}
- Packets: ${packetSet.summary.packets}
- High risk packets: ${packetSet.summary.highRisk}
- Can execute now: ${packetSet.canExecuteNow}
- External writes: ${packetSet.externalWrites}

## Packets

${packetSet.packets.map((packet) => `### ${packet.gate}: ${packet.title}

- Target: ${packet.target}
- Risk: ${packet.risk}
- Can execute now: ${packet.canExecuteNow}
- Approval phrase:

\`\`\`text
${packet.approvalPhrase}
\`\`\`

- Action: ${packet.action}
- Rollback: ${packet.rollback}
- Verification:
${packet.verificationCommands.map((command) => `  - ${command}`).join("\n")}
- Stop rule: ${packet.stopRule}
`).join("\n")}

## Guardrail

This packet file is local evidence only. It is not approval to push, deploy, mutate Cloudflare, create keys, inspect secrets, write Supabase, send Telegram/LINE, call Solis, or write to any external SaaS.
`;
}

export async function writeExternalGatePackets(options = {}) {
  const packetSet = getExternalGatePackets();
  const stamp = timestampForFile();
  const targetPath = `${packetRoot}/SIRINX Current External Gate Approval Packets ${stamp}.md`;
  const content = buildExternalGatePacketFile(packetSet);
  const payload = {
    title: "SIRINX current external gate packet writer",
    mode: "local-file-write-gated",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: packetRoot,
    targetPath,
    didWrite: false,
    dryRun: Boolean(options.dryRun),
    requiresConfirmLocalWrite: true,
    status: "pending-confirmation",
    canExecuteNow: false,
    updatedAt: new Date().toISOString()
  };

  if (options.dryRun) {
    return {
      ...payload,
      status: "dry-run-ready",
      wouldWrite: true,
      byteLength: content.length
    };
  }

  if (options.confirmLocalWrite !== true) {
    return {
      ...payload,
      status: "blocked-confirm-local-write-required",
      wouldWrite: false,
      reason: "Set confirmLocalWrite=true to write a local Obsidian external gate packet file."
    };
  }

  await mkdir(packetRoot, { recursive: true });
  await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });

  return {
    ...payload,
    status: "written-local",
    didWrite: true,
    byteLength: content.length
  };
}
