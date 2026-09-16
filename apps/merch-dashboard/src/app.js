const pipeline = [
  ["Niche research", "Score demand, buyer intent, seasonality, and reusable asset potential."],
  ["IP guardian", "Classify trademark, copyright, celebrity, sports, and brand-confusion risk."],
  ["Creative brief", "Draft original design families and product-fit notes."],
  ["Listing draft", "Prepare owner-review title, bullets, description, and keywords."],
  ["QC review", "Check spelling, contrast, placement, file readiness, and duplicate patterns."],
  ["Manual traffic plan", "Prepare draft content only, with no fake engagement or auto-send."]
];

const sheetTables = [
  "niches",
  "design_pipeline",
  "ip_policy_checks",
  "listing_drafts",
  "qc_reviews",
  "traffic_content",
  "sales_analytics"
];

const qcChecks = [
  "Original artwork only",
  "No protected character or brand confusion",
  "Transparent background where required",
  "Correct DPI and export dimensions",
  "Spelling and phrase readability checked",
  "Thumbnail readability checked",
  "Color contrast checked",
  "Placement and scale checked",
  "No keyword stuffing",
  "Owner action required before publish"
];

const calendar = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const phase =
    day <= 7 ? "Foundation" : day <= 18 ? "Production" : day <= 24 ? "Review" : "Iteration";
  const focus =
    phase === "Foundation"
      ? "niche scoring and schema setup"
      : phase === "Production"
        ? "design briefs and listing drafts"
        : phase === "Review"
          ? "QC and owner review queue"
          : "analytics review and next batch planning";
  return { day, phase, focus };
});

function renderCards(target, items, className) {
  const root = document.querySelector(target);
  if (!root) return;
  root.innerHTML = items
    .map(([title, description]) => `<article class="${className}"><strong>${title}</strong><span>${description}</span></article>`)
    .join("");
}

renderCards("#pipeline", pipeline, "step");
renderCards("#qc-list", qcChecks.map((item) => [item, "Manual pass required"]), "check");

document.querySelector("#sheet-schema").innerHTML = sheetTables.map((table) => `<li>${table}</li>`).join("");
document.querySelector("#airtable-schema").innerHTML = sheetTables
  .map((table) => `<li>${table}: manual import table</li>`)
  .join("");
document.querySelector("#calendar").innerHTML = calendar
  .map((item) => `<article class="day"><strong>Day ${item.day}</strong><span>${item.phase}: ${item.focus}</span></article>`)
  .join("");
