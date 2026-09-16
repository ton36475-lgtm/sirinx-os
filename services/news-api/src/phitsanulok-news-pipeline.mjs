export const PHITSANULOK_NEWS_CHANNELS = [
  "public_site",
  "admin_dashboard",
  "partner_panel",
  "facebook_draft"
];

export const seedNewsItems = [
  {
    id: "plk-city-brief-001",
    title: "เทศบาลเปิดรอบรับฟังความเห็นพื้นที่สาธารณะใหม่",
    category: "city",
    district: "เมืองพิษณุโลก",
    sourceType: "public_note",
    verificationStatus: "editor_review",
    summary: "สรุปประเด็นจากข้อมูลสาธารณะก่อนเผยแพร่ พร้อมตรวจชื่อหน่วยงานและวันเวลาอีกครั้ง"
  },
  {
    id: "plk-culture-001",
    title: "ตลาดเช้าชุมชนเก่าเพิ่มโซนอาหารพื้นถิ่นช่วงสุดสัปดาห์",
    category: "culture",
    district: "วัดจันทร์",
    sourceType: "public_note",
    verificationStatus: "draft",
    summary: "คอนเทนต์แนวท่องเที่ยวท้องถิ่นที่ต้องแยกข่าวกับพื้นที่โฆษณาให้ชัด"
  },
  {
    id: "plk-business-001",
    title: "ร้านบริการท้องถิ่นเริ่มใช้ระบบจองคิวผ่าน LINE OA",
    category: "business",
    district: "อรัญญิก",
    sourceType: "public_note",
    verificationStatus: "draft",
    summary: "เคส automation สำหรับธุรกิจในจังหวัด โดย MVP นี้ไม่เก็บข้อมูลลูกค้าจริง"
  }
];

export function createDailyContentPacket(options = {}) {
  const date = options.date || "2026-07-03";
  const items = options.items || seedNewsItems;
  return {
    project: "phitsanulok-united-news",
    date,
    status: "draft_only",
    externalPublishing: "blocked_until_owner_gate",
    contentCards: items.map((item, index) => ({
      ...item,
      rank: index + 1,
      outputTargets: ["public_site", "facebook_draft", "admin_dashboard"],
      requiredChecks: ["source_name_check", "public_info_only", "owner_review"]
    })),
    pipeline: [
      "source_intake_public_only",
      "editorial_review",
      "facebook_draft_generation",
      "admin_dashboard_queue",
      "owner_approval_gate"
    ]
  };
}

export function createFacebookDraft(newsItem) {
  if (!newsItem?.title || !newsItem?.summary) {
    throw new Error("news_item_requires_title_and_summary");
  }

  return {
    channel: "facebook",
    status: "draft_only",
    liveSend: false,
    ownerApprovalRequired: true,
    sourceType: newsItem.sourceType || "public_note",
    text: [
      `พิษณุโลกวันนี้: ${newsItem.title}`,
      "",
      newsItem.summary,
      "",
      `พื้นที่: ${newsItem.district || "พิษณุโลก"}`,
      "#PhitsanulokUnitedNews #ข่าวพิษณุโลก"
    ].join("\n")
  };
}

export function checkFacebookPublishGate(request = {}) {
  const wantsLiveSend = request.liveSend === true || request.mode === "live_publish";
  if (wantsLiveSend) {
    return {
      status: "BLOCKED",
      reason: "live_facebook_post_requires_explicit_owner_gate",
      safeFallback: "facebook_draft_only",
      liveSend: false
    };
  }

  return {
    status: "PASS",
    mode: "draft_only",
    liveSend: false
  };
}

export function createAdminDashboardSnapshot(packet = createDailyContentPacket()) {
  const pendingReview = packet.contentCards.filter((card) => card.verificationStatus !== "verified").length;
  return {
    status: "local_preview",
    pendingReview,
    draftCount: packet.contentCards.length,
    blockedLiveActions: ["facebook_live_post", "customer_data_ingestion", "partner_outreach_send"],
    nextActions: [
      "confirm source names",
      "select top daily story",
      "owner review for Facebook draft",
      "label partner content before public use"
    ]
  };
}

export function createPartnerPanelSnapshot() {
  return {
    status: "stub_only",
    liveOutreach: false,
    slots: [
      { id: "partner-cafe", label: "Local Cafe Slot", gate: "rate_card_review" },
      { id: "partner-event", label: "Community Event Slot", gate: "source_confirmation" },
      { id: "partner-sme", label: "SME Automation Slot", gate: "ad_disclosure_check" }
    ]
  };
}

export function runPhitsanulokNewsDryRun(options = {}) {
  const packet = createDailyContentPacket(options);
  const draft = createFacebookDraft(packet.contentCards[0]);
  const liveGate = checkFacebookPublishGate({ liveSend: true });
  return {
    status: liveGate.status === "BLOCKED" && draft.liveSend === false ? "PASS" : "FAIL",
    packet,
    draft,
    liveGate,
    admin: createAdminDashboardSnapshot(packet),
    partners: createPartnerPanelSnapshot()
  };
}
