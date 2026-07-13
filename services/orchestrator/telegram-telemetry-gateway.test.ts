import { describe, expect, it } from 'bun:test';

import { TelegramTelemetryGateway } from './telegram-telemetry-gateway';


describe('TelegramTelemetryGateway', () => {
  const gateway = new TelegramTelemetryGateway(new Set([1001]));

  it('accepts an allow-listed operator status command as preview only', async () => {
    const state = gateway.parseCommand({
      update_id: 42,
      message: { chat: { id: 1001 }, text: '/status' },
    });
    const result = await gateway.dispatch(state);

    expect(result.status).toBe('PREVIEW_ONLY');
    expect(result.mutation_allowed).toBe(false);
    expect(result.execution_target?.action).toBe('status');
    expect(result.telemetry_frame?.payload_signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects a chat outside the operator allowlist', () => {
    expect(() =>
      gateway.parseCommand({
        update_id: 43,
        message: { chat: { id: 2002 }, text: '/status' },
      })
    ).toThrow('Telegram chat is not authorized');
  });

  it('rejects unknown commands without creating a target', async () => {
    const state = gateway.parseCommand({
      update_id: 44,
      message: { chat: { id: 1001 }, text: '/bypass' },
    });
    const result = await gateway.dispatch(state);

    expect(result.status).toBe('REJECTED');
    expect(result.execution_target).toBeUndefined();
    expect(result.mutation_allowed).toBe(false);
  });

  it('requires a bounded identifier for inspect', async () => {
    const state = gateway.parseCommand({
      update_id: 45,
      message: { chat: { id: 1001 }, text: "/inspect task'; rm -rf /" },
    });
    const result = await gateway.dispatch(state);

    expect(result.status).toBe('REJECTED');
    expect(result.error).toContain('safe task identifier');
  });

  it('maps abort to a preview action rather than a mutation', async () => {
    const state = gateway.parseCommand({
      update_id: 46,
      message: { chat: { id: 1001 }, text: '/abort' },
    });
    const result = await gateway.dispatch(state);

    expect(result.execution_target?.action).toBe('abort_preview');
    expect(result.execution_target?.endpoint).toBe('/api/abort-preview');
    expect(result.mutation_allowed).toBe(false);
  });
});
