import type { CommercialQuotation } from "../domain/quotation.js";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[
      char
    ];
  });
}

export function renderQuotationDocument(quote: CommercialQuotation): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(quote.quotationNo)} - ${escapeHtml(quote.projectName)}</title>
    <style>
      body { margin: 0; color: #17211d; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(1080px, calc(100vw - 36px)); margin: 0 auto; padding: 30px 0 48px; }
      header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #17211d; padding-bottom: 18px; }
      h1 { margin: 0; font-size: 2rem; }
      h2 { margin-top: 28px; font-size: 1rem; text-transform: uppercase; color: #245b91; }
      p { margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border-bottom: 1px solid #d9ded8; padding: 10px 8px; text-align: left; vertical-align: top; font-size: 0.88rem; }
      th { color: #245b91; font-size: 0.76rem; text-transform: uppercase; }
      .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
      .metric { border: 1px solid #d9ded8; border-radius: 8px; padding: 12px; }
      .metric span { display: block; color: #5b6760; font-size: 0.78rem; }
      .metric strong { display: block; font-size: 1.15rem; }
      .right { text-align: right; }
      .print { margin-top: 18px; min-height: 38px; border: 1px solid #b9c8bd; border-radius: 8px; background: #eef7f1; color: #1d7a4f; font-weight: 800; padding: 0 12px; cursor: pointer; }
      @media print { .print { display: none; } main { width: auto; padding: 0; } }
      @media (max-width: 760px) { header, .summary { grid-template-columns: 1fr; display: grid; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <section>
          <p>SIRINX Solar Intelligence</p>
          <h1>Commercial Quotation</h1>
          <p>${escapeHtml(quote.projectName)}</p>
        </section>
        <section>
          <p><strong>${escapeHtml(quote.quotationNo)}</strong></p>
          <p>Generated: ${escapeHtml(quote.generatedAt)}</p>
          <p>Valid: ${quote.validityDays} days</p>
        </section>
      </header>

      <section class="summary">
        <article class="metric"><span>Subtotal</span><strong>THB ${money(quote.subtotalThb)}</strong></article>
        <article class="metric"><span>Margin</span><strong>THB ${money(quote.marginThb)}</strong></article>
        <article class="metric"><span>Discount</span><strong>THB ${money(quote.discountThb)}</strong></article>
        <article class="metric"><span>VAT</span><strong>THB ${money(quote.vatThb)}</strong></article>
        <article class="metric"><span>Grand Total</span><strong>THB ${money(quote.grandTotalThb)}</strong></article>
      </section>

      <h2>Customer</h2>
      <p>${escapeHtml(quote.customerName)} / ${escapeHtml(quote.companyName)}</p>

      <h2>BOQ</h2>
      <table>
        <thead><tr><th>Section</th><th>Description</th><th class="right">Qty</th><th>Unit</th><th class="right">Unit Price</th><th class="right">Total</th><th>Notes</th></tr></thead>
        <tbody>
          ${quote.lines
            .map(
              (line) =>
                `<tr><td>${escapeHtml(line.section)}</td><td>${escapeHtml(line.description)}</td><td class="right">${line.quantity}</td><td>${escapeHtml(line.unit)}</td><td class="right">THB ${money(line.unitPriceThb)}</td><td class="right">THB ${money(line.totalThb)}</td><td>${escapeHtml(line.notes)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>

      <h2>Assumptions</h2>
      <ul>${quote.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h2>Exclusions</h2>
      <ul>${quote.exclusions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h2>Payment Terms</h2>
      <ul>${quote.paymentTerms.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <h2>Delivery Milestones</h2>
      <ul>${quote.deliveryMilestones.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

      <button class="print" onclick="window.print()">Print / Save PDF</button>
    </main>
  </body>
</html>`;
}
