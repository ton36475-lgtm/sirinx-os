import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");
const configPath = "apps/sirinx-site/src/config/lineOfficial.json";
const reportPath = "docs/website/SIRINX_WEBSITE_LINE_QR_LINK_RECHECK_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json";

const closedGates = [
  "deploy",
  "push",
  "line_webhook",
  "production_analytics",
  "crm_customer_data_storage",
  "customer_data_collection",
  "external_message_send",
  "provider_call",
  "paid_provider_call",
  "public_tunnel",
  "package_install",
  "production_mutation",
  "database_write_or_migration",
  "secret_or_env_read"
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function nowBangkok() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .formatToParts(new Date())
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+0700`;
}

export function inspectPng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const isPng =
    bytes.length >= 24 &&
    signature.every((expected, index) => bytes[index] === expected) &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    is_png: isPng,
    width: isPng ? view.getUint32(16) : 0,
    height: isPng ? view.getUint32(20) : 0,
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

function normalizeHeaderValue(value) {
  return value || "";
}

async function fetchQrAsset(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "sirinx-local-review"
    }
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const image = inspectPng(bytes);

  return {
    url,
    status: response.status,
    content_type: normalizeHeaderValue(response.headers.get("content-type")),
    content_length: normalizeHeaderValue(response.headers.get("content-length")),
    ...image
  };
}

async function fetchLink(url) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": "sirinx-local-review"
    }
  });

  return {
    url,
    status: response.status,
    location: normalizeHeaderValue(response.headers.get("location")),
    content_type: normalizeHeaderValue(response.headers.get("content-type")),
    content_length: normalizeHeaderValue(response.headers.get("content-length"))
  };
}

function linkIsAcceptable(name, link) {
  if (name === "shortLink") {
    return link.status >= 300 && link.status < 400 && /line\.me\/R\/ti\/p\/@304zrttj/.test(link.location);
  }

  if (name === "addFriendUrl") {
    return link.status === 200 && /text\/html/i.test(link.content_type);
  }

  if (name === "chatUrl") {
    return (
      link.status === 200 ||
      (link.status >= 300 && link.status < 400 && (link.location === "/" || /line\.me/i.test(link.location)))
    );
  }

  return false;
}

export function createLineQrLinkRecheckPacket({ createdAt, lineConfig, qrAsset, links }) {
  const linkResults = Object.fromEntries(
    Object.entries(links).map(([name, link]) => [
      name,
      {
        ...link,
        acceptable_read_only_response: linkIsAcceptable(name, link)
      }
    ])
  );
  const qrOk = qrAsset.status === 200 && qrAsset.is_png && qrAsset.width >= 300 && qrAsset.height >= 300;
  const linksOk = Object.values(linkResults).every((link) => link.acceptable_read_only_response);
  const status =
    qrOk && linksOk
      ? "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN"
      : "LINE_QR_LINK_RECHECK_REQUIRES_ATTENTION";

  return {
    packet_id: "packet_066_sirinx_website_line_qr_link_recheck",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_read_only_line_qr_link_recheck_no_message_send",
    scope: "apps/sirinx-site",
    status,
    line_official: {
      display_name: lineConfig.displayName,
      basic_id: lineConfig.basicId,
      premium_id_target: lineConfig.premiumIdTarget,
      short_link: lineConfig.shortLink,
      add_friend_url: lineConfig.addFriendUrl,
      chat_url: lineConfig.chatUrl,
      qr_image_url: lineConfig.qrImageUrl
    },
    qr_asset: {
      ...qrAsset,
      acceptable_for_local_review: qrOk
    },
    link_results: linkResults,
    manual_evidence_still_required: [
      "real_device_qr_scan",
      "confirm_LINE_account_display_name_on_phone",
      "confirm_add_friend_or_chat_path_on_real_device"
    ],
    decision: {
      completion_claim_allowed: false,
      real_device_scan_proven: false,
      deploy_gate: "BLOCKED_FOR_DEPLOY",
      push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL"
    },
    closed_gates: Object.fromEntries(closedGates.map((gate) => [gate, "blocked"])),
    report: reportPath,
    next_safe_action:
      "Scan the QR on a real device and confirm it opens SIRINX โซล่าเซลล์ before any deploy approval."
  };
}

function renderReport(packet) {
  const linkRows = Object.entries(packet.link_results)
    .map(
      ([name, link]) =>
        `| ${name} | ${link.status} | ${link.location || "-"} | ${link.acceptable_read_only_response ? "yes" : "no"} |`
    )
    .join("\n");

  return `# SIRINX Website LINE QR Link Recheck

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Deploy: not run
Push: not run
External message send: not run
LINE webhook: not activated

## Purpose

This packet verifies the LINE Official QR image and public LINE links in read-only mode. It reduces pre-review risk, but it does not replace a real-device QR scan.

## LINE Official Data

- Display name: ${packet.line_official.display_name}
- Basic ID: \`${packet.line_official.basic_id}\`
- Short link: \`${packet.line_official.short_link}\`
- Add Friend URL: \`${packet.line_official.add_friend_url}\`
- Chat URL: \`${packet.line_official.chat_url}\`
- QR image URL: \`${packet.line_official.qr_image_url}\`

## QR Asset

- HTTP status: ${packet.qr_asset.status}
- PNG signature: ${packet.qr_asset.is_png ? "valid" : "invalid"}
- Width: ${packet.qr_asset.width}
- Height: ${packet.qr_asset.height}
- Bytes: ${packet.qr_asset.bytes}
- SHA-256: \`${packet.qr_asset.sha256}\`
- Acceptable for local review: ${packet.qr_asset.acceptable_for_local_review ? "yes" : "no"}

## Link Responses

| Link | HTTP status | Location | Acceptable read-only response |
| --- | --- | --- | --- |
${linkRows}

## Manual Evidence Still Required

${packet.manual_evidence_still_required.map((item) => `- ${item}`).join("\n")}

## Closed Gates

${Object.entries(packet.closed_gates).map(([gate, state]) => `- ${gate}: ${state}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This recheck does not prove the QR was scanned on a real phone and does not grant deploy approval.
`;
}

export async function runLineQrLinkRecheck({ write = true } = {}) {
  const lineConfig = JSON.parse(await readFile(resolve(repoRoot, configPath), "utf8"));
  const [qrAsset, shortLink, addFriendUrl, chatUrl] = await Promise.all([
    fetchQrAsset(lineConfig.qrImageUrl),
    fetchLink(lineConfig.shortLink),
    fetchLink(lineConfig.addFriendUrl),
    fetchLink(lineConfig.chatUrl)
  ]);
  const packet = createLineQrLinkRecheckPacket({
    createdAt: nowBangkok(),
    lineConfig,
    qrAsset,
    links: {
      shortLink,
      addFriendUrl,
      chatUrl
    }
  });

  if (write) {
    await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
    await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
    await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
    await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  }

  return packet;
}

export async function writeLineQrLinkRecheck() {
  return runLineQrLinkRecheck({ write: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await runLineQrLinkRecheck({ write: !process.argv.includes("--dry-run") });
  console.log(JSON.stringify(packet, null, 2));
}
