import { buildCompetitorIntelligence, designCommercialBessSystem, generateCommercialQuotation } from "../domain/index.js";
import type { CommercialBessDesign } from "../domain/ci-bess-types.js";
import type { CompetitorIntelligence } from "../domain/competitor-intelligence.js";
import { buildLoadBreakdown, systemSizeBands } from "../domain/load-taxonomy.js";
import type { CommercialQuotation } from "../domain/quotation.js";
import { buildCustomerUsageProfile } from "../domain/usage-profile.js";
import type { Proposal } from "../domain/types.js";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function proposalMetrics(proposal: Proposal): string {
  return `
    <article class="metric"><span>System</span><strong>${proposal.design.mode}</strong><small class="muted">${proposal.design.pvSizeKwp.value} kWp PV</small></article>
    <article class="metric"><span>Inverter</span><strong>${proposal.design.inverter.brand}</strong><small class="muted">${proposal.design.inverter.model}</small></article>
    <article class="metric"><span>Battery</span><strong>${proposal.design.batteryModules?.value ?? 0} module</strong><small class="muted">${proposal.design.batteryUsableKwh?.value ?? 0} usable kWh</small></article>
    <article class="metric"><span>Monthly Savings</span><strong>THB ${money(proposal.roi.monthlySavingsThb.value)}</strong><small class="muted">${proposal.roi.monthlySavingsThb.kind}</small></article>
    <article class="metric"><span>Payback</span><strong>${proposal.roi.simplePaybackYears.value} yrs</strong><small class="muted">simple estimate</small></article>`;
}

function proposalChecks(proposal: Proposal): string {
  return proposal.design.compatibility
    .map(
      (check) => `
        <article class="check ${check.passed ? "pass" : "warn"}">
          <span>${check.passed ? "PASS" : "CHECK"}</span>
          <strong>${check.label}</strong>
          <p>${check.explanation}</p>
        </article>`
    )
    .join("");
}

function proposalBom(proposal: Proposal): string {
  return proposal.billOfMaterials
    .map(
      (item) => `
        <tr>
          <td>${item.item}</td>
          <td>${item.quantity}</td>
          <td>${item.notes}</td>
        </tr>`
    )
    .join("");
}

function proposalCashflow(proposal: Proposal): string {
  return proposal.roi.tenYearCashflowThb
    .map(
      (row) => `
        <tr>
          <td>Year ${row.year}</td>
          <td>THB ${money(row.savings)}</td>
          <td>THB ${money(row.cumulative)}</td>
        </tr>`
    )
    .join("");
}

function ciMetrics(ciBess: CommercialBessDesign): string {
  return `
    <article class="metric"><span>Battery</span><strong>${ciBess.battery.nominalEnergyKwh} kWh</strong><small class="muted">${ciBess.battery.parallelCells}P${ciBess.battery.seriesCells}S LFP</small></article>
    <article class="metric"><span>HVDC</span><strong>${ciBess.nominalDcVoltageV.value} V</strong><small class="muted">${ciBess.battery.operatingVoltageMinVdc}-${ciBess.battery.operatingVoltageMaxVdc} VDC</small></article>
    <article class="metric"><span>PCS</span><strong>${ciBess.pcs.ratedPowerKw} kW</strong><small class="muted">${ciBess.cRateP.value}P C-rate</small></article>
    <article class="metric"><span>STS</span><strong>&lt;=${ciBess.sts.transferTimeMs} ms</strong><small class="muted">${ciBess.transferMeetsRequirement ? "meets target" : "check target"}</small></article>
    <article class="metric"><span>Critical Load</span><strong>${ciBess.project.criticalLoadKw.value} kW</strong><small class="muted">${ciBess.criticalLoadAutonomyHours.value} hr autonomy</small></article>
    <article class="metric"><span>Cooling</span><strong>${ciBess.battery.thermalManagement}</strong><small class="muted">${ciBess.battery.coolant ?? "coolant TBD"}</small></article>`;
}

function ciGates(ciBess: CommercialBessDesign): string {
  return ciBess.commissioningGates
    .map(
      (gate) => `
        <article class="check ${gate.status === "pass" ? "pass" : "warn"}">
          <span>${gate.status}</span>
          <strong>${gate.label}</strong>
          <p>${gate.evidenceRequired}</p>
        </article>`
    )
    .join("");
}

function ciStrategies(ciBess: CommercialBessDesign): string {
  return ciBess.emsStrategies
    .map(
      (strategy) => `
        <article class="flow-step">
          <h3>${strategy.label}</h3>
          <p class="muted">${strategy.explanation}</p>
        </article>`
    )
    .join("");
}

function sizeBandRows(): string {
  return systemSizeBands
    .map(
      (band) => `
        <tr>
          <td>${band.label}</td>
          <td>${band.peakDemandKw}</td>
          <td>${band.pvSizeKwp}</td>
          <td>${band.bessEnergyKwh}</td>
          <td>${band.pcsPowerKw}</td>
        </tr>`
    )
    .join("");
}

function loadBreakdownRows(ciBess: CommercialBessDesign): string {
  return buildLoadBreakdown(ciBess.project).segments
    .map(
      (segment) => `
        <tr>
          <td>${segment.label}</td>
          <td>${segment.priority}</td>
          <td>${segment.behavior}</td>
          <td>${segment.estimatedKw}</td>
          <td>${segment.hoursPerDay}</td>
          <td>${segment.dailyKwh}</td>
          <td>${segment.backupRequired ? "yes" : "no"}</td>
        </tr>`
    )
    .join("");
}

function sizingStepCards(ciBess: CommercialBessDesign): string {
  const breakdown = buildLoadBreakdown(ciBess.project);
  return breakdown.sizingSteps
    .map(
      (item) => `
        <article class="flow-step">
          <h3>${item.step}</h3>
          <p class="muted">${item.explanation}</p>
        </article>`
    )
    .join("");
}

function loadSummary(ciBess: CommercialBessDesign): string {
  const breakdown = buildLoadBreakdown(ciBess.project);
  return `
    <article class="metric"><span>Size Class</span><strong>${breakdown.sizeClass.label}</strong><small class="muted">${breakdown.sizeClass.peakDemandKw}</small></article>
    <article class="metric"><span>Peak Demand</span><strong>${breakdown.totalPeakDemandKw} kW</strong><small class="muted">site maximum</small></article>
    <article class="metric"><span>Critical Load</span><strong>${breakdown.criticalLoadKw} kW</strong><small class="muted">backup boundary</small></article>
    <article class="metric"><span>Daily Energy</span><strong>${breakdown.dailyEnergyKwh} kWh</strong><small class="muted">segment estimate</small></article>
    <article class="metric"><span>Backup Target</span><strong>${breakdown.backupEnergyTargetKwh} kWh</strong><small class="muted">critical load x hours</small></article>`;
}

function quotationMetrics(quote: CommercialQuotation): string {
  return `
    <article class="metric"><span>Quote No.</span><strong>${quote.quotationNo}</strong><small class="muted">${quote.validityDays} days validity</small></article>
    <article class="metric"><span>Subtotal</span><strong>THB ${money(quote.subtotalThb)}</strong><small class="muted">equipment + delivery scope</small></article>
    <article class="metric"><span>Margin</span><strong>THB ${money(quote.marginThb)}</strong><small class="muted">commercial buffer</small></article>
    <article class="metric"><span>VAT</span><strong>THB ${money(quote.vatThb)}</strong><small class="muted">7% when enabled</small></article>
    <article class="metric"><span>Grand Total</span><strong>THB ${money(quote.grandTotalThb)}</strong><small class="muted">${quote.currency}</small></article>`;
}

function quotationRows(quote: CommercialQuotation): string {
  return quote.lines
    .map(
      (line) => `
        <tr>
          <td>${line.section}</td>
          <td>${line.description}</td>
          <td>${line.quantity}</td>
          <td>${line.unit}</td>
          <td>THB ${money(line.unitPriceThb)}</td>
          <td>THB ${money(line.totalThb)}</td>
          <td>${line.notes}</td>
        </tr>`
    )
    .join("");
}

function quotationBullets(items: string[]): string {
  return items.map((item) => `<article class="flow-step"><p class="muted">${item}</p></article>`).join("");
}

function competitorCards(intel: CompetitorIntelligence): string {
  return intel.competitors
    .map(
      (competitor) => `
        <article class="flow-step">
          <h3>${competitor.name}</h3>
          <p class="muted"><strong>${competitor.marketPosition}</strong></p>
          <p class="muted">Offerings: ${competitor.observedOfferings.join(", ")}</p>
          <p class="muted">Gap: ${competitor.gapsToExploit[0]}</p>
          <p class="muted"><a href="${competitor.sourceUrl}" target="_blank" rel="noreferrer">source</a></p>
        </article>`
    )
    .join("");
}

function marketPatternCards(intel: CompetitorIntelligence): string {
  return intel.marketPatterns.map((item) => `<article class="flow-step"><p class="muted">${item}</p></article>`).join("");
}

export function renderPage(proposal: Proposal): string {
  const ciBess = designCommercialBessSystem();
  const usageProfile = buildCustomerUsageProfile({ siteName: ciBess.project.siteName });
  const quotation = generateCommercialQuotation(proposal, ciBess, usageProfile);
  const competitorIntel = buildCompetitorIntelligence();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Solar Energy Intelligence</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #16211d;
        --muted: #5b6760;
        --line: #d9ded8;
        --panel: #ffffff;
        --surface: #f6f8f5;
        --green: #1d7a4f;
        --amber: #9b6717;
        --blue: #245b91;
        --red: #a33b32;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-width: 320px;
        background: var(--surface);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button, input, select { font: inherit; }
      .shell {
        width: min(1240px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 40px;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-end;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--line);
      }
      .eyebrow {
        margin: 0 0 5px;
        color: var(--blue);
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
      }
      h1, h2, h3, p { margin-top: 0; }
      h1 { margin-bottom: 0; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.05; }
      h2 { margin-bottom: 14px; font-size: 1.05rem; }
      h3 { margin-bottom: 6px; font-size: 0.95rem; }
      .status {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 7px 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
        color: var(--green);
        font-weight: 800;
      }
      .summary, .ci-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin: 22px 0;
      }
      .ci-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
        margin-bottom: 14px;
      }
      .metric, .panel, .check, .flow-step {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }
      .metric {
        display: grid;
        gap: 6px;
        min-width: 0;
        padding: 15px;
      }
      .metric span, .muted, td:last-child, .check p, label span {
        color: var(--muted);
        font-size: 0.84rem;
      }
      .metric strong { font-size: 1.35rem; overflow-wrap: anywhere; }
      .layout, .form-layout {
        display: grid;
        grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.2fr);
        gap: 14px;
      }
      .three-column {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }
      .wide { margin-top: 14px; }
      .panel { padding: 16px; }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      label {
        display: grid;
        gap: 5px;
        min-width: 0;
      }
      input, select {
        width: 100%;
        min-height: 38px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
        color: var(--ink);
        padding: 7px 9px;
      }
      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 38px;
        color: var(--muted);
        font-size: 0.9rem;
      }
      .checkbox-row input {
        width: 18px;
        min-height: 18px;
      }
      .flow, .checks {
        display: grid;
        gap: 10px;
      }
      .flow-step {
        padding: 12px;
        border-left: 4px solid var(--blue);
      }
      .checks {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .check { padding: 12px; border-left: 4px solid var(--amber); }
      .check.pass { border-left-color: var(--green); }
      .check span {
        display: inline-block;
        margin-bottom: 5px;
        color: var(--blue);
        font-size: 0.72rem;
        font-weight: 900;
      }
      .check strong, .check p { display: block; margin-bottom: 0; }
      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
      }
      th, td {
        padding: 10px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
        font-size: 0.9rem;
      }
      th { color: var(--blue); font-size: 0.78rem; text-transform: uppercase; }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      button, a.button {
        min-height: 38px;
        padding: 0 12px;
        border: 1px solid #b9c8bd;
        border-radius: 8px;
        background: #eef7f1;
        color: var(--green);
        font: inherit;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
      }
      button.secondary {
        background: #fff;
        color: var(--blue);
      }
      .log {
        min-height: 38px;
        margin-top: 10px;
        color: var(--muted);
        font-size: 0.85rem;
      }
      .log.error { color: var(--red); }
      @media (max-width: 900px) {
        .topbar { align-items: flex-start; flex-direction: column; }
        .summary, .ci-grid, .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .layout, .form-layout, .three-column, .checks { grid-template-columns: 1fr; }
      }
      @media (max-width: 560px) {
        .shell { width: min(100vw - 20px, 1240px); padding-top: 18px; }
        .summary, .ci-grid, .form-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">SIRINX Solar</p>
          <h1>Solar Energy Intelligence</h1>
        </div>
        <span class="status">real local operator mode</span>
      </header>

      <section class="panel wide" aria-label="Operator intake">
        <p class="eyebrow">Operator Intake</p>
        <h2>Use Real Project Data</h2>
        <section class="form-layout">
          <form id="solarForm">
            <h3>Solar / Hybrid ESS Proposal</h3>
            <div class="form-grid">
              <label><span>Customer ID</span><input name="customerId" value="${proposal.customer.customerId}"></label>
              <label><span>Site name</span><input name="siteName" value="${proposal.customer.siteName}"></label>
              <label><span>Province</span><input name="province" value="${proposal.customer.province}"></label>
              <label><span>Utility</span><select name="utility"><option>PEA</option><option ${proposal.customer.utility === "MEA" ? "selected" : ""}>MEA</option></select></label>
              <label><span>Phase</span><select name="phase"><option value="single" ${proposal.customer.phase === "single" ? "selected" : ""}>single</option><option value="three" ${proposal.customer.phase === "three" ? "selected" : ""}>three</option></select></label>
              <label><span>Monthly bill THB</span><input name="monthlyBillThb" type="number" min="1" step="100" value="${proposal.customer.monthlyBillThb.value}"></label>
              <label><span>Day usage ratio</span><input name="dayUsageRatio" type="number" min="0" max="1" step="0.01" value="${proposal.customer.dayUsageRatio.value}"></label>
              <label><span>Night usage ratio</span><input name="nightUsageRatio" type="number" min="0" max="1" step="0.01" value="${proposal.customer.nightUsageRatio.value}"></label>
              <label><span>Air conditioners</span><input name="airConditionerCount" type="number" min="0" step="1" value="${proposal.customer.airConditionerCount.value}"></label>
              <label><span>EV count</span><input name="evCount" type="number" min="0" step="1" value="${proposal.customer.evCount.value}"></label>
              <label><span>Backup load kW</span><input name="backupLoadKw" type="number" min="0" step="0.1" value="${proposal.customer.backupLoadKw.value}"></label>
              <label><span>Backup hours</span><input name="backupHoursTarget" type="number" min="0" step="0.5" value="${proposal.customer.backupHoursTarget.value}"></label>
              <label><span>Roof area m²</span><input name="roofAreaM2" type="number" min="1" step="1" value="${proposal.customer.roofAreaM2.value}"></label>
              <label><span>Budget THB</span><input name="budgetThb" type="number" min="0" step="10000" value="${proposal.customer.budgetThb?.value ?? ""}"></label>
            </div>
            <div class="actions">
              <button type="submit">Calculate Solar</button>
              <button id="saveSolarButton" class="secondary" type="button">Save Local</button>
              <button id="syncButton" class="secondary" type="button">Sync ObsidianBrain</button>
            </div>
            <p id="solarLog" class="log">Ready for real customer data. Local only.</p>
          </form>

          <form id="ciForm">
            <h3>C&I BESS + PV + STS</h3>
            <div class="form-grid">
              <label><span>Project ID</span><input name="projectId" value="${ciBess.project.projectId}"></label>
              <label><span>Site name</span><input name="siteName" value="${ciBess.project.siteName}"></label>
              <label><span>Site type</span><input name="siteType" value="${ciBess.project.siteType}"></label>
              <label><span>Utility</span><select name="utility"><option>PEA</option><option ${ciBess.project.utility === "MEA" ? "selected" : ""}>MEA</option></select></label>
              <label><span>AC voltage VAC</span><input name="acVoltageVac" type="number" min="1" step="1" value="${ciBess.project.acVoltageVac.value}"></label>
              <label><span>Critical load kW</span><input name="criticalLoadKw" type="number" min="1" step="1" value="${ciBess.project.criticalLoadKw.value}"></label>
              <label><span>Peak demand kW</span><input name="peakDemandKw" type="number" min="1" step="1" value="${ciBess.project.peakDemandKw.value}"></label>
              <label><span>PV capacity kWp</span><input name="pvCapacityKwp" type="number" min="0" step="1" value="${ciBess.project.pvCapacityKwp?.value ?? 0}"></label>
              <label><span>Required transfer ms</span><input name="requiredTransferMs" type="number" min="1" step="1" value="${ciBess.project.requiredTransferMs.value}"></label>
              <label><span>Backup hours target</span><input name="backupHoursTarget" type="number" min="0" step="0.5" value="${ciBess.project.backupHoursTarget.value}"></label>
              <label><span>Climate</span><select name="climate"><option value="outdoor-tropical">outdoor-tropical</option><option value="indoor-controlled">indoor-controlled</option><option value="containerized">containerized</option></select></label>
              <label class="checkbox-row"><input name="generatorIntegrated" type="checkbox" ${ciBess.project.generatorIntegrated.value ? "checked" : ""}>Generator integrated</label>
              <label class="checkbox-row"><input name="exportAllowed" type="checkbox" ${ciBess.project.exportAllowed.value ? "checked" : ""}>Export allowed</label>
            </div>
            <div class="actions">
              <button type="submit">Calculate C&I BESS</button>
              <button id="saveCiButton" class="secondary" type="button">Save Local</button>
              <button id="syncCiButton" class="secondary" type="button">Sync C&I ObsidianBrain</button>
            </div>
            <p id="ciLog" class="log">Ready for real C&I project data. Local only.</p>
          </form>
        </section>
      </section>

      <section class="panel wide" aria-label="Customer real usage profile">
        <p class="eyebrow">Real Usage Profile</p>
        <h2>การใช้ไฟจริงตามช่วงเวลา และขนาดเครื่องใช้ไฟฟ้า</h2>
        <form id="usageForm">
          <div class="three-column">
            <section>
              <h3>ช่วงเวลาการใช้ไฟจริง</h3>
              <div class="form-grid">
                <label><span>Site name</span><input name="siteName" value="${usageProfile.siteName}"></label>
                <label><span>00-06 Night kW</span><input name="nightKw" type="number" min="0" step="1" value="45"></label>
                <label><span>06-09 Morning kW</span><input name="morningKw" type="number" min="0" step="1" value="95"></label>
                <label><span>09-15 Solar hours kW</span><input name="solarKw" type="number" min="0" step="1" value="140"></label>
                <label><span>15-18 Afternoon kW</span><input name="afternoonKw" type="number" min="0" step="1" value="125"></label>
                <label><span>18-22 Evening peak kW</span><input name="eveningKw" type="number" min="0" step="1" value="160"></label>
                <label><span>22-24 Late kW</span><input name="lateKw" type="number" min="0" step="1" value="85"></label>
              </div>
            </section>
            <section>
              <h3>เครื่องใช้ไฟฟ้าหลัก</h3>
              <div class="form-grid">
                <label><span>AC qty</span><input name="acQty" type="number" min="0" step="1" value="12"></label>
                <label><span>AC kW/เครื่อง</span><input name="acKw" type="number" min="0" step="0.1" value="2.5"></label>
                <label><span>AC h/day</span><input name="acHours" type="number" min="0" max="24" step="0.5" value="10"></label>
                <label><span>Cold room qty</span><input name="refrigerationQty" type="number" min="0" step="1" value="2"></label>
                <label><span>Cold room kW/ชุด</span><input name="refrigerationKw" type="number" min="0" step="0.1" value="8"></label>
                <label><span>Cold room h/day</span><input name="refrigerationHours" type="number" min="0" max="24" step="0.5" value="24"></label>
                <label><span>Pump qty</span><input name="pumpQty" type="number" min="0" step="1" value="2"></label>
                <label><span>Pump kW/ตัว</span><input name="pumpKw" type="number" min="0" step="0.1" value="11"></label>
                <label><span>Pump h/day</span><input name="pumpHours" type="number" min="0" max="24" step="0.5" value="4"></label>
              </div>
            </section>
            <section>
              <h3>โหลดเสริม / ควบคุมได้</h3>
              <div class="form-grid">
                <label><span>EV charger qty</span><input name="evQty" type="number" min="0" step="1" value="2"></label>
                <label><span>EV charger kW</span><input name="evKw" type="number" min="0" step="0.1" value="7.4"></label>
                <label><span>EV h/day</span><input name="evHours" type="number" min="0" max="24" step="0.5" value="3"></label>
                <label><span>Process qty</span><input name="processQty" type="number" min="0" step="1" value="1"></label>
                <label><span>Process kW</span><input name="processKw" type="number" min="0" step="0.1" value="35"></label>
                <label><span>Process h/day</span><input name="processHours" type="number" min="0" max="24" step="0.5" value="5"></label>
                <label><span>Server/control qty</span><input name="serverQty" type="number" min="0" step="1" value="1"></label>
                <label><span>Server/control kW</span><input name="serverKw" type="number" min="0" step="0.1" value="6"></label>
                <label><span>Lighting kW</span><input name="lightingKw" type="number" min="0" step="0.1" value="9"></label>
              </div>
            </section>
          </div>
          <div class="actions">
            <button type="submit">Calculate Usage Profile</button>
            <button id="saveUsageButton" class="secondary" type="button">Save Usage Local</button>
          </div>
          <p id="usageLog" class="log">กรอก kW ตามช่วงเวลาและขนาดเครื่องใช้ไฟฟ้า แล้วคำนวณ profile จริงได้ทันที.</p>
        </form>
        <div id="usageSummary" class="summary">
          <article class="metric"><span>Daily Energy</span><strong>${usageProfile.dailyEnergyKwh} kWh</strong><small class="muted">time-window total</small></article>
          <article class="metric"><span>Peak Estimate</span><strong>${usageProfile.estimatedPeakKw} kW</strong><small class="muted">max window/appliance</small></article>
          <article class="metric"><span>Critical Load</span><strong>${usageProfile.criticalOperatingKw} kW</strong><small class="muted">appliance inventory</small></article>
          <article class="metric"><span>PV Direct</span><strong>${usageProfile.pvDirectUseKwh} kWh</strong><small class="muted">daylight use</small></article>
          <article class="metric"><span>BESS Target</span><strong>${usageProfile.batteryShiftTargetKwh} kWh</strong><small class="muted">night/peak use</small></article>
        </div>
        <section class="layout">
          <section>
            <h2>Time Window Usage</h2>
            <table>
              <thead><tr><th>ช่วงเวลา</th><th>Avg kW</th><th>kWh</th><th>PV</th><th>BESS role</th></tr></thead>
              <tbody id="usageWindowRows">
                ${usageProfile.timeWindows
                  .map(
                    (row) => `<tr><td>${row.label}</td><td>${row.averageKw}</td><td>${row.energyKwh}</td><td>${row.pvOverlap}</td><td>${row.bessRole}</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
          <section>
            <h2>Appliance Inventory</h2>
            <table>
              <thead><tr><th>Load</th><th>Qty</th><th>kW each</th><th>Run kW</th><th>kWh/day</th><th>Surge</th><th>Critical</th></tr></thead>
              <tbody id="applianceRows">
                ${usageProfile.appliances
                  .map(
                    (load) => `<tr><td>${load.label}</td><td>${load.quantity}</td><td>${load.ratedKwEach}</td><td>${load.operatingKw}</td><td>${load.dailyKwh}</td><td>${load.estimatedSurgeKw}</td><td>${load.critical ? "yes" : "no"}</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
          <section class="panel">
            <h2>Usage Insights</h2>
            <div id="usageInsights" class="flow">
              ${usageProfile.insights.map((insight) => `<article class="flow-step"><p class="muted">${insight}</p></article>`).join("")}
            </div>
          </section>
        </section>
      </section>

      <section class="panel wide" aria-label="Commercial quotation">
        <p class="eyebrow">Quotation Engine</p>
        <h2>ใบเสนอราคา / BOQ ที่ใช้งานได้จริง</h2>
        <form id="quoteForm">
          <div class="form-grid">
            <label><span>Customer name</span><input name="customerName" value="${quotation.customerName}"></label>
            <label><span>Company name</span><input name="companyName" value="${quotation.companyName}"></label>
            <label><span>Project name</span><input name="projectName" value="${quotation.projectName}"></label>
            <label><span>Validity days</span><input name="validityDays" type="number" min="1" step="1" value="${quotation.validityDays}"></label>
            <label><span>Margin %</span><input name="marginPercent" type="number" min="0" max="40" step="0.5" value="12"></label>
            <label><span>Discount THB</span><input name="discountThb" type="number" min="0" step="10000" value="${quotation.discountThb}"></label>
            <label class="checkbox-row"><input name="includeVat" type="checkbox" checked>Include VAT 7%</label>
          </div>
          <div class="actions">
            <button type="submit">Generate Quotation</button>
            <button id="saveQuoteButton" class="secondary" type="button">Save Quote Local</button>
            <button id="syncQuoteButton" class="secondary" type="button">Sync Quote ObsidianBrain</button>
            <button id="printQuoteButton" class="secondary" type="button">Print / Save PDF</button>
            <a class="button" href="/quotation" target="_blank" rel="noreferrer">Open Printable Quote</a>
          </div>
          <p id="quoteLog" class="log">พร้อมออกใบเสนอราคา: ดึงข้อมูลจาก Solar, C&I BESS, และ Usage Profile ด้านบน.</p>
        </form>
        <div id="quoteSummary" class="summary">${quotationMetrics(quotation)}</div>
        <section class="layout">
          <section>
            <h2>Commercial BOQ</h2>
            <table>
              <thead><tr><th>Section</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th><th>Notes</th></tr></thead>
              <tbody id="quoteRows">${quotationRows(quotation)}</tbody>
            </table>
          </section>
          <section class="panel">
            <h2>Assumptions</h2>
            <div id="quoteAssumptions" class="flow">${quotationBullets(quotation.assumptions)}</div>
          </section>
          <section class="panel">
            <h2>Payment / Delivery</h2>
            <div id="quoteTerms" class="flow">${quotationBullets([...quotation.paymentTerms, ...quotation.deliveryMilestones])}</div>
          </section>
          <section class="panel">
            <h2>Why Us vs Market</h2>
            <div id="quoteDifferentiators" class="flow">${quotationBullets(quotation.competitorAwareDifferentiators)}</div>
          </section>
        </section>
      </section>

      <section class="panel wide" aria-label="Thailand competitor intelligence">
        <p class="eyebrow">Market Intelligence</p>
        <h2>คู่แข่งตลาดไทย และจุดขายขั้นสูงของระบบ</h2>
        <div class="actions">
          <a class="button" href="/api/competitor-intelligence" target="_blank" rel="noreferrer">Open Market JSON</a>
          <button id="saveMarketButton" class="secondary" type="button">Save Market Local</button>
          <button id="syncMarketButton" class="secondary" type="button">Sync Market ObsidianBrain</button>
        </div>
        <p id="marketLog" class="log">Competitor study ready. Use this to position quotations against PPA, EPC, O&M, ESS, and EMS competitors.</p>
        <section class="layout wide">
          <section>
            <h2>Market Patterns</h2>
            <div id="marketPatterns" class="flow">${marketPatternCards(competitorIntel)}</div>
          </section>
          <section>
            <h2>Observed Competitors</h2>
            <div id="competitorCards" class="flow">${competitorCards(competitorIntel)}</div>
          </section>
          <section class="panel">
            <h2>SIRINX Positioning</h2>
            <div id="marketStrategy" class="flow">${quotationBullets(competitorIntel.strategicPositioning)}</div>
          </section>
          <section class="panel">
            <h2>Quote Implications</h2>
            <div id="marketQuoteImplications" class="flow">${quotationBullets(competitorIntel.quotationImplications)}</div>
          </section>
        </section>
      </section>

      <section id="solarSummary" class="summary" aria-label="Proposal summary">${proposalMetrics(proposal)}</section>

      <section class="layout">
        <section class="panel">
          <h2>Engineering Flow</h2>
          <div id="solarFlow" class="flow">
            <article class="flow-step"><h3>Customer Energy Model</h3><p class="muted">${proposal.behavior.monthlyConsumptionKwh.value} kWh/month, ${proposal.behavior.daytimeKwhPerDay.value} kWh/day daytime, ${proposal.behavior.nighttimeKwhPerDay.value} kWh/day nighttime.</p></article>
            <article class="flow-step"><h3>System Architecture</h3><p class="muted">${proposal.executiveSummary}</p></article>
            <article class="flow-step"><h3>Resilience</h3><p class="muted">${proposal.roi.resilienceValue.autonomyHours} hours for ${proposal.roi.resilienceValue.backupLoadKw} kW critical load.</p></article>
          </div>
          <div class="actions">
            <a class="button" href="/api/proposal" target="_blank" rel="noreferrer">Open Default JSON</a>
          </div>
        </section>

        <section class="panel">
          <h2>Thailand Compliance Gates</h2>
          <div id="solarChecks" class="checks">${proposalChecks(proposal)}</div>
        </section>

        <section class="panel">
          <h2>Bill Of Materials</h2>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Notes</th></tr></thead>
            <tbody id="solarBom">${proposalBom(proposal)}</tbody>
          </table>
        </section>

        <section class="panel">
          <h2>10-Year Cashflow</h2>
          <table>
            <thead><tr><th>Year</th><th>Savings</th><th>Cumulative</th></tr></thead>
            <tbody id="solarCashflow">${proposalCashflow(proposal)}</tbody>
          </table>
        </section>
      </section>

      <section class="panel wide" aria-label="Commercial BESS intelligence">
        <p class="eyebrow">Commercial & Industrial BESS</p>
        <h2>Hybrid PV + BESS + STS Critical Load System</h2>
        <div id="ciMetrics" class="ci-grid">${ciMetrics(ciBess)}</div>
        <section class="layout">
          <section>
            <h2>EMS Strategies</h2>
            <div id="ciStrategies" class="flow">${ciStrategies(ciBess)}</div>
            <div class="actions">
              <a class="button" href="/api/ci-bess" target="_blank" rel="noreferrer">Open Default C&I JSON</a>
            </div>
          </section>
          <section>
            <h2>Commissioning Gates</h2>
            <div id="ciGates" class="checks">${ciGates(ciBess)}</div>
          </section>
        </section>
      </section>

      <section class="panel wide" aria-label="Load size power breakdown">
        <p class="eyebrow">Load Engineering</p>
        <h2>ประเภทขนาดระบบ และกำลังการใช้ไฟ</h2>
        <div id="loadSummary" class="summary">${loadSummary(ciBess)}</div>
        <section class="layout">
          <section>
            <h2>System Size Bands</h2>
            <table>
              <thead><tr><th>Type</th><th>Peak</th><th>PV</th><th>BESS</th><th>PCS</th></tr></thead>
              <tbody>${sizeBandRows()}</tbody>
            </table>
          </section>
          <section>
            <h2>Load Segments</h2>
            <table>
              <thead><tr><th>Load</th><th>Priority</th><th>Behavior</th><th>kW</th><th>h/day</th><th>kWh/day</th><th>Backup</th></tr></thead>
              <tbody id="loadBreakdownRows">${loadBreakdownRows(ciBess)}</tbody>
            </table>
          </section>
          <section class="panel">
            <h2>Sizing Steps</h2>
            <div id="sizingSteps" class="flow">${sizingStepCards(ciBess)}</div>
          </section>
          <section class="panel">
            <h2>อ่านแบบทีละส่วน</h2>
            <div class="flow">
              <article class="flow-step"><h3>Power = kW</h3><p class="muted">ใช้ดูว่า PCS, STS, breaker, cable, transformer ต้องรับกำลังสูงสุดเท่าไร</p></article>
              <article class="flow-step"><h3>Energy = kWh</h3><p class="muted">ใช้ดูว่า BESS ต้องเก็บไฟพอสำหรับกี่ชั่วโมง และเหลือ SOC reserve เท่าไร</p></article>
              <article class="flow-step"><h3>Priority</h3><p class="muted">critical ต้องไม่ดับ, essential เปิดคืนภายหลัง, deferrable ใช้ EMS เลื่อนเวลาได้</p></article>
            </div>
          </section>
        </section>
      </section>
    </main>
    <script>
      var currentProposal = null;
      var currentCiBess = null;
      var currentQuotation = null;
      var currentMarketIntel = null;

      function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
          return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
        });
      }

      function formatMoney(value) {
        return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
      }

      function formPayload(form) {
        var data = {};
        new FormData(form).forEach(function (value, key) {
          data[key] = value;
        });
        return data;
      }

      function ciPayload() {
        var form = document.querySelector("#ciForm");
        var data = formPayload(form);
        data.exportAllowed = form.elements.exportAllowed.checked;
        data.generatorIntegrated = form.elements.generatorIntegrated.checked;
        data.phase = "three";
        return data;
      }

      function usagePayload() {
        return formPayload(document.querySelector("#usageForm"));
      }

      async function postJson(url, body) {
        var response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body || {})
        });
        var payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.error || "request failed");
        }
        return payload;
      }

      async function getJson(url) {
        var response = await fetch(url);
        var payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.error || "request failed");
        }
        return payload;
      }

      function setLog(id, message, error) {
        var node = document.querySelector(id);
        node.textContent = message;
        node.classList.toggle("error", Boolean(error));
      }

      function renderProposal(proposal) {
        currentProposal = proposal;
        document.querySelector("#solarSummary").innerHTML =
          '<article class="metric"><span>System</span><strong>' + escapeHtml(proposal.design.mode) + '</strong><small class="muted">' + proposal.design.pvSizeKwp.value + ' kWp PV</small></article>' +
          '<article class="metric"><span>Inverter</span><strong>' + escapeHtml(proposal.design.inverter.brand) + '</strong><small class="muted">' + escapeHtml(proposal.design.inverter.model) + '</small></article>' +
          '<article class="metric"><span>Battery</span><strong>' + escapeHtml((proposal.design.batteryModules && proposal.design.batteryModules.value) || 0) + ' module</strong><small class="muted">' + escapeHtml((proposal.design.batteryUsableKwh && proposal.design.batteryUsableKwh.value) || 0) + ' usable kWh</small></article>' +
          '<article class="metric"><span>Monthly Savings</span><strong>THB ' + formatMoney(proposal.roi.monthlySavingsThb.value) + '</strong><small class="muted">' + escapeHtml(proposal.roi.monthlySavingsThb.kind) + '</small></article>' +
          '<article class="metric"><span>Payback</span><strong>' + proposal.roi.simplePaybackYears.value + ' yrs</strong><small class="muted">simple estimate</small></article>';

        document.querySelector("#solarFlow").innerHTML =
          '<article class="flow-step"><h3>Customer Energy Model</h3><p class="muted">' + proposal.behavior.monthlyConsumptionKwh.value + ' kWh/month, ' + proposal.behavior.daytimeKwhPerDay.value + ' kWh/day daytime, ' + proposal.behavior.nighttimeKwhPerDay.value + ' kWh/day nighttime.</p></article>' +
          '<article class="flow-step"><h3>System Architecture</h3><p class="muted">' + escapeHtml(proposal.executiveSummary) + '</p></article>' +
          '<article class="flow-step"><h3>Resilience</h3><p class="muted">' + proposal.roi.resilienceValue.autonomyHours + ' hours for ' + proposal.roi.resilienceValue.backupLoadKw + ' kW critical load.</p></article>';

        document.querySelector("#solarChecks").innerHTML = proposal.design.compatibility.map(function (check) {
          return '<article class="check ' + (check.passed ? 'pass' : 'warn') + '"><span>' + (check.passed ? 'PASS' : 'CHECK') + '</span><strong>' + escapeHtml(check.label) + '</strong><p>' + escapeHtml(check.explanation) + '</p></article>';
        }).join("");

        document.querySelector("#solarBom").innerHTML = proposal.billOfMaterials.map(function (item) {
          return '<tr><td>' + escapeHtml(item.item) + '</td><td>' + item.quantity + '</td><td>' + escapeHtml(item.notes) + '</td></tr>';
        }).join("");

        document.querySelector("#solarCashflow").innerHTML = proposal.roi.tenYearCashflowThb.map(function (row) {
          return '<tr><td>Year ' + row.year + '</td><td>THB ' + formatMoney(row.savings) + '</td><td>THB ' + formatMoney(row.cumulative) + '</td></tr>';
        }).join("");
      }

      function renderCiBess(design) {
        currentCiBess = design;
        document.querySelector("#ciMetrics").innerHTML =
          '<article class="metric"><span>Battery</span><strong>' + design.battery.nominalEnergyKwh + ' kWh</strong><small class="muted">' + design.battery.parallelCells + 'P' + design.battery.seriesCells + 'S LFP</small></article>' +
          '<article class="metric"><span>HVDC</span><strong>' + design.nominalDcVoltageV.value + ' V</strong><small class="muted">' + design.battery.operatingVoltageMinVdc + '-' + design.battery.operatingVoltageMaxVdc + ' VDC</small></article>' +
          '<article class="metric"><span>PCS</span><strong>' + design.pcs.ratedPowerKw + ' kW</strong><small class="muted">' + design.cRateP.value + 'P C-rate</small></article>' +
          '<article class="metric"><span>STS</span><strong><=' + design.sts.transferTimeMs + ' ms</strong><small class="muted">' + (design.transferMeetsRequirement ? 'meets target' : 'check target') + '</small></article>' +
          '<article class="metric"><span>Critical Load</span><strong>' + design.project.criticalLoadKw.value + ' kW</strong><small class="muted">' + design.criticalLoadAutonomyHours.value + ' hr autonomy</small></article>' +
          '<article class="metric"><span>Cooling</span><strong>' + escapeHtml(design.battery.thermalManagement) + '</strong><small class="muted">' + escapeHtml(design.battery.coolant || 'coolant TBD') + '</small></article>';

        document.querySelector("#ciStrategies").innerHTML = design.emsStrategies.map(function (strategy) {
          return '<article class="flow-step"><h3>' + escapeHtml(strategy.label) + '</h3><p class="muted">' + escapeHtml(strategy.explanation) + '</p></article>';
        }).join("");

        document.querySelector("#ciGates").innerHTML = design.commissioningGates.map(function (gate) {
          return '<article class="check ' + (gate.status === 'pass' ? 'pass' : 'warn') + '"><span>' + escapeHtml(gate.status) + '</span><strong>' + escapeHtml(gate.label) + '</strong><p>' + escapeHtml(gate.evidenceRequired) + '</p></article>';
        }).join("");

        refreshLoadBreakdown();
      }

      function renderUsageProfile(profile) {
        document.querySelector("#usageSummary").innerHTML =
          '<article class="metric"><span>Daily Energy</span><strong>' + profile.dailyEnergyKwh + ' kWh</strong><small class="muted">time-window total</small></article>' +
          '<article class="metric"><span>Peak Estimate</span><strong>' + profile.estimatedPeakKw + ' kW</strong><small class="muted">max window/appliance</small></article>' +
          '<article class="metric"><span>Critical Load</span><strong>' + profile.criticalOperatingKw + ' kW</strong><small class="muted">appliance inventory</small></article>' +
          '<article class="metric"><span>PV Direct</span><strong>' + profile.pvDirectUseKwh + ' kWh</strong><small class="muted">daylight use</small></article>' +
          '<article class="metric"><span>BESS Target</span><strong>' + profile.batteryShiftTargetKwh + ' kWh</strong><small class="muted">night/peak use</small></article>';
        document.querySelector("#usageWindowRows").innerHTML = profile.timeWindows.map(function (row) {
          return '<tr><td>' + escapeHtml(row.label) + '</td><td>' + row.averageKw + '</td><td>' + row.energyKwh + '</td><td>' + escapeHtml(row.pvOverlap) + '</td><td>' + escapeHtml(row.bessRole) + '</td></tr>';
        }).join("");
        document.querySelector("#applianceRows").innerHTML = profile.appliances.map(function (load) {
          return '<tr><td>' + escapeHtml(load.label) + '</td><td>' + load.quantity + '</td><td>' + load.ratedKwEach + '</td><td>' + load.operatingKw + '</td><td>' + load.dailyKwh + '</td><td>' + load.estimatedSurgeKw + '</td><td>' + (load.critical ? 'yes' : 'no') + '</td></tr>';
        }).join("");
        document.querySelector("#usageInsights").innerHTML = profile.insights.map(function (insight) {
          return '<article class="flow-step"><p class="muted">' + escapeHtml(insight) + '</p></article>';
        }).join("");
      }

      function quoteOptions() {
        var form = document.querySelector("#quoteForm");
        var data = formPayload(form);
        data.includeVat = form.elements.includeVat.checked;
        return data;
      }

      function quotePayload() {
        return {
          customer: formPayload(document.querySelector("#solarForm")),
          project: ciPayload(),
          usage: usagePayload(),
          options: quoteOptions()
        };
      }

      function renderQuotation(quote) {
        currentQuotation = quote;
        document.querySelector("#quoteSummary").innerHTML =
          '<article class="metric"><span>Quote No.</span><strong>' + escapeHtml(quote.quotationNo) + '</strong><small class="muted">' + quote.validityDays + ' days validity</small></article>' +
          '<article class="metric"><span>Subtotal</span><strong>THB ' + formatMoney(quote.subtotalThb) + '</strong><small class="muted">equipment + delivery scope</small></article>' +
          '<article class="metric"><span>Margin</span><strong>THB ' + formatMoney(quote.marginThb) + '</strong><small class="muted">commercial buffer</small></article>' +
          '<article class="metric"><span>VAT</span><strong>THB ' + formatMoney(quote.vatThb) + '</strong><small class="muted">7% when enabled</small></article>' +
          '<article class="metric"><span>Grand Total</span><strong>THB ' + formatMoney(quote.grandTotalThb) + '</strong><small class="muted">' + escapeHtml(quote.currency) + '</small></article>';
        document.querySelector("#quoteRows").innerHTML = quote.lines.map(function (line) {
          return '<tr><td>' + escapeHtml(line.section) + '</td><td>' + escapeHtml(line.description) + '</td><td>' + line.quantity + '</td><td>' + escapeHtml(line.unit) + '</td><td>THB ' + formatMoney(line.unitPriceThb) + '</td><td>THB ' + formatMoney(line.totalThb) + '</td><td>' + escapeHtml(line.notes) + '</td></tr>';
        }).join("");
        document.querySelector("#quoteAssumptions").innerHTML = quote.assumptions.map(function (item) {
          return '<article class="flow-step"><p class="muted">' + escapeHtml(item) + '</p></article>';
        }).join("");
        document.querySelector("#quoteTerms").innerHTML = quote.paymentTerms.concat(quote.deliveryMilestones).map(function (item) {
          return '<article class="flow-step"><p class="muted">' + escapeHtml(item) + '</p></article>';
        }).join("");
        document.querySelector("#quoteDifferentiators").innerHTML = quote.competitorAwareDifferentiators.map(function (item) {
          return '<article class="flow-step"><p class="muted">' + escapeHtml(item) + '</p></article>';
        }).join("");
      }

      async function calculateQuotation() {
        var payload = quotePayload();
        var quote = await postJson("/api/quotation", payload);
        renderQuotation(quote);
        setLog("#quoteLog", "Generated " + quote.quotationNo + " total THB " + formatMoney(quote.grandTotalThb));
        return { payload: payload, result: quote };
      }

      async function calculateUsage() {
        var payload = usagePayload();
        var profile = await postJson("/api/usage-profile", payload);
        renderUsageProfile(profile);
        setLog("#usageLog", "Calculated usage profile for " + profile.siteName + " at " + new Date().toLocaleTimeString());
        return { payload: payload, result: profile };
      }

      async function refreshLoadBreakdown() {
        var payload = ciPayload();
        var body = await postJson("/api/load-taxonomy", payload);
        var breakdown = body.breakdown;
        document.querySelector("#loadSummary").innerHTML =
          '<article class="metric"><span>Size Class</span><strong>' + escapeHtml(breakdown.sizeClass.label) + '</strong><small class="muted">' + escapeHtml(breakdown.sizeClass.peakDemandKw) + '</small></article>' +
          '<article class="metric"><span>Peak Demand</span><strong>' + breakdown.totalPeakDemandKw + ' kW</strong><small class="muted">site maximum</small></article>' +
          '<article class="metric"><span>Critical Load</span><strong>' + breakdown.criticalLoadKw + ' kW</strong><small class="muted">backup boundary</small></article>' +
          '<article class="metric"><span>Daily Energy</span><strong>' + breakdown.dailyEnergyKwh + ' kWh</strong><small class="muted">segment estimate</small></article>' +
          '<article class="metric"><span>Backup Target</span><strong>' + breakdown.backupEnergyTargetKwh + ' kWh</strong><small class="muted">critical load x hours</small></article>';
        document.querySelector("#loadBreakdownRows").innerHTML = breakdown.segments.map(function (segment) {
          return '<tr><td>' + escapeHtml(segment.label) + '</td><td>' + escapeHtml(segment.priority) + '</td><td>' + escapeHtml(segment.behavior) + '</td><td>' + segment.estimatedKw + '</td><td>' + segment.hoursPerDay + '</td><td>' + segment.dailyKwh + '</td><td>' + (segment.backupRequired ? 'yes' : 'no') + '</td></tr>';
        }).join("");
        document.querySelector("#sizingSteps").innerHTML = breakdown.sizingSteps.map(function (item) {
          return '<article class="flow-step"><h3>' + escapeHtml(item.step) + '</h3><p class="muted">' + escapeHtml(item.explanation) + '</p></article>';
        }).join("");
      }

      async function calculateSolar() {
        var payload = formPayload(document.querySelector("#solarForm"));
        var proposal = await postJson("/api/proposal", payload);
        renderProposal(proposal);
        setLog("#solarLog", "Calculated " + proposal.customer.siteName + " at " + new Date().toLocaleTimeString());
        return { payload: payload, result: proposal };
      }

      async function calculateCi() {
        var payload = ciPayload();
        var design = await postJson("/api/ci-bess", payload);
        renderCiBess(design);
        setLog("#ciLog", "Calculated " + design.project.siteName + " at " + new Date().toLocaleTimeString());
        return { payload: payload, result: design };
      }

      document.querySelector("#solarForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        try { await calculateSolar(); } catch (error) { setLog("#solarLog", error.message, true); }
      });

      document.querySelector("#ciForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        try { await calculateCi(); } catch (error) { setLog("#ciLog", error.message, true); }
      });

      document.querySelector("#usageForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        try { await calculateUsage(); } catch (error) { setLog("#usageLog", error.message, true); }
      });

      document.querySelector("#quoteForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        try { await calculateQuotation(); } catch (error) { setLog("#quoteLog", error.message, true); }
      });

      document.querySelector("#saveSolarButton").addEventListener("click", async function () {
        try {
          var calculated = await calculateSolar();
          var saved = await postJson("/api/projects", {
            kind: "solar-proposal",
            name: calculated.result.customer.siteName,
            payload: calculated.payload,
            result: calculated.result
          });
          setLog("#solarLog", "Saved local project: " + saved.id);
        } catch (error) { setLog("#solarLog", error.message, true); }
      });

      document.querySelector("#saveCiButton").addEventListener("click", async function () {
        try {
          var calculated = await calculateCi();
          var saved = await postJson("/api/projects", {
            kind: "ci-bess",
            name: calculated.result.project.siteName,
            payload: calculated.payload,
            result: calculated.result
          });
          setLog("#ciLog", "Saved local project: " + saved.id);
        } catch (error) { setLog("#ciLog", error.message, true); }
      });

      document.querySelector("#saveUsageButton").addEventListener("click", async function () {
        try {
          var calculated = await calculateUsage();
          var saved = await postJson("/api/projects", {
            kind: "usage-profile",
            name: calculated.result.siteName,
            payload: calculated.payload,
            result: calculated.result
          });
          setLog("#usageLog", "Saved local usage profile: " + saved.id);
        } catch (error) { setLog("#usageLog", error.message, true); }
      });

      document.querySelector("#saveQuoteButton").addEventListener("click", async function () {
        try {
          var calculated = await calculateQuotation();
          var saved = await postJson("/api/projects", {
            kind: "quotation",
            name: calculated.result.projectName,
            payload: calculated.payload,
            result: calculated.result
          });
          setLog("#quoteLog", "Saved local quotation: " + saved.id);
        } catch (error) { setLog("#quoteLog", error.message, true); }
      });

      document.querySelector("#syncButton").addEventListener("click", async function () {
        try {
          var payload = formPayload(document.querySelector("#solarForm"));
          var body = await postJson("/api/obsidian/sync", payload);
          setLog("#solarLog", "Synced " + body.files.length + " notes into ObsidianBrain.");
        } catch (error) { setLog("#solarLog", error.message, true); }
      });

      document.querySelector("#syncCiButton").addEventListener("click", async function () {
        try {
          var body = await postJson("/api/ci-bess/obsidian/sync", ciPayload());
          setLog("#ciLog", "Synced " + body.files.length + " C&I notes into ObsidianBrain.");
        } catch (error) { setLog("#ciLog", error.message, true); }
      });

      document.querySelector("#syncQuoteButton").addEventListener("click", async function () {
        try {
          var body = await postJson("/api/quotation/obsidian/sync", quotePayload());
          setLog("#quoteLog", "Synced quotation " + body.quotationNo + " into ObsidianBrain.");
        } catch (error) { setLog("#quoteLog", error.message, true); }
      });

      document.querySelector("#printQuoteButton").addEventListener("click", async function () {
        try {
          if (!currentQuotation) {
            await calculateQuotation();
          }
          window.print();
        } catch (error) { setLog("#quoteLog", error.message, true); }
      });

      document.querySelector("#saveMarketButton").addEventListener("click", async function () {
        try {
          currentMarketIntel = currentMarketIntel || await getJson("/api/competitor-intelligence");
          var saved = await postJson("/api/projects", {
            kind: "competitor-intelligence",
            name: "Thailand solar BESS competitor intelligence",
            payload: {},
            result: currentMarketIntel
          });
          setLog("#marketLog", "Saved local market intelligence: " + saved.id);
        } catch (error) { setLog("#marketLog", error.message, true); }
      });

      document.querySelector("#syncMarketButton").addEventListener("click", async function () {
        try {
          var body = await postJson("/api/competitor-intelligence/obsidian/sync", {});
          setLog("#marketLog", "Synced " + body.files.length + " market notes into ObsidianBrain.");
        } catch (error) { setLog("#marketLog", error.message, true); }
      });
    </script>
  </body>
</html>`;
}
