// packages/types/src/worker-interfaces.mjs
// P004: Worker interface scaffold + mock implementations
// NO live accounts, NO external messages, NO downloaded models

// ═══════════════════════════════════════════════════════════
// WORKER BASE — all workers extend this
// ═══════════════════════════════════════════════════════════
export const WorkerStatus = Object.freeze({
  IDLE: 'idle',
  EXECUTING: 'executing',
  STALLED: 'stalled',
  WAITING_HUMAN_AUTH: 'waiting_human_auth',
  WAITING_LOCAL_NODE: 'waiting_local_node',
  FAILED: 'failed',
  COMPLETE: 'complete'
});

export const WorkerResult = Object.freeze({
  PROPOSAL: 'proposal',
  CHECKPOINT: 'checkpoint',
  RESULT: 'result',
  EVIDENCE: 'evidence',
  FAILURE: 'failure',
  ROLLBACK_RESULT: 'rollback_result',
  STALLED: 'stalled'
});

// ═══════════════════════════════════════════════════════════
// BROWSER WORKER INTERFACE
// ═══════════════════════════════════════════════════════════
export class BrowserWorkerInterface {
  constructor({ workerId, profileRef, siteAdapters }) {
    this.workerId = workerId;
    this.profileRef = profileRef;  // never cookies, just ref
    this.siteAdapters = siteAdapters || new Map();
    this.status = WorkerStatus.IDLE;
  }

  async execute(capability, action) { throw new Error('not_implemented'); }
  async verifyReadonly(postState) { throw new Error('not_implemented'); }
  getStatus() { return this.status; }
}

// ═══════════════════════════════════════════════════════════
// CLOUD WORKER INTERFACE
// ═══════════════════════════════════════════════════════════
export class CloudWorkerInterface {
  constructor({ workerId }) {
    this.workerId = workerId;
    this.status = WorkerStatus.IDLE;
  }

  async acceptBundle(signedBundle) { throw new Error('not_implemented'); }
  async execute(jobBundle) { throw new Error('not_implemented'); }
  async checkpoint(state) { throw new Error('not_implemented'); }
  getStatus() { return this.status; }
}

// ═══════════════════════════════════════════════════════════
// RESEARCH WORKER INTERFACE
// ═══════════════════════════════════════════════════════════
export class ResearchWorkerInterface {
  constructor({ workerId }) {
    this.workerId = workerId;
    this.status = WorkerStatus.IDLE;
  }

  async search(query, options) { throw new Error('not_implemented'); }
  async open(sourceId) { throw new Error('not_implemented'); }
  async find(claim) { throw new Error('not_implemented'); }
  async buildBundle(results) { throw new Error('not_implemented'); }
  getStatus() { return this.status; }
}

// ═══════════════════════════════════════════════════════════
// MOCK BROWSER WORKER — for testing
// ═══════════════════════════════════════════════════════════
export class MockBrowserWorker extends BrowserWorkerInterface {
  constructor() {
    super({ workerId: 'mock-browser', profileRef: 'mock-profile-ref', siteAdapters: new Map() });
    this.mutationCounter = 0;
    this.callLog = [];
  }

  async execute(capability, action) {
    this.callLog.push({ action, capabilityId: capability?.capabilityId, timestamp: new Date().toISOString() });
    this.status = WorkerStatus.EXECUTING;

    // Simulate read-only
    if (action.type === 'read') {
      return {
        result: WorkerResult.RESULT,
        data: { metrics: { sales: 100, stock: 50, orders: 5 } },
        mutationCounter: this.mutationCounter,
        timestamp: new Date().toISOString()
      };
    }

    // Simulate MFA challenge
    if (action.type === 'mfa_challenge') {
      this.status = WorkerStatus.WAITING_HUMAN_AUTH;
      return { result: WorkerResult.STALLED, reason: 'mfa_required' };
    }

    return { result: WorkerResult.FAILURE, reason: 'unknown_action' };
  }

  async verifyReadonly(postState) {
    return this.mutationCounter === 0;
  }

  getMutationCount() { return this.mutationCounter; }
}

// ═══════════════════════════════════════════════════════════
// MOCK CLOUD WORKER
// ═══════════════════════════════════════════════════════════
export class MockCloudWorker extends CloudWorkerInterface {
  constructor() {
    super({ workerId: 'mock-cloud' });
    this.executedBundles = new Set();
  }

  async acceptBundle(bundle) {
    // Reject Tier D/X
    if (bundle.maximumTier === 'D' || bundle.maximumTier === 'X') {
      return { accepted: false, reason: 'tier_too_high_for_cloud' };
    }
    // Reject CONFIDENTIAL/RESTRICTED
    if (bundle.dataClass === 'CONFIDENTIAL' || bundle.dataClass === 'RESTRICTED') {
      return { accepted: false, reason: 'data_class_too_high_for_cloud' };
    }
    return { accepted: true };
  }

  async execute(jobBundle) {
    // Idempotency check
    if (this.executedBundles.has(jobBundle.taskId)) {
      return { result: WorkerResult.RESULT, deduped: true };
    }
    this.executedBundles.add(jobBundle.taskId);
    return { result: WorkerResult.RESULT, output: 'mock_cloud_result' };
  }

  async checkpoint(state) {
    if (!state.canContinueRemotely) {
      this.status = WorkerStatus.WAITING_LOCAL_NODE;
      return { status: 'waiting_local_node' };
    }
    return { status: 'checkpointed' };
  }
}

// ═══════════════════════════════════════════════════════════
// MOCK RESEARCH WORKER
// ═══════════════════════════════════════════════════════════
export class MockResearchWorker extends ResearchWorkerInterface {
  constructor() {
    super({ workerId: 'mock-research' });
    this.corpus = new Map();
  }

  async search(query) {
    return [{ sourceId: 's1', snippet: 'mock result', score: 0.95 }];
  }

  async open(sourceId) {
    return { sourceId, content: 'mock content', sha256: 'abc123' };
  }

  async find(claim) {
    return {
      claimId: 'c1',
      status: 'SUPPORTED',
      sourceIds: ['s1'],
      confidence: 0.9
    };
  }

  async buildBundle(results) {
    return {
      bundleId: 'rb-mock',
      question: results.query || 'unknown',
      asOf: new Date().toISOString(),
      answer: 'mock answer',
      claims: [{
        claimId: 'c1',
        text: 'mock claim',
        confidence: 0.9,
        sourceIds: ['s1'],
        status: 'SUPPORTED'
      }],
      sources: [{
        sourceId: 's1',
        url: 'https://example.com',
        fetchedAt: new Date().toISOString(),
        contentSha256: 'abc123',
        licenseStatus: 'REVIEW'
      }],
      limitations: ['mock_data_only'],
      workerSignature: 'mock-sig'
    };
  }
}

// ═══════════════════════════════════════════════════════════
// EVIDENCE STORE (mock)
// ═══════════════════════════════════════════════════════════
export class MockEvidenceStore {
  constructor() {
    this.artifacts = new Map();
  }

  store(artifact) {
    const id = `art-${Date.now()}`;
    this.artifacts.set(id, {
      ...artifact,
      artifactId: id,
      storedAt: new Date().toISOString(),
      ttl: 86400000 // 24h
    });
    return id;
  }

  retrieve(id) {
    return this.artifacts.get(id);
  }

  getHash(id) {
    const art = this.artifacts.get(id);
    return art?.contentHash;
  }
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION RELAY (mock) — redacted only
// ═══════════════════════════════════════════════════════════
export class MockNotificationRelay {
  constructor() {
    this.sent = [];
  }

  send(notification) {
    // Redact all business data
    const redacted = {
      type: notification.type,
      severity: notification.severity,
      reportRef: notification.reportRef,
      timestamp: new Date().toISOString()
    };
    this.sent.push(redacted);
    return { status: 'sent', redacted: true };
  }

  getSent() { return this.sent; }
}