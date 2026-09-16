/**
 * Phase 5A: Fleet Orchestrator V2 Unit Tests
 * Validates cross-platform orchestration and timing requirements
 */

import { describe, it, expect } from 'vitest';
import { FleetOrchestratorV2, createFleetOrchestratorV2, processTelegramWebhook } from './fleet-orchestrator';
import { mapEnvironmentVariables } from './platform-env-mapper';
import { createTimingMiddleware } from './timing-validator';

describe('FleetOrchestratorV2', () => {
  const orchestrator = createFleetOrchestratorV2();

  it('should initialize correctly', () => {
    expect(orchestrator).toBeInstanceOf(FleetOrchestratorV2);
  });

  it('should process state transitions within 200ms threshold', async () => {
    const state = {
      correlation_id: 'test-5a-transition-001',
      target_platform: 'darwin_arm64' as const,
      execution_payload: {
        command: 'echo "test"',
      },
    };

    const startTime = Date.now();
    const result = await orchestrator.orchestrate(state);
    const elapsedMs = Date.now() - startTime;

    expect(elapsedMs).toBeLessThan(200);
    expect(result.platform_context).toBeDefined();
    expect(result.platform_context?.platform).toBe('darwin_arm64');
    expect(result.routing_trace?.route_decision).toBeDefined();
  });

  it('should route to LOCAL_WORKER for telegram-webhook source', async () => {
    const state = {
      correlation_id: 'test-5a-telegram-route-001',
      target_platform: 'darwin_arm64' as const,
      edge_routing_source: 'telegram-webhook' as const,
      execution_payload: {
        command: '/status',
      },
    };

    const result = await orchestrator.orchestrate(state);

    expect(result.routing_trace?.route_decision).toBe('LOCAL_WORKER');
    expect(result.edge_cache_hit).toBe(false);
  });

  it('should detect cache hit when use_cached_context is true', async () => {
    const state = {
      correlation_id: 'test-5a-cache-hit-001',
      target_platform: 'darwin_arm64' as const,
      execution_payload: {
        command: 'echo "cached"',
        use_cached_context: true,
      },
    };

    const result = await orchestrator.orchestrate(state);

    expect(result.edge_cache_hit).toBe(true);
  });
});

describe('Platform Environment Mapper', () => {
  it('should map environment variables for darwin_arm64', () => {
    const payload = {
      correlation_id: 'test-env-mapper-001',
      target_platform: 'darwin_arm64' as const,
      variables: { CUSTOM_VAR: 'value' },
      source_node: 'test',
      timestamp: new Date().toISOString(),
    };

    const result = mapEnvironmentVariables(payload);

    expect(result.shell).toBe('zsh');
    expect(result.pathStyle).toBe('posix');
    expect(result.envVars.PLATFORM_CONTEXT).toBe('darwin_arm64');
    expect(result.envVars.CORRELATION_ID).toBe('test-env-mapper-001');
    expect(result.envVars.CUSTOM_VAR).toBe('value');
    expect(result.envVars.PATH).toContain('/usr/local/bin');
  });

  it('should map environment variables for win32-x64-x64', () => {
    const payload = {
      correlation_id: 'test-env-mapper-002',
      target_platform: 'win32-x64-x64' as const,
      variables: {},
      source_node: 'test',
      timestamp: new Date().toISOString(),
    };

    const result = mapEnvironmentVariables(payload);

    expect(result.shell).toBe('pwsh');
    expect(result.pathStyle).toBe('windows');
    expect(result.envVars.SHELL).toBe('pwsh');
    expect(result.envVars.PATH).toContain('C:');
  });

  it('should throw error for unknown platform', () => {
    const payload = {
      correlation_id: 'test-env-mapper-003',
      target_platform: 'unknown' as const,
      variables: {},
      source_node: 'test',
      timestamp: new Date().toISOString(),
    };

    expect(() => mapEnvironmentVariables(payload)).toThrow('Unknown platform');
  });
});

describe('Timing Validator', () => {
  it('should validate timing within threshold', () => {
    const middleware = createTimingMiddleware();

    middleware.start('test-timing-001');
    // Simulate fast operation
    const metrics = middleware.end('test-timing-001');
    const validation = middleware.validate(metrics);

    expect(validation.passed).toBe(true);
    expect(validation.transition_time_ms).toBeLessThan(200);
  });

  it('should detect timing violations', () => {
    const middleware = createTimingMiddleware(1); // 1ms threshold

    middleware.start('test-timing-violation-001');
    // Simulate slow operation
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Wait > 1ms
    }
    const metrics = middleware.end('test-timing-violation-001');
    const validation = middleware.validate(metrics);

    expect(validation.passed).toBe(false);
    expect(validation.violations).toBeDefined();
  });
});

describe('Telegram Webhook Processing', () => {
  it('should create state from valid Telegram update', async () => {
    const update = {
      update_id: 12345,
      message: {
        chat: { id: 999 },
        text: '/status',
      },
    };

    const result = await processTelegramWebhook(update);

    expect(result.correlation_id).toBe('telegram-12345');
    expect(result.target_platform).toBe('darwin_arm64');
    expect(result.edge_routing_source).toBe('telegram-webhook');
  });

  it('should generate UUID for update without update_id', async () => {
    const update = {
      message: {
        chat: { id: 999 },
        text: '/status',
      },
    };

    const result = await processTelegramWebhook(update);

    expect(result.correlation_id).toMatch(/^[a-f0-9\-]{36}$/);
    expect(result.target_platform).toBe('darwin_arm64');
  });
});