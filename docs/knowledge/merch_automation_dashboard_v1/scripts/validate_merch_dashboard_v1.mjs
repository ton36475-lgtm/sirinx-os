import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'docs/knowledge/merch_automation_dashboard_v1');
const rel = p => path.join(base, p);
const requiredFiles = [
  "README.md",
  "MERCH_AUTOMATION_DASHBOARD_V1.md",
  "ARCHITECTURE.md",
  "OPERATING_RULES.md",
  "RELEASE_GATE_LOCAL.md",
  "schema/google_sheets_schema.csv",
  "schema/airtable_base_schema.json",
  "schema/database_schema.json",
  "schema/status_taxonomy.json",
  "templates/niche_candidates.csv",
  "templates/design_pipeline.csv",
  "templates/ip_policy_checks.csv",
  "templates/listing_drafts.csv",
  "templates/qc_reviews.csv",
  "templates/traffic_content.csv",
  "templates/sales_analytics.csv",
  "templates/production_calendar_30_day.csv",
  "prompts/PROMPT_PACK.md",
  "prompts/NICHE_RESEARCH_PROMPTS.md",
  "prompts/DESIGN_BRIEF_PROMPTS.md",
  "prompts/IP_GUARDIAN_PROMPTS.md",
  "prompts/LISTING_SEO_PROMPTS.md",
  "prompts/TRAFFIC_CONTENT_PROMPTS.md",
  "qc/QC_CHECKLIST.md",
  "qc/IP_POLICY_CHECKLIST.md",
  "qc/REJECTION_REASON_TAXONOMY.md",
  "calendar/30_DAY_PRODUCTION_CALENDAR.md",
  "n8n/merch_automation_dashboard_v1.workflow.json",
  "dashboard/index.html",
  "dashboard/assets/app.js",
  "dashboard/assets/style.css",
  "scripts/validate_merch_dashboard_v1.mjs",
  "reports/VALIDATION_REPORT.md",
  "receipts/MERCH_AUTOMATION_DASHBOARD_V1_RECEIPT.json"
];
const requiredPromptSections = [
  "Niche Research Analyst",
  "Buyer Intent Classifier",
  "IP Guardian Strict Reviewer",
  "Design Brief Generator",
  "Typography Design Prompt",
  "Mascot Design Prompt",
  "Listing SEO Writer",
  "QC Reviewer",
  "Traffic Content Planner",
  "Sales Analytics Interpreter",
  "Collection Expansion Planner",
  "Rejection Reason Fixer"
];
const requiredQcSections = [
  "Visual Quality",
  "Print Readiness",
  "Text Accuracy",
  "Readability",
  "Color Contrast",
  "Product Placement",
  "IP/Policy Risk",
  "Listing SEO",
  "Traffic Content Safety",
  "Analytics Logging"
];
const requiredN8nNodes = [
  "Manual Trigger",
  "Load Config",
  "Generate Niche Candidates Mock",
  "Score Niches",
  "IP Guardian Gate",
  "Design Brief Generator",
  "Listing Draft Generator",
  "QC Checklist Builder",
  "Traffic Content Planner",
  "30-Day Calendar Builder",
  "Analytics Decision Rules",
  "Write Local Export Summary",
  "Write A2A Receipt"
];
const failures = [];
const passes = [];
function pass(name) { passes.push(name); }
function fail(name, detail) { failures.push({ name, detail }); }
function read(file) { return fs.readFileSync(rel(file), 'utf8'); }

for (const file of requiredFiles) {
  if (fs.existsSync(rel(file))) pass('exists ' + file);
  else fail('exists ' + file, 'missing required file');
}

for (const file of ['schema/airtable_base_schema.json','schema/database_schema.json','schema/status_taxonomy.json','n8n/merch_automation_dashboard_v1.workflow.json','receipts/MERCH_AUTOMATION_DASHBOARD_V1_RECEIPT.json']) {
  if (!fs.existsSync(rel(file))) continue;
  try { JSON.parse(read(file)); pass('json parses ' + file); }
  catch (error) { fail('json parses ' + file, error.message); }
}

for (const file of requiredFiles.filter(file => file.endsWith('.csv'))) {
  if (!fs.existsSync(rel(file))) continue;
  const firstLine = (read(file).split('\n')[0] || '').replace(/\r$/, '');
  if (firstLine.split(',').filter(Boolean).length >= 2) pass('csv header ' + file);
  else fail('csv header ' + file, 'header has fewer than two columns');
}

if (fs.existsSync(rel('n8n/merch_automation_dashboard_v1.workflow.json'))) {
  const workflow = JSON.parse(read('n8n/merch_automation_dashboard_v1.workflow.json'));
  if (workflow.active === false) pass('n8n inactive'); else fail('n8n inactive', 'workflow must be disabled');
  const names = new Set((workflow.nodes || []).map(node => node.name));
  for (const name of requiredN8nNodes) {
    if (names.has(name)) pass('n8n node ' + name); else fail('n8n node ' + name, 'missing node');
  }
}

const promptPack = fs.existsSync(rel('prompts/PROMPT_PACK.md')) ? read('prompts/PROMPT_PACK.md') : '';
for (const section of requiredPromptSections) {
  if (promptPack.includes('## ' + section)) pass('prompt section ' + section);
  else fail('prompt section ' + section, 'missing prompt section');
}

const qc = fs.existsSync(rel('qc/QC_CHECKLIST.md')) ? read('qc/QC_CHECKLIST.md') : '';
for (const section of requiredQcSections) {
  if (qc.includes('## ' + section)) pass('qc section ' + section);
  else fail('qc section ' + section, 'missing QC section');
}

const calendar = fs.existsSync(rel('calendar/30_DAY_PRODUCTION_CALENDAR.md')) ? read('calendar/30_DAY_PRODUCTION_CALENDAR.md') : '';
const dayCount = (calendar.match(/^## Day \d+/gm) || []).length;
if (dayCount === 30) pass('calendar 30 day entries'); else fail('calendar 30 day entries', 'found ' + dayCount);

const scanFiles = requiredFiles.filter(file => fs.existsSync(rel(file)));
const unsafeParts = [String.fromCharCode(46) + 'env', 'sk' + '-', 'AK' + 'IA', 'BEGIN PRIVATE' + ' KEY', 'TELEGRAM' + '_BOT' + '_TOKEN', 'autoPublish' + 'ToAmazon', 'amazon' + 'Publish(', 'paidProvider' + 'Enabled: true'];
for (const file of scanFiles) {
  const body = read(file);
  for (const marker of unsafeParts) {
    if (body.includes(marker)) fail('safety scan ' + file, 'contains blocked marker ' + marker);
  }
}

if (fs.existsSync(rel('dashboard/index.html')) && fs.existsSync(rel('dashboard/assets/app.js')) && fs.existsSync(rel('dashboard/assets/style.css'))) {
  pass('dashboard static assets present');
}

const report = [
  '# Validation Report',
  '',
  '- Mission: MERCH-DASH-V1-AUTO-20260630-001',
  '- Status: ' + (failures.length ? 'failed' : 'passed'),
  '- Pass count: ' + passes.length,
  '- Failure count: ' + failures.length,
  '',
  '## Failures',
  failures.length ? failures.map(f => '- ' + f.name + ': ' + f.detail).join('\n') : '- none',
  '',
  '## Passed Checks',
  passes.map(p => '- ' + p).join('\n')
].join('\n');
fs.mkdirSync(rel('reports'), { recursive: true });
fs.writeFileSync(rel('reports/VALIDATION_REPORT.md'), report + '\n', 'utf8');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passCount: passes.length }, null, 2));
