/**
 * State Transition Timing Validator
 * Phase 5A - Fleet Orchestrator V2 Core Logic Optimization
 *
 * Validates that state transitions complete within 200ms requirement
 */

export interface TimingMetrics {
  state_transition_time_ms: number;
  platform_env_mapping_time_ms?: number;
  cache_hit_ratio?: number;
  hop_sequence?: string[];
  timestamp: string;
  correlation_id: string;
}

export interface TimingMetricsNumeric {
  state_transition_time_ms: number;
  platform_env_mapping_time_ms?: number;
}

export interface TimingValidationResult {
  valid: boolean;
  transition_time_ms: number;
  threshold_ms: number;
  passed: boolean;
  violations?: string[];
  correlation_id: string;
}

const DEFAULT_THRESHOLD_MS = 200;

/**
 * Validates state transition timing requirement (< 200ms)
 */
export function validateStateTransitionTiming(
  metrics: TimingMetrics,
  thresholdMs: number = DEFAULT_THRESHOLD_MS
): TimingValidationResult {
  const { state_transition_time_ms, correlation_id, hop_sequence } = metrics;
  const violations: string[] = [];

  // Check main transition time
  if (state_transition_time_ms > thresholdMs) {
    violations.push(
      `State transition exceeded ${thresholdMs}ms: ${state_transition_time_ms}ms`
    );
  }

  // Check platform env mapping time if present
  if (
    metrics.platform_env_mapping_time_ms &&
    metrics.platform_env_mapping_time_ms > thresholdMs
  ) {
    violations.push(
      `Platform env mapping exceeded ${thresholdMs}ms: ${metrics.platform_env_mapping_time_ms}ms`
    );
  }

  return {
    valid: violations.length === 0,
    transition_time_ms: state_transition_time_ms,
    threshold_ms: thresholdMs,
    passed: violations.length === 0,
    violations: violations.length > 0 ? violations : undefined,
    correlation_id,
  };
}

/**
 * Creates a timing-measuring middleware wrapper
 */
export function createTimingMiddleware(thresholdMs: number = DEFAULT_THRESHOLD_MS) {
  const measurements: Map<string, number> = new Map();

  return {
    start: (correlationId: string): void => {
      measurements.set(correlationId, Date.now());
    },

    end: (correlationId: string): TimingMetrics => {
      const startTime = measurements.get(correlationId);
      if (!startTime) {
        throw new Error(`No timing measurement found for ${correlationId}`);
      }

      const endTime = Date.now();
      measurements.delete(correlationId);

      return {
        state_transition_time_ms: endTime - startTime,
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      } as TimingMetrics;
    },

    validate: (metrics: TimingMetrics): TimingValidationResult => {
      return validateStateTransitionTiming(metrics, thresholdMs);
    },
  };
}

/**
 * LangGraph node wrapper that enforces timing constraints
 */
export function createTimingEnforcedNode(
  nodeFn: (state: Record<string, unknown>) => Promise<Record<string, unknown>>
) {
  return async (state: Record<string, unknown> & { correlation_id: string }) => {
    const correlationId = state.correlation_id as string;
    const middleware = createTimingMiddleware();

    middleware.start(correlationId);
    const result = await nodeFn(state);
    const metrics = middleware.end(correlationId);
    const validation = middleware.validate(metrics);

    if (!validation.passed) {
      console.warn(
        `[TimingValidator] Violation detected for ${correlationId}:`,
        validation.violations
      );
    }

    const existingMetrics =
      (result?.execution_metrics as Record<string, unknown>) ?? {};

    return {
      ...(result ?? {}),
      execution_metrics: {
        ...existingMetrics,
        state_transition_time_ms: metrics.state_transition_time_ms,
      },
    };
  };
}