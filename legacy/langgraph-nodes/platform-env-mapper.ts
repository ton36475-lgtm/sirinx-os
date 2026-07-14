/**
 * LangGraph Node: Platform Environment Variable Mapper
 * Phase 5A - Fleet Orchestrator V2 Core Logic Optimization
 *
 * Routes environment variables to appropriate platform contexts (darwin_arm64, win32-x64-x64)
 */

export interface PlatformEnvContext {
  platform: 'darwin_arm64' | 'win32-x64-x64' | 'linux_x64';
  shell: 'zsh' | 'bash' | 'pwsh';
  pathStyle: 'posix' | 'windows';
  envVars: Record<string, string>;
}

export interface PlatformEnvPayload {
  correlation_id: string;
  target_platform: PlatformEnvContext['platform'];
  variables: Record<string, string>;
  source_node: string;
  timestamp: string;
}

/**
 * Maps environment variables to platform-specific format
 */
export function mapEnvironmentVariables(
  payload: PlatformEnvPayload
): PlatformEnvContext {
  const { target_platform, variables, correlation_id } = payload;

  // Base env vars shared across platforms
  const baseEnv: Record<string, string> = {
    ...variables,
    PLATFORM_CONTEXT: target_platform,
    CORRELATION_ID: correlation_id,
  };

  switch (target_platform) {
    case 'darwin_arm64':
      return {
        platform: 'darwin_arm64',
        shell: 'zsh',
        pathStyle: 'posix',
        envVars: {
          ...baseEnv,
          SHELL: '/bin/zsh',
          PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin',
          THERMAL_PROFILE: 'laptop',
          GPU_PROFILE: 'integrated',
        },
      };

    case 'win32-x64-x64':
      return {
        platform: 'win32-x64-x64',
        shell: 'pwsh',
        pathStyle: 'windows',
        envVars: {
          ...baseEnv,
          SHELL: 'pwsh',
          PATH: 'C:\\Windows\\System32;C:\\Program Files\\nodejs',
          TERM: 'xterm-256color',
        },
      };

    case 'linux_x64':
      return {
        platform: 'linux_x64',
        shell: 'bash',
        pathStyle: 'posix',
        envVars: {
          ...baseEnv,
          SHELL: '/bin/bash',
          PATH: '/usr/local/bin:/usr/bin:/bin',
        },
      };

    default:
      throw new Error(`Unknown platform: ${target_platform}`);
  }
}

/**
 * LangGraph node for environment variable mapping
 */
export function createPlatformEnvNode() {
  return {
    id: 'platform-env-mapper',
    name: 'Platform Environment Mapper',
    execute: async (state: {
      correlation_id: string;
      target_platform: string;
      variables: Record<string, string>;
      execution_metrics?: Record<string, number>;
    }) => {
      const startTime = Date.now();
      const safeMetrics = state.execution_metrics || {};

      const payload: PlatformEnvPayload = {
        correlation_id: state.correlation_id,
        target_platform: state.target_platform as PlatformEnvContext['platform'],
        variables: state.variables || {},
        source_node: 'platform-env-mapper',
        timestamp: new Date().toISOString(),
      };

      const mapped = mapEnvironmentVariables(payload);
      const execution_time_ms = Date.now() - startTime;

      return {
        platform_context: mapped,
        execution_metrics: {
          ...safeMetrics,
          platform_env_mapping_time_ms: execution_time_ms,
        },
      };
    },
  };
}