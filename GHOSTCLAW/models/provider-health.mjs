/**
 * GHOSTCLAW Provider Health Check — Stub
 * Phase 6
 *
 * This module provides a stub health-check interface for model providers.
 * It makes NO real network calls, NO API calls, and reads NO secrets.
 * All health status is static/mock for safe-run development.
 *
 * Constraints (from model-swap-policy.yaml):
 *   - No live provider calls
 *   - No API key reads
 *   - No .env reads
 *   - No model downloads
 *   - No GPU inference
 */

/** Static health status for all registered providers */
const DEFAULT_HEALTH = Object.freeze({
  moonshot_ai: { status: 'unknown', healthy: false, last_check: null, stub: true },
  deepseek: { status: 'unknown', healthy: false, last_check: null, stub: true },
  zhipu_ai: { status: 'unknown', healthy: false, last_check: null, stub: true },
  openai: { status: 'unknown', healthy: false, last_check: null, stub: true },
  anthropic: { status: 'unknown', healthy: false, last_check: null, stub: true },
  ollama: { status: 'unknown', healthy: false, last_check: null, stub: true },
});

/**
 * ProviderHealthCheck — stub health check for model providers.
 *
 * IMPORTANT: This is a stub. No real provider calls are made.
 * The implementation only returns pre-seeded health metadata.
 */
export class ProviderHealthCheck {
  /**
   * @param {Object} [opts]
   * @param {Record<string, Object>} [opts.healthMap] - Pre-seeded health status
   */
  constructor(opts = {}) {
    this.healthMap = opts.healthMap
      ? { ...DEFAULT_HEALTH, ...opts.healthMap }
      : { ...DEFAULT_HEALTH };
  }

  /**
   * Check a provider's health (stub — no real call).
   * @param {string} provider
   * @returns {{ provider: string, status: string, healthy: boolean, last_check: string|null, stub: boolean }}
   */
  check(provider) {
    const entry = this.healthMap[provider];

    if (!entry) {
      return {
        provider,
        status: 'unknown',
        healthy: false,
        last_check: null,
        stub: true,
      };
    }

    return {
      provider,
      ...entry,
    };
  }

  /**
   * Check all providers' health (stub — no real calls).
   * @returns {Record<string, Object>}
   */
  checkAll() {
    const result = {};

    for (const [provider, entry] of Object.entries(this.healthMap)) {
      result[provider] = { ...entry, provider };
    }

    return result;
  }

  /**
   * Manually set a provider's health status (for testing/admin only).
   * @param {string} provider
   * @param {{ status?: string, healthy?: boolean }} status
   */
  setHealth(provider, status) {
    this.healthMap[provider] = {
      ...this.healthMap[provider],
      ...status,
      last_check: new Date().toISOString(),
      stub: true,
    };
  }
}

export default ProviderHealthCheck;