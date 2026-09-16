(function () {
  'use strict';

  /* ===========================================================
   * SIRINX ROI Enhancer
   * Enhances the existing ROI Calculator page with:
   *  - System type toggle (Solar-only / +BESS / +EV / +BESS+EV)
   *  - Export to LINE button
   *  - CSS bar chart (investment vs savings over 5 years)
   *
   * Auto-detects [data-roi-calculator] on the page.
   * Pure vanilla JS — no dependencies.
   * =========================================================== */

  /* ------------------------------------------------------------------ */
  /*  1. Bail if the ROI calculator section is missing                  */
  /* ------------------------------------------------------------------ */
  var calculator = document.querySelector('[data-roi-calculator]');
  if (!calculator) return;

  /* ------------------------------------------------------------------ */
  /*  2. Grab existing DOM refs (decoupled via data attributes)         */
  /* ------------------------------------------------------------------ */
  var monthlyBillInput = calculator.querySelector('[data-roi-input="monthlyBill"]');
  var areaInput = calculator.querySelector('[data-roi-input="area"]');
  var daytimeUseInput = calculator.querySelector('[data-roi-input="daytimeUse"]');
  var electricityRateInput = calculator.querySelector('[data-roi-input="electricityRate"]');
  var sizeOutput = calculator.querySelector('[data-roi-size-output]');
  var savingOutput = calculator.querySelector('[data-roi-saving-output]');
  var paybackOutput = calculator.querySelector('[data-roi-payback-output]');
  var disclaimerOutput = calculator.querySelector('[data-roi-disclaimer-output]');

  if (
    !monthlyBillInput || !areaInput || !daytimeUseInput ||
    !electricityRateInput || !sizeOutput || !savingOutput ||
    !paybackOutput || !disclaimerOutput
  ) return;

  /* ------------------------------------------------------------------ */
  /*  3. Brand tokens & config                                          */
  /* ------------------------------------------------------------------ */
  var $primary = '#00D4AA';
  var $dark = '#0a1628';
  var $surface = '#1a2744';
  var $accent = '#00A3FF';
  var $textLight = '#e2e8f0';
  var $textMuted = '#94a3b8';

  var LINE_BASIC_ID = '@304zrttj';
  var LINE_CHAT_URL = 'https://line.me/R/oaMessage/%40' + LINE_BASIC_ID.substring(1) + '/?text=';

  var SYSTEM_TYPES = [
    { id: 'solar',         label: 'Solar \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27', bess: false, ev: false },
    { id: 'solar-bess',    label: 'Solar + BESS',                                                         bess: true,  ev: false },
    { id: 'solar-ev',      label: 'Solar + EV Charger',                                                   bess: false, ev: true  },
    { id: 'solar-bess-ev', label: 'Solar + BESS + EV',                                                    bess: true,  ev: true  }
  ];

  var currentType = SYSTEM_TYPES[0];

  /* ------------------------------------------------------------------ */
  /*  4. Utility helpers                                                */
  /* ------------------------------------------------------------------ */
  function numVal(input) {
    return parseFloat(input.value) || 0;
  }

  function fmt(n, decimals) {
    if (decimals === undefined) decimals = 0;
    return new Intl.NumberFormat('th-TH', { maximumFractionDigits: decimals }).format(n);
  }

  function fmtKw(n) {
    return new Intl.NumberFormat('th-TH', { maximumFractionDigits: n >= 100 ? 0 : 1 }).format(n);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.keys(attrs[k]).forEach(function (sk) { node.style[sk] = attrs[k][sk]; });
        } else if (k.slice(0, 2) === 'on') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k === 'html') {
          node.innerHTML = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  /* ------------------------------------------------------------------ */
  /*  5. Inject styles                                                  */
  /* ------------------------------------------------------------------ */
  (function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      /* --- System type selector --- */
      '.sirinx-enhancer-selector-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}',
      '.sirinx-enhancer-selector-row .enhancer-pill{flex:1 0 auto;min-width:120px}',
      '.sirinx-enhancer-selector-row input{position:absolute;opacity:0;pointer-events:none}',
      '.sirinx-enhancer-selector-row label{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.06);color:' + $textMuted + ';font-weight:600;font-size:0.88rem;cursor:pointer;transition:all .15s;min-height:44px;text-align:center;width:100%;box-sizing:border-box}',
      '.sirinx-enhancer-selector-row input:checked+label{background:rgba(0,212,170,0.14);border-color:' + $primary + ';color:#f8fafc;box-shadow:inset 0 0 0 1px ' + $primary + '}',
      '.sirinx-enhancer-selector-row label:hover{border-color:rgba(0,212,170,0.4);color:#f8fafc}',
      '.sirinx-enhancer-selector-row input:focus-visible+label{outline:2px solid ' + $accent + ';outline-offset:2px}',
      '.enhancer-pill-indicator{width:8px;height:8px;border-radius:50%;display:inline-block;flex:0 0 8px}',
      '.enhancer-pill-indicator.on{background:' + $primary + ';box-shadow:0 0 6px ' + $primary + '}',
      '.enhancer-pill-indicator.off{background:rgba(255,255,255,0.12)}',

      /* --- LINE button --- */
      '.sirinx-enhancer-line-wrap{margin-top:20px}',
      '.sirinx-enhancer-line-btn{display:inline-flex;align-items:center;gap:10px;background:#06c755;color:#04130a;border:none;border-radius:10px;padding:14px 24px;font-weight:800;font-size:0.98rem;cursor:pointer;transition:all .15s;text-decoration:none;min-height:48px;width:100%;justify-content:center;box-sizing:border-box}',
      '.sirinx-enhancer-line-btn:hover{background:#05b54b;transform:translateY(-1px)}',
      '.sirinx-enhancer-line-btn:active{transform:translateY(0)}',
      '.sirinx-enhancer-line-btn svg{flex:0 0 22px;width:22px;height:22px}',
      '.sirinx-enhancer-line-note{color:' + $textMuted + ';font-size:0.78rem;margin:8px 0 0;text-align:center}',

      /* --- Chart --- */
      '.sirinx-enhancer-chart-wrap{margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)}',
      '.sirinx-enhancer-chart-wrap h4{color:#f8fafc;font-size:0.92rem;font-weight:700;margin:0 0 16px}',
      '.sirinx-enhancer-chart{position:relative;height:300px;margin:0 0 8px;overflow:hidden}',
      '.sirinx-enhancer-chart-baseline{position:absolute;left:48px;right:0;height:1px;background:rgba(255,255,255,0.12);z-index:1;pointer-events:none}',
      '.sirinx-enhancer-chart-y{position:absolute;left:0;top:0;bottom:0;width:48px;display:flex;flex-direction:column;justify-content:space-between;padding:4px 4px 0 0;box-sizing:border-box;pointer-events:none}',
      '.sirinx-enhancer-chart-y span{color:' + $textMuted + ';font-size:0.65rem;font-weight:600;text-align:right;line-height:1;white-space:nowrap}',
      '.sirinx-enhancer-chart-x{display:flex;padding-left:48px;gap:2px}',
      '.sirinx-enhancer-chart-x span{flex:1;text-align:center;color:' + $textMuted + ';font-size:0.7rem;font-weight:600;padding-top:4px}',
      '.sirinx-enhancer-chart-body{position:absolute;left:48px;right:0;top:0;bottom:0;display:flex;align-items:flex-end;z-index:2;pointer-events:none}',
      '.sirinx-enhancer-chart-col{flex:1;display:flex;justify-content:center;align-items:flex-end;gap:3px;position:relative;height:100%;pointer-events:auto}',
      '.sirinx-enhancer-chart-bar{width:100%;max-width:38px;border-radius:3px 3px 0 0;position:relative;transition:height .35s;min-height:2px;flex:0 0 auto}',
      '.sirinx-enhancer-chart-bar.neg{border-radius:0 0 3px 3px;align-self:flex-start}',
      '.sirinx-enhancer-chart-bar .bar-val{position:absolute;left:50%;transform:translateX(-50%);font-size:0.58rem;font-weight:700;white-space:nowrap;color:' + $textMuted + ';pointer-events:none}',
      '.sirinx-enhancer-chart-bar.pos .bar-val{bottom:calc(100% + 4px)}',
      '.sirinx-enhancer-chart-bar.neg .bar-val{top:calc(100% + 4px)}',

      /* --- Chart legend --- */
      '.sirinx-enhancer-chart-legend{display:flex;flex-wrap:wrap;gap:16px;padding-left:48px;margin-top:4px}',
      '.sirinx-enhancer-chart-legend span{display:inline-flex;align-items:center;gap:6px;color:' + $textMuted + ';font-size:0.75rem;font-weight:600}',
      '.sirinx-enhancer-chart-legend .swatch{width:12px;height:12px;border-radius:2px;flex:0 0 12px}'
    ].join('');
    document.head.appendChild(style);
  })();

  /* ------------------------------------------------------------------ */
  /*  6. Create system type selector                                    */
  /* ------------------------------------------------------------------ */
  var selectorContainer = el('div', { className: 'sirinx-enhancer-selector-row' });

  SYSTEM_TYPES.forEach(function (st, idx) {
    var id = 'sirinx-type-' + st.id;
    var radio = el('input', {
      type: 'radio',
      name: 'sirinx-system-type',
      id: id,
      value: st.id
    });
    if (idx === 0) radio.checked = true;

    var indicator = el('span', { className: 'enhancer-pill-indicator ' + (idx === 0 ? 'on' : 'off') });
    var label = el('label', { htmlFor: id }, [indicator, st.label]);

    var wrapper = el('div', { className: 'enhancer-pill' }, [radio, label]);
    selectorContainer.appendChild(wrapper);

    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      currentType = st;
      selectorContainer.querySelectorAll('.enhancer-pill-indicator').forEach(function (dot, i) {
        dot.className = 'enhancer-pill-indicator ' + (i === idx ? 'on' : 'off');
      });
      fullUpdate();
    });
  });

  /* Insert after .section-heading, before .readiness-checklist */
  var sectionHeading = calculator.querySelector('.section-heading');
  var checklist = calculator.querySelector('.readiness-checklist');
  if (sectionHeading && checklist) {
    calculator.insertBefore(selectorContainer, checklist);
  }

  /* ------------------------------------------------------------------ */
  /*  7. Create LINE button                                             */
  /* ------------------------------------------------------------------ */
  var lineWrap = el('div', { className: 'sirinx-enhancer-line-wrap' });

  var lineBtn = el('button', {
    className: 'sirinx-enhancer-line-btn',
    onClick: function () { sendToLine(); }
  }, [
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 10.5h-9v-1.5h9v1.5z" fill="currentColor"/><path d="M17 11.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h9a.5.5 0 01.5.5v1z" fill="currentColor"/><path d="M7.5 8.5h9v1h-9zM7.5 12h9v1h-9z" fill="currentColor"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 10.5h-9v-1.5h9v1.5z" fill="currentColor"/></svg>',
    '\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E17\u0E35\u0E21\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E1C\u0E48\u0E32\u0E19 LINE'
  ]);

  var lineNote = el('p', { className: 'sirinx-enhancer-line-note' },
    '\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E30\u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E44\u0E1B\u0E22\u0E31\u0E07 LINE Official @sirinx \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E17\u0E35\u0E21\u0E27\u0E34\u0E28\u0E27\u0E01\u0E23\u0E23\u0E21\u0E0A\u0E48\u0E27\u0E22\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E21\u0E21\u0E15\u0E34\u0E10\u0E32\u0E19'
  );

  lineWrap.appendChild(lineBtn);
  lineWrap.appendChild(lineNote);

  /* Insert after .roi-result-panel */
  var resultPanel = calculator.querySelector('[data-roi-result]');
  if (resultPanel) {
    resultPanel.parentNode.insertBefore(lineWrap, resultPanel.nextSibling);
  }

  /* ------------------------------------------------------------------ */
  /*  8. Create cashflow chart                                          */
  /* ------------------------------------------------------------------ */
  var chartWrap = el('div', { className: 'sirinx-enhancer-chart-wrap' });
  var chartTitle = el('h4', {}, '\u0E40\u0E1B\u0E23\u0E35\u0E22\u0E1A\u0E40\u0E17\u0E35\u0E22\u0E1A\u0E01\u0E23\u0E30\u0E41\u0E2A\u0E40\u0E07\u0E34\u0E19\u0E25\u0E07\u0E17\u0E38\u0E19\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35 (Solar-only vs Solar+BESS)');
  chartWrap.appendChild(chartTitle);

  var chartContainer = el('div', { className: 'sirinx-enhancer-chart' });
  var chartBody = el('div', { className: 'sirinx-enhancer-chart-body' });
  var chartY = el('div', { className: 'sirinx-enhancer-chart-y' });
  var baselineEl = el('div', { className: 'sirinx-enhancer-chart-baseline' });
  var chartX = el('div', { className: 'sirinx-enhancer-chart-x' });

  var chartLegend = el('div', { className: 'sirinx-enhancer-chart-legend' }, [
    el('span', {}, [el('span', { className: 'swatch', style: { background: $primary } }), 'Solar-only']),
    el('span', {}, [el('span', { className: 'swatch', style: { background: $accent } }), 'Solar+BESS'])
  ]);

  chartContainer.appendChild(chartY);
  chartContainer.appendChild(baselineEl);
  chartContainer.appendChild(chartBody);
  chartContainer.appendChild(chartX);

  chartWrap.appendChild(chartContainer);
  chartWrap.appendChild(chartLegend);

  /* Insert after lineWrap */
  if (lineWrap.parentNode) {
    lineWrap.parentNode.insertBefore(chartWrap, lineWrap.nextSibling);
  }

  /* ------------------------------------------------------------------ */
  /*  9. Calculation engine                                             */
  /* ------------------------------------------------------------------ */
  function baseCalc(bessMultiplier, evMultiplier) {
    var monthlyBill = numVal(monthlyBillInput);
    var area = numVal(areaInput);
    var daytimeUse = numVal(daytimeUseInput);
    var electricityRate = numVal(electricityRateInput);

    if (monthlyBill < 10000 || area < 20 || electricityRate < 3 || electricityRate > 8) {
      return null;
    }

    var monthlyKwh = monthlyBill / electricityRate;
    var billBasedSize = monthlyKwh / 115;
    var areaBasedSize = area / 7.2;
    var baseSize = Math.max(3, Math.min(billBasedSize, areaBasedSize));
    var lowSize = Math.max(3, baseSize * 0.75);
    var highSize = Math.max(lowSize, Math.min(areaBasedSize, baseSize * 1.15));

    var lowSaving = Math.min(monthlyBill * 0.72, lowSize * 105 * daytimeUse * electricityRate);
    var highSaving = Math.min(monthlyBill * 0.82, highSize * 125 * Math.min(0.9, daytimeUse + 0.08) * electricityRate);

    var bmLow = 1 + (bessMultiplier ? 0.15 : 0);
    var bmHigh = 1 + (bessMultiplier ? 0.25 : 0);
    var emLow = 1 + (evMultiplier ? 0.10 : 0);
    var emHigh = 1 + (evMultiplier ? 0.20 : 0);

    lowSaving = lowSaving * bmLow * emLow;
    highSaving = highSaving * bmHigh * emHigh;

    var lowInvestment = lowSize * 38000;
    var highInvestment = highSize * 62000;

    /* BESS hardware premium for investment */
    if (bessMultiplier) {
      lowInvestment *= 1.25;
      highInvestment *= 1.35;
    }
    if (evMultiplier) {
      lowInvestment *= 1.10;
      highInvestment *= 1.15;
    }

    var fastPayback = lowInvestment / Math.max(highSaving * 12, 1);
    var slowPayback = highInvestment / Math.max(lowSaving * 12, 1);

    return {
      lowSize: lowSize, highSize: highSize,
      lowSaving: lowSaving, highSaving: highSaving,
      lowInvestment: lowInvestment, highInvestment: highInvestment,
      fastPayback: fastPayback, slowPayback: slowPayback
    };
  }

  function calcCurrent() {
    return baseCalc(currentType.bess, currentType.ev);
  }

  function calcSolarOnly() {
    return baseCalc(false, false);
  }

  function calcSolarBess() {
    return baseCalc(true, currentType.ev);
  }

  /* ------------------------------------------------------------------ */
  /*  10. Update outputs & UI                                           */
  /* ------------------------------------------------------------------ */
  function fullUpdate() {
    var r = calcCurrent();
    var rSolar = calcSolarOnly();
    var rBess = calcSolarBess();

    /* Update result panel */
    if (!r) {
      sizeOutput.textContent = '\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E2D\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19';
      savingOutput.textContent = '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E04\u0E48\u0E32\u0E44\u0E1F \u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 \u0E41\u0E25\u0E30\u0E04\u0E48\u0E32\u0E44\u0E1F\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E43\u0E2B\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E17\u0E35\u0E48\u0E2A\u0E21\u0E40\u0E2B\u0E15\u0E38\u0E2A\u0E21\u0E1C\u0E25';
      paybackOutput.textContent = '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E04\u0E37\u0E19\u0E17\u0E38\u0E19';
      disclaimerOutput.textContent = '\u0E41\u0E19\u0E30\u0E19\u0E33\u0E43\u0E2B\u0E49\u0E2A\u0E48\u0E07\u0E1A\u0E34\u0E25\u0E04\u0E48\u0E32\u0E44\u0E1F\u0E41\u0E25\u0E30\u0E23\u0E39\u0E1B\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E1C\u0E48\u0E32\u0E19 LINE \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E17\u0E35\u0E21\u0E0A\u0E48\u0E27\u0E22\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E21\u0E21\u0E15\u0E34\u0E10\u0E32\u0E19';
      drawChart(null, null);
      return;
    }

    var sizeStr = fmtKw(r.lowSize) + '-' + fmtKw(r.highSize) + ' kWp \u0E42\u0E14\u0E22\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13';
    var savingStr = fmt(r.lowSaving) + '-' + fmt(r.highSaving) + ' \u0E1A\u0E32\u0E17/\u0E40\u0E14\u0E37\u0E2D\u0E19 \u0E42\u0E14\u0E22\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13';
    var paybackStr = r.fastPayback.toFixed(1) + '-' + r.slowPayback.toFixed(1) + ' \u0E1B\u0E35 \u0E42\u0E14\u0E22\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13';

    sizeOutput.textContent = sizeStr;
    savingOutput.textContent = savingStr;
    paybackOutput.textContent = paybackStr;
    disclaimerOutput.textContent =
      '\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E23\u0E2D\u0E1A\u0E04\u0E38\u0E22\u0E07\u0E32\u0E19\u0E40\u0E1A\u0E37\u0E49\u0E2D\u0E07\u0E15\u0E49\u0E19 \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08\u0E1A\u0E34\u0E25\u0E08\u0E23\u0E34\u0E07 \u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 \u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C \u0E23\u0E32\u0E04\u0E32\u0E44\u0E1F \u0E41\u0E25\u0E30\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E44\u0E1F\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E31\u0E14\u0E17\u0E33\u0E02\u0E49\u0E2D\u0E40\u0E2A\u0E19\u0E2D';

    drawChart(rSolar, rBess);
  }

  /* ------------------------------------------------------------------ */
  /*  11. Chart renderer                                                */
  /* ------------------------------------------------------------------ */
  function drawChart(rSolar, rBess) {
    /* Clear previous bars / labels */
    while (chartBody.firstChild) chartBody.removeChild(chartBody.firstChild);
    while (chartX.firstChild) chartX.removeChild(chartX.firstChild);

    if (!rSolar || !rBess) {
      chartY.innerHTML = '';
      return;
    }

    /* Data: Year 0 = investment (negative), Years 1-5 = annual savings (positive) */
    var solarInvest = rSolar.highInvestment;
    var bessInvest = rBess.highInvestment;
    var solarAnnual = rSolar.highSaving * 12;
    var bessAnnual = rBess.highSaving * 12;

    var sData = [-solarInvest, solarAnnual, solarAnnual, solarAnnual, solarAnnual, solarAnnual];
    var bData = [-bessInvest, bessAnnual, bessAnnual, bessAnnual, bessAnnual, bessAnnual];

    /* Find max magnitude */
    var maxVal = 0;
    sData.concat(bData).forEach(function (v) {
      var absV = Math.abs(v);
      if (absV > maxVal) maxVal = absV;
    });
    if (maxVal === 0) return;

    /* Chart geometry */
    var chartHeight = 300;
    var baselineRatio = 0.65; /* baseline at 65% from top → 35% from bottom */
    var halfH = chartHeight * baselineRatio; /* space for positive bars */
    var negH = chartHeight * (1 - baselineRatio); /* space for negative bars */

    /* Y-axis labels */
    chartY.innerHTML = '';
    var yLabels = [0, 0.25, 0.5, 0.75, 1];
    yLabels.forEach(function (frac) {
      var labelVal = frac * maxVal;
      var labelStr = labelVal >= 1000000 ? (labelVal / 1000000).toFixed(1) + 'M' :
                      labelVal >= 1000 ? (labelVal / 1000).toFixed(0) + 'K' :
                      fmt(labelVal);
      chartY.appendChild(el('span', {}, labelStr));
    });

    /* Baseline position */
    baselineEl.style.bottom = negH + 'px';

    /* Build year columns */
    var years = ['\u0E1B\u0E35 0', '\u0E1B\u0E35 1', '\u0E1B\u0E35 2', '\u0E1B\u0E35 3', '\u0E1B\u0E35 4', '\u0E1B\u0E35 5'];
    for (var yr = 0; yr < 6; yr++) {
      var col = el('div', { className: 'sirinx-enhancer-chart-col' });

      /* Solar-only bar */
      var sv = sData[yr];
      var sh = sv >= 0
        ? Math.max(2, (sv / maxVal) * halfH)
        : Math.max(2, (Math.abs(sv) / maxVal) * negH);
      var sBar = el('div', {
        className: 'sirinx-enhancer-chart-bar' + (sv >= 0 ? ' pos' : ' neg'),
        style: {
          height: sh + 'px',
          background: sv >= 0 ? $primary : '#008F72'
        }
      });
      var sLabel = fmt(Math.abs(sv) >= 1000000 ? Math.round(Math.abs(sv) / 100000) / 10 + 'M' :
                       Math.abs(sv) >= 1000 ? Math.round(Math.abs(sv) / 1000) + 'K' :
                       fmt(Math.abs(sv)));
      sBar.appendChild(el('span', { className: 'bar-val' }, sLabel));
      col.appendChild(sBar);

      /* Solar+BESS bar */
      var bv = bData[yr];
      var bh = bv >= 0
        ? Math.max(2, (bv / maxVal) * halfH)
        : Math.max(2, (Math.abs(bv) / maxVal) * negH);
      var bBar = el('div', {
        className: 'sirinx-enhancer-chart-bar' + (bv >= 0 ? ' pos' : ' neg'),
        style: {
          height: bh + 'px',
          background: bv >= 0 ? $accent : '#0070B3'
        }
      });
      var bLabel = fmt(Math.abs(bv) >= 1000000 ? Math.round(Math.abs(bv) / 100000) / 10 + 'M' :
                       Math.abs(bv) >= 1000 ? Math.round(Math.abs(bv) / 1000) + 'K' :
                       fmt(Math.abs(bv)));
      bBar.appendChild(el('span', { className: 'bar-val' }, bLabel));
      col.appendChild(bBar);

      chartBody.appendChild(col);

      /* X-axis label */
      chartX.appendChild(el('span', {}, years[yr]));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  12. LINE message builder                                          */
  /* ------------------------------------------------------------------ */
  function sendToLine() {
    var r = calcCurrent();
    if (!r) return;

    var monthlyBill = numVal(monthlyBillInput);
    var area = numVal(areaInput);
    var typeLabel = currentType.label;
    var sizeStr = fmtKw(r.lowSize) + '-' + fmtKw(r.highSize) + ' kWp';
    var savingStr = fmt(r.lowSaving) + '-' + fmt(r.highSaving) + ' \u0E1A\u0E32\u0E17/\u0E40\u0E14\u0E37\u0E2D\u0E19';
    var paybackStr = r.fastPayback.toFixed(1) + '-' + r.slowPayback.toFixed(1) + ' \u0E1B\u0E35';

    var msg = '\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A \u0E17\u0E35\u0E21 SIRINX \u2014 \u0E1C\u0E21\u0E2A\u0E19\u0E43\u0E08 ' + typeLabel +
      ' \u0E25\u0E14\u0E04\u0E48\u0E32\u0E44\u0E1F \u0E04\u0E48\u0E32\u0E44\u0E1F\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E40\u0E2A\u0E23\u0E34\u0E08\u0E15\u0E49\u0E19\u0E17\u0E38\u0E19 ~' + fmt(monthlyBill) + ' \u0E1A\u0E32\u0E17 \u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 ~' + fmt(area) + ' \u0E15\u0E23.\u0E21. ' +
      '\u0E0A\u0E48\u0E27\u0E07 ROI \u0E17\u0E35\u0E48\u0E04\u0E33\u0E19\u0E27\u0E13\u0E44\u0E14\u0E49: ' + sizeStr +
      ', \u0E1B\u0E23\u0E30\u0E2B\u0E22\u0E31\u0E14 ' + savingStr +
      ', \u0E04\u0E37\u0E19\u0E17\u0E38\u0E19 ' + paybackStr +
      '  \u0E0A\u0E48\u0E27\u0E22\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E21\u0E21\u0E15\u0E34\u0E10\u0E32\u0E19\u0E41\u0E25\u0E30\u0E41\u0E19\u0E30\u0E19\u0E33\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E04\u0E23\u0E31\u0E1A';

    var encoded = encodeURIComponent(msg);
    var url = LINE_CHAT_URL + encoded;
    window.open(url, '_blank');
  }

  /* ------------------------------------------------------------------ */
  /*  13. Wire up input listeners                                       */
  /* ------------------------------------------------------------------ */
  var inputs = [monthlyBillInput, areaInput, daytimeUseInput, electricityRateInput];
  inputs.forEach(function (input) {
    input.addEventListener('input', fullUpdate);
    input.addEventListener('change', fullUpdate);
  });

  /* ------------------------------------------------------------------ */
  /*  14. Initial render                                                */
  /* ------------------------------------------------------------------ */
  fullUpdate();

})();
