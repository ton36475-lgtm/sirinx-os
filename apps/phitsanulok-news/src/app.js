const stories = [
  {
    id: "city-brief-001",
    category: "เมือง",
    title: "เทศบาลเปิดรอบรับฟังความเห็นพื้นที่สาธารณะใหม่",
    summary: "ทีมข่าวเตรียมสรุปประเด็นจากแหล่งข้อมูลสาธารณะและรอ editor ตรวจชื่อหน่วยงานก่อนเผยแพร่",
    district: "เมืองพิษณุโลก",
    status: "editor_review"
  },
  {
    id: "food-culture-001",
    category: "วัฒนธรรม",
    title: "ตลาดเช้าชุมชนเก่าเพิ่มโซนอาหารพื้นถิ่นช่วงสุดสัปดาห์",
    summary: "เหมาะสำหรับคอนเทนต์เชิงท่องเที่ยวและพาร์ตเนอร์ร้านค้า โดยต้องแยกข่าวกับโฆษณาให้ชัด",
    district: "วัดจันทร์",
    status: "draft"
  },
  {
    id: "business-watch-001",
    category: "ธุรกิจท้องถิ่น",
    title: "ร้านบริการท้องถิ่นเริ่มใช้ระบบจองคิวผ่าน LINE OA",
    summary: "ใช้เป็นเคส automation สำหรับธุรกิจในจังหวัด โดยไม่เก็บข้อมูลลูกค้าจริงใน MVP นี้",
    district: "อรัญญิก",
    status: "draft"
  }
];

const pipeline = [
  { label: "Source intake", value: "6", note: "public notes only" },
  { label: "Editorial review", value: "3", note: "fact/name checks" },
  { label: "FB draft queue", value: "2", note: "owner approval required" },
  { label: "Partner leads", value: "4", note: "no live outreach" }
];

const partners = [
  { name: "Local Cafe Slot", type: "sponsored guide", gate: "rate card review" },
  { name: "Community Event Slot", type: "public event", gate: "source confirmation" },
  { name: "SME Automation Slot", type: "business story", gate: "ad disclosure check" }
];

function createFacebookDraft(story) {
  return {
    channel: "facebook",
    status: "draft_only",
    liveSend: false,
    ownerApprovalRequired: true,
    text: [
      `พิษณุโลกวันนี้: ${story.title}`,
      "",
      story.summary,
      "",
      `พื้นที่: ${story.district}`,
      "#PhitsanulokUnitedNews #ข่าวพิษณุโลก"
    ].join("\n")
  };
}

function checkLivePublishGate(request) {
  if (request.liveSend === true) {
    return {
      status: "BLOCKED",
      reason: "Live Facebook posting is blocked until owner approval gate is confirmed.",
      safeFallback: "draft_only_preview"
    };
  }
  return { status: "PASS", mode: "draft_only", liveSend: false };
}

function renderStories() {
  const grid = document.querySelector("#newsGrid");
  grid.innerHTML = stories.map((story) => `
    <article class="news-card">
      <h3>${story.title}</h3>
      <p>${story.summary}</p>
      <div class="tag-row">
        <span class="tag">${story.category}</span>
        <span class="tag">${story.district}</span>
        <span class="tag">${story.status}</span>
      </div>
    </article>
  `).join("");
}

function renderDraft() {
  const draft = createFacebookDraft(stories[0]);
  document.querySelector("#facebookDraft").textContent = draft.text;
  document.querySelector("#gateResult").textContent = JSON.stringify(
    checkLivePublishGate({ liveSend: true }),
    null,
    2
  );
}

function renderAdmin() {
  document.querySelector("#adminCards").innerHTML = pipeline.map((item) => `
    <article class="metric-card">
      <strong>${item.value} ${item.label}</strong>
      <span>${item.note}</span>
    </article>
  `).join("");
}

function renderPartners() {
  document.querySelector("#partnerList").innerHTML = partners.map((partner) => `
    <article class="partner-card">
      <strong>${partner.name}</strong>
      <p>${partner.type}</p>
      <span class="tag">${partner.gate}</span>
    </article>
  `).join("");
}

document.querySelector("#copyDraftButton").addEventListener("click", () => {
  const draft = createFacebookDraft(stories[0]);
  document.querySelector("#facebookDraft").textContent = `${draft.text}\n\nStatus: draft saved locally. Owner review is required.`;
});

renderStories();
renderDraft();
renderAdmin();
renderPartners();
