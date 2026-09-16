const form = document.querySelector("#quote-form");
const total = document.querySelector("#estimate-total");
const note = document.querySelector("#estimate-note");

const money = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0
});

function estimateBudget() {
  if (!form || !total || !note) return;
  const data = new FormData(form);
  const days = Number(data.get("days") || 1);
  const guests = Number(data.get("guests") || 0);
  const wreaths = Number(data.get("wreaths") || 0);
  const vans = Number(data.get("vans") || 0);
  const catering = String(data.get("catering") || "simple");

  const cateringRate = { simple: 120, standard: 220, extended: 360 }[catering] ?? 120;
  const base = 18000;
  const ceremony = days * 8500;
  const cateringEstimate = guests * cateringRate;
  const wreathEstimate = wreaths * 1500;
  const vanEstimate = vans * 3200;
  const low = base + ceremony + cateringEstimate + wreathEstimate + vanEstimate;
  const high = Math.round(low * 1.22);

  total.textContent = `${money.format(low)} - ${money.format(high)}`;
  note.textContent = "Estimate only. Owner review is required before any quote, booking, dispatch, or payment step.";
}

form?.addEventListener("input", estimateBudget);
estimateBudget();
