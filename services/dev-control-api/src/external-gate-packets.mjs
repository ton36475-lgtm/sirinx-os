import { mkdir, writeFile } from "node:fs/promises";

const packetRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Approval Packets";

const packets = [
  {
    id: "gate-1-github-pr-push",
    gate: "Gate 1",
    title: "GitHub Push And PR Update",
    risk: "medium",
    target: "ton36475-lgtm/sirinx PR #1, branch codex/public-website-production-ready-20260517",
    approvalPhrase: "Approve Gate 1: push public website branch codex/public-website-production-ready-20260517 to origin for PR #1.",
    action: "Push the approved public website branch to origin and inspect PR #1 metadata.",
    rollback: "No force push. If the push is wrong, stop and prepare a revert commit or close/update PR after review.",
    verificationCommands: [
      "git status --short --branch",
      "git push origin codex/public-website-production-ready-20260517",
      "gh pr view 1 --json number,title,url,isDraft,headRefName,baseRefName,commits"
    ],
    stopRule: "Stop if local status is dirty, remote rejects, or PR target is not ton36475-lgtm/sirinx PR #1."
  },
  {
    id: "gate-2-coderabbit-review",
    gate: "Gate 2",
    title: "CodeRabbit Review And Autofix",
    risk: "medium",
    target: "GitHub PR #1 review threads only",
    approvalPhrase: "Approve Gate 2: inspect CodeRabbit review threads for PR #1 only. Do not apply any fix without showing the proposed diff first.",
    action: "Inspect unresolved CodeRabbit review threads and validate each issue locally before proposing edits.",
    rollback: "Keep changes local until reviewed; revert only self-made autofix edits if a proposed fix fails validation.",
    verificationCommands: [
      "gh pr view 1 --json number,title,url,reviewDecision",
      "gh api graphql -f query='<review-thread query scoped to PR #1>'",
      "git diff --check"
    ],
    stopRule: "Stop if CodeRabbit review is still in progress or the branch has unpushed commits not reviewed by CodeRabbit."
  },
  {
    id: "gate-3a-cloudflare-preview",
    gate: "Gate 3A",
    title: "Cloudflare Preview Only",
    risk: "high",
    target: "Cloudflare Pages preview for PR #1 /home-solution only",
    approvalPhrase: "Approve Gate 3A: create Cloudflare preview for PR #1 /home-solution only. Do not promote to production.",
    action: "Create or inspect a preview deployment without production promotion.",
    rollback: "Delete or ignore failed preview; do not alter production routes, DNS, or custom domains.",
    verificationCommands: [
      "pnpm --filter @sirinx/site build",
      "wrangler pages deployment list --project-name sirinx-co",
      "curl -I <preview-url>/home-solution/"
    ],
    stopRule: "Stop if preview changes homepage graphics, creates route loops, has asset 404s, or requires DNS/route mutation."
  },
  {
    id: "gate-3b-cloudflare-production",
    gate: "Gate 3B",
    title: "Cloudflare Production Deploy",
    risk: "high",
    target: "www.sirinx.co production deployment",
    approvalPhrase: "Approve Gate 3B: deploy approved public website build to www.sirinx.co with rollback target recorded.",
    action: "Deploy approved public website build to production and run production smoke checks.",
    rollback: "Record previous deployment URL first; roll back or stop if homepage, redirects, assets, sitemap, or lead route regress.",
    verificationCommands: [
      "pnpm --filter @sirinx/site build",
      "wrangler pages deploy <build-dir> --project-name sirinx-co",
      "curl -I https://www.sirinx.co/",
      "curl -I https://www.sirinx.co/home-solution/"
    ],
    stopRule: "Stop and roll back if homepage graphics change, route redirects loop, assets 404, or lead route fails unexpectedly."
  },
  {
    id: "gate-4-codex-mobile-pairing",
    gate: "Gate 4",
    title: "Codex Mobile QR/MFA",
    risk: "medium",
    target: "Codex App host on this Mac and ChatGPT mobile on the user's phone",
    approvalPhrase: "Open Codex App on Mac > Set up Codex mobile > scan QR in ChatGPT mobile > complete MFA/SSO.",
    action: "Human operator pairs mobile as command/review surface while Mac remains execution host.",
    rollback: "Disconnect mobile host from Codex App settings if pairing is wrong.",
    verificationCommands: [
      "Open Codex App and confirm host appears on phone.",
      "Confirm same account/workspace.",
      "Confirm Mac stays online and awake."
    ],
    stopRule: "Do not attempt to bypass QR, MFA, passkey, or workspace checks."
  },
  {
    id: "gate-5-telegram-line-target",
    gate: "Gate 5",
    title: "Telegram/LINE Target Setup",
    risk: "high",
    target: "Confirmed Telegram/LINE test recipient only",
    approvalPhrase: "Approve Gate 5: run one safe Telegram/LINE target discovery and smoke send to the confirmed test recipient only.",
    action: "Discover a real test recipient target and run one safe smoke send only after target confirmation.",
    rollback: "Disable role messaging and remove/replace bad target metadata if smoke fails.",
    verificationCommands: [
      "Confirm bot was messaged or added to intended chat.",
      "Inspect incoming update metadata without printing tokens.",
      "Run one smoke send to confirmed test recipient only."
    ],
    stopRule: "Stop if target is a bot username, hidden registration id, stale chat id, or unverified LINE webhook."
  },
  {
    id: "gate-6-openai-key",
    gate: "Gate 6",
    title: "OpenAI API Key For Hermes/thClaws",
    risk: "high",
    target: "/Users/sirinx/sirinx-os/.env.local OPENAI_API_KEY",
    approvalPhrase: "Yes, create the OpenAI API key named SIRINX Hermes thClaws Codex and save it to /Users/sirinx/sirinx-os/.env.local as OPENAI_API_KEY.",
    action: "Create and store an OpenAI API key through the secure Codex/OpenAI key flow.",
    rollback: "Revoke the created key and remove local .env.local entry if target or scope is wrong.",
    verificationCommands: [
      "Confirm .env.local is untracked/ignored.",
      "Confirm key value is never printed.",
      "Run only metadata/safe configuration checks."
    ],
    stopRule: "Do not create or write a key from broad approval wording; this gate requires the exact key decision."
  },
  {
    id: "gate-7-supabase-schema-draft",
    gate: "Gate 7",
    title: "Supabase/Postgres Schema Work",
    risk: "high",
    target: "Supabase schema/config read-only inspection and local migration plan",
    approvalPhrase: "Approve Gate 7: inspect Supabase schema/config read-only and draft a migration plan. Do not apply migrations.",
    action: "Inspect schema/config read-only and draft a migration/RLS/index/rollback plan.",
    rollback: "No database mutation is allowed in this gate; discard local draft if scope is wrong.",
    verificationCommands: [
      "Inspect schema/config read-only.",
      "Draft migration and rollback plan locally.",
      "Run syntax/static review only."
    ],
    stopRule: "Stop before any migration, seed, data write, or RLS policy mutation."
  },
  {
    id: "gate-8-solis-readonly-telemetry",
    gate: "Gate 8",
    title: "Solis Read-Only Telemetry",
    risk: "high",
    target: "Customer-approved Solis inverter read-only telemetry smoke",
    approvalPhrase: "Approve Gate 8: configure Solis read-only telemetry smoke with approved customer consent and credential storage.",
    action: "Run read-only telemetry smoke after consent, credentials, and station mapping are approved.",
    rollback: "Remove local telemetry config and keep control path disabled if station mapping or consent is wrong.",
    verificationCommands: [
      "Confirm written customer consent.",
      "Confirm credential storage path without printing credentials.",
      "Run read-only telemetry smoke.",
      "Verify no control, schedule, export limit, or load command was sent."
    ],
    stopRule: "Stop if credentials, station mapping, consent, or engineer signoff is missing."
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
    title: "SIRINX external gate approval packets",
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
      "Use these phrases only for the specific external gate target.",
      "Do not treat broad approval as permission for external writes.",
      "Record verification output and stop-rule result before any follow-up gate."
    ],
    updatedAt: new Date().toISOString()
  };
}

function buildExternalGatePacketFile(packetSet) {
  return `---
title: "SIRINX External Gate Approval Packets"
created: ${new Date().toISOString()}
status: ${packetSet.status}
system: SIRINX
generated_by: sirinx-external-gate-packet-writer
external_writes: false
can_execute_now: false
packet_count: ${packetSet.summary.packets}
high_risk_packets: ${packetSet.summary.highRisk}
---

# SIRINX External Gate Approval Packets

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
  const targetPath = `${packetRoot}/SIRINX External Gate Approval Packets ${stamp}.md`;
  const content = buildExternalGatePacketFile(packetSet);
  const payload = {
    title: "SIRINX external gate packet writer",
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
