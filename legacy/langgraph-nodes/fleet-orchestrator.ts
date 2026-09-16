/**
 * Fleet Orchestrator V2 Core Logic
 * Phase 5A - Cross-Platform Remote Execution Abstraction Layer
 *
 * Integrates LangGraph routing with Cloudflare Workers edge layer
 * for hybrid edge-to-local execution orchestration
 */

import { mapEnvironmentVariables, PlatformEnvContext } from './platform-env-mapper';
import {
  createTimingMiddleware,
  validateStateTransitionTiming,
} from './timing-validator';

export interface FleetOrchestratorState {
  correlation_id: string;
  task_id?: string;
  target_platform: 'darwin_arm64' | 'win32-x64-x64' | 'linux_x64';
  execution_payload?: Record<string, unknown>;
  platform_context?: PlatformEnvContext;
  execution_metrics?: Record<string, number>;
  routing_trace?: {
    origin_node: string;
    hop_count: number;
    route_decision?: 'CLOUD_SOL' | 'LOCAL_WORKER';
  };
  // Edge integration fields
  edge_cache_hit?: boolean;
  edge_routing_source?: 'telegram-webhook' | 'api-gateway' | 'scheduler';
}

export interface ExecutionPacket {
  packet_version: string;
  correlation_id: string;
  target_platform: FleetOrchestratorState['target_platform'];
  execution_command: {
    type: 'shell' | 'grpc' | 'ssh';
    payload: string;
    working_directory?: string;
  };
  shell_context: {
    shell_type: string;
    environment_vars: Record<string, string>;
    line_endings: 'lf' | 'crlf';
  };
  routing_trace: {
    origin_node: string;
    hop_count: number;
    route_decision?: FleetOrchestratorState['routing_trace']['route_decision'];
  };
  timestamp: string;
}

/**
 * Main orchestration flow - handles state transitions < 200ms
 */
export class FleetOrchestratorV2 {
  private timingMiddleware = createTimingMiddleware();

  async orchestrate(state: FleetOrchestratorState): Promise<FleetOrchestratorState> {
    const { correlation_id, target_platform } = state;

    // Start timing measurement for state transition
    this.timingMiddleware.start(correlation_id);

    // Step 1: Route to appropriate platform based on state
    const routeDecision = this.determineRoute(state);

    // Step 2: Map environment variables for target platform
    const platformContext = mapEnvironmentVariables({
      correlation_id,
      target_platform,
      variables: state.execution_payload?.env_vars as Record<string, string>,
      source_node: 'fleet-orchestrator-v2',
      timestamp: new Date().toISOString(),
    });

    // Step 3: Build execution packet
    const executionPacket = this.buildExecutionPacket(state, platformContext, routeDecision);

    // End timing measurement
    const metrics = this.timingMiddleware.end(correlation_id);
    const validation = this.timingMiddleware.validate(metrics);

    // Log timing violations (should not block, just warn)
    if (!validation.passed) {
      console.warn(`[FleetOrchestratorV2] Timing violation:`, validation.violations);
    }

    // Extract only numeric metrics
    const numericMetrics: Record<string, number> = {
      state_transition_time_ms: metrics.state_transition_time_ms,
    };

    return {
      ...state,
      platform_context: platformContext,
      execution_metrics: {
        ...(state.execution_metrics ?? {}),
        ...numericMetrics,
      },
      routing_trace: {
        origin_node: 'fleet-orchestrator-v2',
        hop_count: 1,
        route_decision: routeDecision,
      },
      edge_cache_hit: this.detectCacheHit(state),
    };
  }

  /**
   * Determine routing decision based on state analysis
   * Integrates with Cloudflare Worker edge triage logic
   */
  private determineRoute(state: FleetOrchestratorState): 'CLOUD_SOL' | 'LOCAL_WORKER' {
    // Check if this is a local-only operation
    const isLocalOperation =
      state.edge_routing_source !== 'telegram-webhook' &&
      !state.execution_payload?.requires_fast_response;

    // For telegram-webhook traffic, always route to edge first then local
    if (state.edge_routing_source === 'telegram-webhook') {
      return 'LOCAL_WORKER';
    }

    return isLocalOperation ? 'LOCAL_WORKER' : 'CLOUD_SOL';
  }

  /**
   * Detect if edge cache hit occurred
   */
  private detectCacheHit(state: FleetOrchestratorState): boolean {
    // Check if state came from cached context
    return !!state.execution_payload?.use_cached_context;
  }

  /**
   * Build standardized execution packet for downstream dispatch
   */
  private buildExecutionPacket(
    state: FleetOrchestratorState,
    platformContext: PlatformEnvContext,
    routeDecision: 'CLOUD_SOL' | 'LOCAL_WORKER'
  ): ExecutionPacket {
    return {
      packet_version: '1.0.0',
      correlation_id: state.correlation_id,
      target_platform: state.target_platform,
      execution_command: {
        type: 'shell',
        payload: state.execution_payload?.command ?? '',
        working_directory: state.execution_payload?.working_directory,
      },
      shell_context: {
        shell_type: platformContext.shell,
        environment_vars: platformContext.envVars,
        line_endings: platformContext.pathStyle === 'windows' ? 'crlf' : 'lf',
      },
      routing_trace: {
        origin_node: 'fleet-orchestrator-v2',
        hop_count: 1,
        route_decision: routeDecision,
      },
      timestamp: new Date().toISOString(),
    } as ExecutionPacket;
  }

  /**
   * Get timing validation result for a correlation ID
   */
  async validateTiming(correlationId: string): Promise<boolean> {
    const metrics = this.timingMiddleware.end(correlationId);
    const validation = this.timingMiddleware.validate(metrics);
    return validation.passed;
  }
}

/**
 * Factory function for Fleet Orchestrator V2
 */
export function createFleetOrchestratorV2(): FleetOrchestratorV2 {
  return new FleetOrchestratorV2();
}

// Integration point for Telegram webhook processing
export async function processTelegramWebhook(
  update: Record<string, unknown>
): Promise<FleetOrchestratorState> {
  const correlationId =
    (update?.update_id as number) != null
      ? `telegram-${update.update_id}`
      : crypto.randomUUID();

  return {
    correlation_id: correlationId,
    target_platform: 'darwin_arm64', // Default for Mac mini M1
    routing_trace: {
      origin_node: 'telegram-gateway',
      hop_count: 0,
    },
    edge_routing_source: 'telegram-webhook',
  };
}