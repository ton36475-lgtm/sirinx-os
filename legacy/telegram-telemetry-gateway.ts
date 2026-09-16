/**
 * SIRINX OS Phase 5B Telegram telemetry preview.
 *
 * This module parses an allow-listed operator command into a non-executing
 * dispatch preview. It does not call Telegram, Redis, tmux, or an orchestrator.
 */

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat?: { id?: number };
    text?: string;
  };
}

export interface TelegramGatewayState {
  correlation_id: string;
  chat_id: number;
  command: string;
  args: string[];
  timestamp: string;
}

export interface TelemetryFrame {
  event_type: 'TELEMETRY_UPDATE';
  routing_trace: {
    origin_node: string;
    target_platform: string;
    target_service: string;
  };
  payload_signature: string;
  active_loop_count: number;
  telemetry_metrics: {
    execution_time_ms: number;
    memory_delta_bytes: number;
    cache_hit_status: 'PENDING';
  };
}

export interface TelegramDispatchPreview {
  status: 'PREVIEW_ONLY' | 'REJECTED';
  state: TelegramGatewayState;
  mutation_allowed: false;
  telemetry_frame?: TelemetryFrame;
  execution_target?: CommandTarget;
  error?: string;
}

interface CommandTarget {
  target_service: string;
  method: 'GET' | 'POST';
  endpoint: string;
  action: 'status' | 'inspect' | 'abort_preview';
}

const COMMAND_DISPATCH: Readonly<Record<string, CommandTarget>> = {
  '/status': {
    target_service: 'hermes-orchestrator',
    method: 'GET',
    endpoint: '/api/status',
    action: 'status',
  },
  '/abort': {
    target_service: 'hermes-orchestrator',
    method: 'POST',
    endpoint: '/api/abort-preview',
    action: 'abort_preview',
  },
  '/inspect': {
    target_service: 'repo-mapper',
    method: 'GET',
    endpoint: '/api/inspect',
    action: 'inspect',
  },
};

const SAFE_ARGUMENT = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function validateArguments(command: string, args: readonly string[]): string | null {
  if (command === '/inspect') {
    if (args.length !== 1 || !SAFE_ARGUMENT.test(args[0])) {
      return '/inspect requires one safe task identifier';
    }
    return null;
  }
  if (args.length > 0) {
    return `${command} does not accept arguments`;
  }
  return null;
}

export class TelegramTelemetryGateway {
  constructor(private readonly allowedChatIds: ReadonlySet<number>) {}

  parseCommand(update: TelegramUpdate): TelegramGatewayState {
    const updateId = update?.update_id;
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text?.trim();

    if (!Number.isSafeInteger(updateId) || updateId < 0) {
      throw new Error('Invalid Telegram update identifier');
    }
    if (!Number.isSafeInteger(chatId) || !this.allowedChatIds.has(chatId as number)) {
      throw new Error('Telegram chat is not authorized');
    }
    if (!text || text.length > 1_024) {
      throw new Error('Invalid Telegram command text');
    }

    const [rawCommand, ...args] = text.split(/\s+/);
    const command = rawCommand.split('@', 1)[0].toLowerCase();
    return {
      correlation_id: `tg-${updateId}`,
      chat_id: chatId as number,
      command,
      args,
      timestamp: new Date().toISOString(),
    };
  }

  async dispatch(state: TelegramGatewayState): Promise<TelegramDispatchPreview> {
    const handler = COMMAND_DISPATCH[state.command];
    if (!handler) {
      return {
        status: 'REJECTED',
        state,
        mutation_allowed: false,
        error: `Unknown command: ${state.command}`,
      };
    }

    const argumentError = validateArguments(state.command, state.args);
    if (argumentError) {
      return {
        status: 'REJECTED',
        state,
        mutation_allowed: false,
        error: argumentError,
      };
    }

    const signatureInput = [
      state.correlation_id,
      String(state.chat_id),
      state.command,
      ...state.args,
    ].join('\n');
    const telemetry: TelemetryFrame = {
      event_type: 'TELEMETRY_UPDATE',
      routing_trace: {
        origin_node: 'telegram-gateway',
        target_platform: 'darwin_arm64',
        target_service: handler.target_service,
      },
      payload_signature: await sha256Hex(signatureInput),
      active_loop_count: 0,
      telemetry_metrics: {
        execution_time_ms: 0,
        memory_delta_bytes: 0,
        cache_hit_status: 'PENDING',
      },
    };

    return {
      status: 'PREVIEW_ONLY',
      state,
      mutation_allowed: false,
      telemetry_frame: telemetry,
      execution_target: handler,
    };
  }

  serializeState(state: TelegramGatewayState): string {
    return JSON.stringify({ ...state, mutation_allowed: false });
  }
}
