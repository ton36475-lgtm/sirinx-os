/**
 * GHOSTCLAW Worker Heartbeat System
 *
 * Tracks per-worker heartbeat state to verify worker liveness.
 * Each worker_id has a timestamped heartbeat record.
 * Workers that miss heartbeat intervals are flagged as stale.
 *
 * ES Module — import/export syntax.
 */

// ─── Heartbeat Manager ─────────────────────────────────────────────

class WorkerHeartbeat {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.defaultIntervalMs=30000] - Expected heartbeat interval in ms.
   * @param {number} [opts.staleThresholdMs=90000]  - Threshold after which a worker is considered stale.
   */
  constructor(opts = {}) {
    this.defaultIntervalMs = opts.defaultIntervalMs ?? 30_000;
    this.staleThresholdMs = opts.staleThresholdMs ?? 90_000;

    /** @type {Map<string, { workerId: string, lastBeat: number, beatCount: number, status: string, intervalMs: number }>} */
    this.records = new Map();

    /** @type {Array<{ workerId: string, timestamp: number, status: string }>} */
    this.history = [];
  }

  /**
   * Register (or re-register) a worker for heartbeat tracking.
   * @param {string} workerId
   * @param {number} [intervalMs] - Custom interval for this worker.
   */
  register(workerId, intervalMs) {
    this.records.set(workerId, {
      workerId,
      lastBeat: 0,
      beatCount: 0,
      status: 'pending',
      intervalMs: intervalMs || this.defaultIntervalMs
    });
  }

  /**
   * Record a heartbeat for a worker.
   * @param {string} workerId
   * @param {Object} [beatData] - Optional extra data from the worker.
   * @returns {{ workerId: string, timestamp: number, beatCount: number, status: string }}
   */
  beat(workerId, beatData = {}) {
    let record = this.records.get(workerId);

    if (!record) {
      this.register(workerId);
      record = this.records.get(workerId);
    }

    const timestamp = beatData.timestamp || Date.now();

    record.lastBeat = timestamp;
    record.beatCount++;
    record.status = 'alive';

    // Append to ring-buffer history (cap at 1000 entries)
    this.history.push({
      workerId,
      timestamp,
      status: 'alive',
      ...beatData
    });
    if (this.history.length > 1000) {
      this.history.shift();
    }

    return {
      workerId,
      timestamp,
      beatCount: record.beatCount,
      status: 'alive'
    };
  }

  /**
   * Check whether a worker's heartbeat is stale (missed interval).
   * @param {string} workerId
   * @returns {boolean}
   */
  isStale(workerId) {
    const record = this.records.get(workerId);
    if (!record || record.lastBeat === 0) return true;

    const elapsed = Date.now() - record.lastBeat;
    return elapsed > this.staleThresholdMs;
  }

  /**
   * Get the heartbeat state for a specific worker.
   * @param {string} workerId
   * @returns {Object|null}
   */
  getState(workerId) {
    const record = this.records.get(workerId);
    if (!record) return null;

    const stale = this.isStale(workerId);
    return {
      workerId: record.workerId,
      lastBeat: record.lastBeat,
      beatCount: record.beatCount,
      status: stale ? 'stale' : record.status,
      stale: stale,
      intervalMs: record.intervalMs
    };
  }

  /**
   * Get all registered workers' heartbeat states.
   * @returns {Object[]}
   */
  getAllStates() {
    return Array.from(this.records.keys()).map(id => this.getState(id));
  }

  /**
   * Get all workers that are currently stale.
   * @returns {Object[]}
   */
  getStaleWorkers() {
    return this.getAllStates().filter(s => s.stale);
  }

  /**
   * Mark a worker as stopped (no longer sending heartbeats).
   * @param {string} workerId
   */
  stop(workerId) {
    const record = this.records.get(workerId);
    if (record) {
      record.status = 'stopped';
    }
  }

  /**
   * Remove a worker from heartbeat tracking.
   * @param {string} workerId
   */
  unregister(workerId) {
    this.records.delete(workerId);
  }

  /**
   * Get recent heartbeat history (optionally filtered by workerId).
   * @param {string} [workerId] - If provided, filter to this worker only.
   * @param {number} [limit=100] - Maximum number of history entries to return.
   * @returns {Object[]}
   */
  getHistory(workerId, limit = 100) {
    let entries = this.history;
    if (workerId) {
      entries = entries.filter(e => e.workerId === workerId);
    }
    return entries.slice(-limit);
  }

  /**
   * Sweep: detect stale workers and mark them.
   * @returns {string[]} - Array of worker IDs that were marked stale.
   */
  sweep() {
    const newlyStale = [];

    for (const [workerId, record] of this.records) {
      if (record.status === 'stopped') continue;

      const elapsed = Date.now() - record.lastBeat;
      if (record.lastBeat > 0 && elapsed > this.staleThresholdMs) {
        record.status = 'stale';
        newlyStale.push(workerId);
      }
    }

    return newlyStale;
  }
}

// ─── Export ────────────────────────────────────────────────────────

export { WorkerHeartbeat };
export default WorkerHeartbeat;