const mockCsv = {
  "niches": "niche_id,niche_name,audience,buyer_intent,gift_occasion,seasonality,demand_score,competition_gap_score,ip_safety_score,reusable_asset_score,total_score,status,notes\nNICHE-001,Weekend Pickleball Aunties,Women 35-60 gifting circle,giftable hobby pride,birthday mothers day weekend league,evergreen spring summer,18,14,22,16,87,IP_PRECHECK_GREEN,Original phrase family; avoid league or brand terms.\nNICHE-002,Thai Cafe Cat Dad,Cat owners and cafe culture buyers,identity humor gift,father day birthday,evergreen,16,17,21,15,82,RESEARCHED,Use generic cafe symbols only; no known character style.\nNICHE-003,Solar Engineer Weekend Mode,Solar installers engineers,work pride niche humor,team gift trade show,evergreen,15,16,20,14,78,DESIGN_BRIEF_READY,Original technical humor; avoid company names and certification marks.\nNICHE-004,Retro Garden Club Captain,Gardening clubs and plant lovers,club identity gift,spring garden fairs,spring summer,17,15,23,17,88,IP_PRECHECK_GREEN,Reusable botanical motif pack.\nNICHE-005,Blocked Famous Space Wizard Parody,fantasy fans,trend capture,holiday,seasonal,20,8,5,4,49,IP_PRECHECK_RED_BLOCKED,Blocked because it depends on recognizable protected references.\n",
  "design_pipeline": "design_id,niche_id,design_family,design_phrase,visual_style,product_fit,color_strategy,prompt_version,asset_path,status,created_at,updated_at\nDES-001,NICHE-001,Clean badge,Weekend Pickleball Auntie,bold retro court lines,shirt hoodie tote,white ink plus mint accent,v1,assets/mock/des-001.png,QC_READY,2026-06-30,2026-06-30\nDES-002,NICHE-003,Work humor typographic,Solar Engineer Weekend Mode,minimal icon grid,shirt sticker mug,black ink plus yellow highlight,v1,assets/mock/des-002.png,DESIGN_DRAFT_READY,2026-06-30,2026-06-30\nDES-003,NICHE-004,Vintage club crest,Garden Club Captain,hand drawn herbs and badge,shirt tote apron,forest green cream coral,v1,assets/mock/des-003.png,LISTING_DRAFT_READY,2026-06-30,2026-06-30\n",
  "ip_policy_checks": "check_id,design_id,phrase_checked,trademark_risk,copyright_risk,celebrity_likeness_risk,brand_confusion_risk,sports_team_risk,sensitive_content_risk,keyword_spam_risk,risk_level,required_edits,final_decision,reviewer_notes\nIP-001,DES-001,Weekend Pickleball Auntie,LOW,LOW,NONE,NONE,NONE,LOW,LOW,GREEN,none,ALLOW_DRAFT,Manual trademark search still required before owner publish action.\nIP-002,DES-002,Solar Engineer Weekend Mode,LOW,LOW,NONE,NONE,NONE,LOW,LOW,GREEN,none,ALLOW_DRAFT,Keep company and certifying body names out.\nIP-003,DES-999,Famous Space Wizard Parody,HIGH,HIGH,NONE,HIGH,NONE,LOW,MEDIUM,RED,replace concept entirely,BLOCK,Blocked due to protected-reference dependency.\n",
  "listing_drafts": "listing_id,design_id,product_type,title,brand,bullet_1,bullet_2,description,keyword_cluster,seo_score,policy_score,status\nLIST-001,DES-001,Standard t-shirt,Weekend Pickleball Auntie Shirt,Original Court Gift Co,Original pickleball auntie design for weekend players and family gifts.,Clean readable artwork built for shirts hoodies and casual sports gifts.,A local-first listing draft for an original hobby design. Owner must review policy and rights before publishing.,pickleball aunt gift weekend player,82,90,LISTING_DRAFT_READY\nLIST-002,DES-002,Pullover hoodie,Solar Engineer Weekend Mode Hoodie,Grid Humor Studio,Original solar engineer humor for field teams and technical workers.,Readable front artwork designed for casual work-pride gifting.,\"Draft only. No company names, certifications, or utility marks are used.\",solar engineer gift energy worker hoodie,78,88,DESIGN_DRAFT_READY\nLIST-003,DES-003,Tote bag,Garden Club Captain Tote Bag,Original Garden Badge Co,Original garden club captain design for plant lovers and local clubs.,Vintage badge artwork with clear text and botanical details.,Draft listing for owner review and manual publishing decision.,garden club gift plant lover tote,84,92,PUBLISH_READY_OWNER_ACTION\n",
  "qc_reviews": "qc_id,design_id,spelling_pass,readability_pass,contrast_pass,transparent_background_pass,dpi_size_pass,placement_pass,duplicate_pattern_pass,final_qc_status,reject_reason,fix_notes\nQC-001,DES-001,yes,yes,yes,yes,yes,yes,yes,PASS,none,Ready for listing owner review.\nQC-002,DES-002,yes,yes,needs_review,yes,yes,yes,yes,REVISE,contrast_low_on_dark_products,Increase yellow highlight thickness.\nQC-003,DES-003,yes,yes,yes,yes,yes,yes,yes,PASS,none,Manual final image review still required.\n",
  "traffic_content": "content_id,design_id,channel,language,content_angle,caption,short_video_hook,cta,publish_status,traffic_source_tag,notes\nTRA-001,DES-001,Pinterest,en_US,gift guide,Gift idea for the auntie who never misses a weekend pickleball match.,Three signs your auntie owns the pickleball court.,Save for your next gift list.,DRAFT_ONLY,pin_gift_pick_auntie,No fake engagement and no platform automation.\nTRA-002,DES-002,TikTok,th_TH,creator behind the design,Thai-language creator caption placeholder for an original solar worker merch idea.,Before and after: from field note to shirt concept.,Follow for more original merch ideas.,DRAFT_ONLY,tt_creator_solar,Thai creator content; buyer listing stays English.\nTRA-003,DES-003,Reels,en_US,collection story,\"A garden club captain design for tote bags, aprons, and weekend plant runs.\",Build a small garden gift collection in one visual family.,Save the collection idea.,DRAFT_ONLY,reels_garden_collection,Manual posting only.\n",
  "sales_analytics": "analytics_id,design_id,upload_date,product_type,price,units_sold,royalty,external_traffic_flag,ad_spend,net_profit_estimate,iteration_decision,next_action\nANA-001,DES-001,OWNER_ACTION_PENDING,Standard t-shirt,19.99,0,0,planned,0,0,WAIT_FOR_OWNER_PUBLISH,manual review and owner publish decision\nANA-002,DES-002,OWNER_ACTION_PENDING,Pullover hoodie,34.99,0,0,planned,0,0,REVISE_BEFORE_PUBLISH,fix contrast and rerun QC\nANA-003,DES-003,OWNER_ACTION_PENDING,Tote bag,18.99,0,0,planned,0,0,PUBLISH_READY_OWNER_ACTION,owner manual review\n",
  "production_calendar": "day,date_placeholder,focus,niche_research_target,design_target,qc_target,listing_target,content_target,analytics_task,completion_status\n1,DAY_01,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n2,DAY_02,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n3,DAY_03,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n4,DAY_04,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n5,DAY_05,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n6,DAY_06,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n7,DAY_07,\"Foundation, schema, audit, niche scoring\",20 candidates / 5 selected,3 briefs,audit checklist,2 draft listings,2 draft posts,baseline score setup,TODO\n8,DAY_08,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n9,DAY_09,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n10,DAY_10,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n11,DAY_11,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n12,DAY_12,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n13,DAY_13,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n14,DAY_14,\"Production, design briefs, QC, listing drafts\",10 candidates / 3 selected,5 briefs or drafts,5 reviews,5 draft listings,3 draft posts,QC and listing velocity,TODO\n15,DAY_15,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n16,DAY_16,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n17,DAY_17,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n18,DAY_18,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n19,DAY_19,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n20,DAY_20,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n21,DAY_21,\"Publishing-prep, traffic content, collection expansion\",5 expansion candidates,4 collection variants,4 reviews,4 owner-ready listings,5 draft posts,traffic source tagging,TODO\n22,DAY_22,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n23,DAY_23,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n24,DAY_24,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n25,DAY_25,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n26,DAY_26,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n27,DAY_27,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n28,DAY_28,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n29,DAY_29,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n30,DAY_30,\"Analytics, iteration, retire/scale decisions\",review prior winners,2 iterations,recheck winners and retirees,refresh winners,2 performance posts,winner loser decision review,TODO\n"
};

const state = { data: {}, filters: { status: 'all', risk: 'all', niche: 'all', channel: 'all' } };

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted && ch === '"' && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (!quoted && ch === ',') { row.push(cell); cell = ''; continue; }
    if (!quoted && ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, idx) => [h, r[idx] || ''])));
}

async function loadTable(name) {
  try {
    const response = await fetch('../templates/' + name + '.csv', { cache: 'no-store' });
    if (response.ok) return parseCsv(await response.text());
  } catch (_) {
    // Local file views can block fetch; embedded mock data keeps the dashboard usable.
  }
  return parseCsv(mockCsv[name]);
}

function unique(values) { return [...new Set(values.filter(Boolean))].sort(); }
function asNumber(value) { return Number.parseFloat(value || '0') || 0; }

function populateSelect(id, values) {
  const select = document.getElementById(id);
  const current = select.value;
  select.querySelectorAll('option:not([value="all"])').forEach(option => option.remove());
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(current) ? current : 'all';
}

function filteredNiches() {
  return state.data.niches.filter(row => state.filters.status === 'all' || row.status === state.filters.status)
    .filter(row => state.filters.niche === 'all' || row.niche_id === state.filters.niche);
}
function filteredIp() { return state.data.ip_policy_checks.filter(row => state.filters.risk === 'all' || row.risk_level === state.filters.risk); }

function renderKpis() {
  const greenNiches = state.data.niches.filter(row => row.status === 'IP_PRECHECK_GREEN').length;
  const blocked = state.data.ip_policy_checks.filter(row => row.risk_level === 'RED').length;
  const briefs = state.data.design_pipeline.filter(row => ['DESIGN_BRIEF_READY','DESIGN_DRAFT_READY','QC_READY','LISTING_DRAFT_READY'].includes(row.status)).length;
  const qcPass = state.data.qc_reviews.filter(row => row.final_qc_status === 'PASS').length;
  const qcRate = state.data.qc_reviews.length ? Math.round((qcPass / state.data.qc_reviews.length) * 100) : 0;
  const listingReady = state.data.listing_drafts.filter(row => row.status === 'LISTING_DRAFT_READY').length;
  const publishReady = state.data.listing_drafts.filter(row => row.status === 'PUBLISH_READY_OWNER_ACTION').length;
  const estimated = Math.max(0, greenNiches * 8);
  const cards = [
    ['Total niches', state.data.niches.length],
    ['Greenlight niches', greenNiches],
    ['Blocked IP risk', blocked],
    ['Design briefs ready', briefs],
    ['QC pass rate', qcRate + '%'],
    ['Listing ready count', listingReady],
    ['Owner-action ready', publishReady],
    ['Est. monthly output', estimated]
  ];
  document.getElementById('kpis').innerHTML = cards.map(([label, value]) => `<div class="kpi"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function table(rows, columns) {
  if (!rows.length) return '<p class="empty">No rows match current filters.</p>';
  return `<table><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(c => `<td>${row[c] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderNiches() {
  const rows = filteredNiches().sort((a, b) => asNumber(b.total_score) - asNumber(a.total_score));
  document.getElementById('nicheTable').innerHTML = table(rows, ['niche_id','niche_name','audience','buyer_intent','total_score','status','notes']);
}

function renderPipeline() {
  const groups = ['DESIGN_BRIEF_READY','DESIGN_DRAFT_READY','QC_READY','LISTING_DRAFT_READY','PUBLISH_READY_OWNER_ACTION'];
  document.getElementById('pipelineBoard').innerHTML = groups.map(group => {
    const items = state.data.design_pipeline.filter(row => row.status === group);
    return `<div class="lane"><h3>${group}</h3>${items.map(item => `<div class="mini-card"><strong>${item.design_id}</strong><span>${item.design_phrase}</span><small>${item.product_fit}</small></div>`).join('') || '<p class="empty">Empty</p>'}</div>`;
  }).join('');
}

function renderQueues() {
  document.getElementById('ipQueue').innerHTML = filteredIp().map(row => `<div class="risk ${row.risk_level.toLowerCase()}"><strong>${row.risk_level}</strong><span>${row.phrase_checked}</span><small>${row.final_decision}: ${row.required_edits}</small></div>`).join('');
  document.getElementById('qcQueue').innerHTML = state.data.qc_reviews.map(row => `<div class="risk ${row.final_qc_status === 'PASS' ? 'green' : 'yellow'}"><strong>${row.final_qc_status}</strong><span>${row.design_id}</span><small>${row.fix_notes}</small></div>`).join('');
}

function renderListings() { document.getElementById('listingStatus').innerHTML = table(state.data.listing_drafts, ['listing_id','design_id','product_type','title','seo_score','policy_score','status']); }
function renderCalendar() { document.getElementById('calendar').innerHTML = state.data.production_calendar.map(row => `<div class="day"><strong>Day ${row.day}</strong><span>${row.focus}</span><small>${row.design_target} / ${row.analytics_task}</small></div>`).join(''); }
function renderAnalytics() { document.getElementById('analyticsBoard').innerHTML = table(state.data.sales_analytics, ['analytics_id','design_id','product_type','price','units_sold','royalty','iteration_decision','next_action']); }

function render() {
  populateSelect('statusFilter', unique([...state.data.niches.map(r => r.status), ...state.data.design_pipeline.map(r => r.status), ...state.data.listing_drafts.map(r => r.status)]));
  populateSelect('riskFilter', unique(state.data.ip_policy_checks.map(r => r.risk_level)));
  populateSelect('nicheFilter', unique(state.data.niches.map(r => r.niche_id)));
  populateSelect('channelFilter', unique(state.data.traffic_content.map(r => r.channel)));
  renderKpis(); renderNiches(); renderPipeline(); renderQueues(); renderListings(); renderCalendar(); renderAnalytics();
}

function exportVisibleCsv() {
  const rows = filteredNiches();
  const columns = ['niche_id','niche_name','audience','buyer_intent','total_score','status','notes'];
  const csv = [columns.join(','), ...rows.map(row => columns.map(col => '"' + String(row[col] || '').replaceAll('"', '""') + '"').join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'visible_niches.csv'; link.click();
  URL.revokeObjectURL(url);
}

async function init() {
  for (const name of Object.keys(mockCsv)) state.data[name] = await loadTable(name);
  ['statusFilter','riskFilter','nicheFilter','channelFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', event => {
      const key = id.replace('Filter', '');
      state.filters[key] = event.target.value;
      render();
    });
  });
  document.getElementById('exportVisible').addEventListener('click', exportVisibleCsv);
  render();
}

init();
