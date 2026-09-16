// packages/types/src/ghostclaw-threat-model.mjs
// P003: Threat Model — complete threat-to-control-to-test matrix
// Maps every threat to prevention, detection, response, and test

export const THREAT_MODEL = Object.freeze([
  // ═══ Browser Threats ═══
  {
    id: 'T-B01',
    threat: 'Browser prompt injection from page content',
    vector: 'Hidden instructions in webpage DOM/text cause unauthorized tool call',
    prevention: 'Label all page content UNTRUSTED_PAGE_DATA; no instruction extraction from page',
    detection: 'Tool call origin validator; page content hash comparison',
    response: 'Block tool call; STALLED; alert operator',
    test: 'Inject hidden instruction in synthetic page; assert no tool call'
  },
  {
    id: 'T-B02',
    threat: 'UI drift / selector ambiguity',
    vector: 'Website layout changes break semantic selectors',
    prevention: 'Semantic action contracts; post-state verification',
    detection: 'Selector match confidence < threshold; DOM hash mismatch',
    response: 'STALLED; no guessing clicks',
    test: 'Mutate synthetic page layout; assert STALLED'
  },
  {
    id: 'T-B03',
    threat: 'Cross-tenant account confusion',
    vector: 'Worker reads wrong tenant dashboard',
    prevention: 'Domain/tenant/account verification before each operation',
    detection: 'Account mismatch in post-state read-back',
    response: 'Abort; WAITING_HUMAN_AUTH; audit event',
    test: 'Switch tenant in synthetic page; assert abort'
  },
  {
    id: 'T-B04',
    threat: 'Session/cookie theft via debug API',
    vector: 'Debug/devtools endpoint exposes cookies/tokens',
    prevention: 'No API exports cookies/session; disable upload/download/clipboard',
    detection: 'Network audit; no export endpoints registered',
    response: 'Revoke profile; PANIC',
    test: 'Attempt cookie export via API; assert blocked'
  },
  {
    id: 'T-B05',
    threat: 'MFA/CAPTCHA bypass attempt',
    vector: 'Worker encounters MFA and guesses/bypasses',
    prevention: 'MFA/CAPTCHA = WAITING_HUMAN_AUTH; no retry',
    detection: 'MFA challenge page detected',
    response: 'Pause; notify operator; no bypass',
    test: 'Present MFA page; assert WAITING_HUMAN_AUTH'
  },
  {
    id: 'T-B06',
    threat: 'Redirect to malicious domain',
    vector: 'Page redirects to phishing/credential harvesting domain',
    prevention: 'Domain allowlist; popup/redirect blocker',
    detection: 'URL change outside allowlist triggers abort',
    response: 'Block navigation; STALLED',
    test: 'Attempt redirect to evil.com; assert blocked'
  },

  // ═══ Cloud Worker Threats ═══
  {
    id: 'T-C01',
    threat: 'Data exfiltration via cloud delegate',
    vector: 'Cloud worker sends confidential data externally',
    prevention: 'Pre-signed A/B bundles only; no CONFIDENTIAL/RESTRICTED payload',
    detection: 'Egress monitor; content hash mismatch',
    response: 'Revoke capability; quarantine output',
    test: 'Send CONFIDENTIAL payload to cloud; assert rejected'
  },
  {
    id: 'T-C02',
    threat: 'Duplicate schedule execution',
    vector: 'Network glitch triggers same schedule twice',
    prevention: 'Dedupe key; overlap policy SKIP',
    detection: 'Idempotency key collision',
    response: 'Skip duplicate; log',
    test: 'Fire same trigger 10x; assert 1 result'
  },
  {
    id: 'T-C03',
    threat: 'Local task runs without local node',
    vector: 'Task needing local browser runs when Mac is offline',
    prevention: 'Checkpoint to WAITING_LOCAL_NODE',
    detection: 'Local node health check fails',
    response: 'Pause; alert; no credential fallback',
    test: 'Simulate offline Mac; assert WAITING_LOCAL_NODE'
  },
  {
    id: 'T-C04',
    threat: 'Uncapped cost/runtime',
    vector: 'Worker runs indefinitely consuming resources',
    prevention: 'max_calls, max_cost_thb, max_runtime_seconds caps',
    detection: 'Budget threshold exceeded',
    response: 'Fail closed; revoke capability',
    test: 'Set max_calls=3; attempt 4th call; assert blocked'
  },

  // ═══ Research Worker Threats ═══
  {
    id: 'T-R01',
    threat: 'Corpus poisoning with malicious content',
    vector: 'Injected document contains hidden instructions or malware',
    prevention: 'Quarantine + malware scan before indexing',
    detection: 'Content hash mismatch; known-bad signature',
    response: 'Quarantine; alert; do not index',
    test: 'Inject poisoned doc; assert quarantined'
  },
  {
    id: 'T-R02',
    threat: 'Uncited material claims',
    vector: 'Research output makes claims without sources',
    prevention: 'Citation verifier; every claim needs source_id',
    detection: 'Citation coverage < 100%',
    response: 'Reject ResearchBundle',
    test: 'Submit bundle with uncited claim; assert rejected'
  },
  {
    id: 'T-R03',
    threat: 'Malicious pickle/remote code',
    vector: 'Index file contains malicious pickle payload',
    prevention: 'No pickle.load; rebuild indexes in sandbox',
    detection: 'Pickle signature in file; trust_remote_code flag',
    response: 'Quarantine; rebuild from source',
    test: 'Attempt to load malicious.pkl; assert blocked'
  },
  {
    id: 'T-R04',
    threat: 'Stale/outdated research',
    vector: 'Current-events query answered from outdated corpus',
    prevention: 'Freshness checker; separate read-only fetcher',
    detection: 'Corpus timestamp older than freshness policy',
    response: 'Flag as STALE; require fresh fetch',
    test: 'Query current event with old corpus; assert STALE flag'
  },
  {
    id: 'T-R05',
    threat: 'Research triggers direct worker action',
    vector: 'Research output tries to invoke browser/cloud',
    prevention: 'Research Worker has no execution tools',
    detection: 'Tool boundary check',
    response: 'Block; research is evidence not authority',
    test: 'Research returns action request; assert new task required'
  },

  // ═══ Governance Threats ═══
  {
    id: 'T-G01',
    threat: 'Self-approval by requester',
    vector: 'Same principal requests and approves Tier C/D',
    prevention: 'requested_by != approved_by enforcement',
    detection: 'Principal comparison in approval validator',
    response: 'Reject approval',
    test: 'Same principal requests+approves; assert rejected'
  },
  {
    id: 'T-G02',
    threat: 'Approval replay attack',
    vector: 'Reuse consumed approval for different action',
    prevention: 'One-time nonce; consumed_at tracking',
    detection: 'Approval already consumed',
    response: 'Reject; audit event',
    test: 'Consume approval then retry; assert rejected'
  },
  {
    id: 'T-G03',
    threat: 'Stale approval after plan change',
    vector: 'Plan changes but old approval is reused',
    prevention: 'plan_hash + scope_hash binding',
    detection: 'Hash mismatch on validation',
    response: 'Reject; require new approval',
    test: 'Change plan after approval; assert rejected'
  },
  {
    id: 'T-G04',
    threat: 'Tier X action receives capability',
    vector: 'Forbidden action somehow gets through classifier',
    prevention: 'Tier X = no capability, no network',
    detection: 'Capability issuance check',
    response: 'Block; QUARANTINED',
    test: 'Request cookie_export capability; assert Tier X'
  },
  {
    id: 'T-G05',
    threat: 'Receipt chain tampering',
    vector: 'Attacker modifies historical receipt',
    prevention: 'Append-only hash chain',
    detection: 'Chain verification detects hash break',
    response: 'Alert; forensic investigation',
    test: 'Modify old receipt; assert chain verification fails'
  },
  {
    id: 'T-G06',
    threat: 'Secret leakage in logs/receipts',
    vector: 'API key or token appears in log output',
    prevention: 'secret_ref only; redaction layer',
    detection: 'Secret scan on all outputs',
    response: 'Redact; alert; rotate if needed',
    test: 'Secret scan returns 0 findings'
  }
]);

export function getThreatModelSummary() {
  return {
    totalThreats: THREAT_MODEL.length,
    categories: {
      browser: THREAT_MODEL.filter(t => t.id.startsWith('T-B')).length,
      cloud: THREAT_MODEL.filter(t => t.id.startsWith('T-C')).length,
      research: THREAT_MODEL.filter(t => t.id.startsWith('T-R')).length,
      governance: THREAT_MODEL.filter(t => t.id.startsWith('T-G')).length
    },
    allHaveTests: THREAT_MODEL.every(t => t.test && t.test.length > 0),
    allHavePrevention: THREAT_MODEL.every(t => t.prevention && t.prevention.length > 0),
    gateStatus: 'COMPLETE'
  };
}