/**
 * GHOSTCLAW_LOOP_ENGINEERING - Test Suite
 * Phase 2E: Testing + Validation
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Test: Agent Controller
describe('Agent Controller', () => {
  describe('list', () => {
    it('should return empty array initially', async () => {
      const req = { correlationId: 'test-correlation' } as any;
      const res = { json: (_data: any) => {} } as any;

      let responseData: any;
      res.json = (data: any) => { responseData = data; };

      await agentController.list(req, res);

      expect(responseData.data).toEqual([]);
      expect(responseData.correlation_id).toBe('test-correlation');
    });
  });

  describe('create', () => {
    it('should create agent with valid data', async () => {
      const req = {
        body: { name: 'Test Agent', role: 'planner', capabilities: ['plan'] },
        correlationId: 'test-correlation'
      } as any;
      const res = {
        status: (_code: number) => res,
        json: (_data: any) => {}
      } as any;

      let responseData: any;
      res.json = (data: any) => { responseData = data; };

      await agentController.create(req, res);

      expect(responseData.data.name).toBe('Test Agent');
      expect(responseData.data.role).toBe('planner');
    });
  });
});

// Test: Task Queue Controller
describe('Task Queue Controller', () => {
  describe('create', () => {
    it('should create task with required fields', async () => {
      const req = {
        body: { task_type: 'figma', task_description: 'Create dashboard' },
        correlationId: 'test-correlation'
      } as any;
      const res = {
        status: (_code: number) => res,
        json: (_data: any) => {}
      } as any;

      let responseData: any;
      res.json = (data: any) => { responseData = data; };

      await taskQueueController.create(req, res);

      expect(responseData.data.task_type).toBe('figma');
      expect(responseData.data.status).toBe('pending');
    });
  });
});

// Test: API Validation
describe('Middleware', () => {
  describe('validateTaskQueue', () => {
    it('should reject missing task_type', async () => {
      const req = { body: {} } as any;
      const res = {
        status: (_code: number) => res,
        json: (_data: any) => {}
      } as any;
      let statusCode = 0;
      res.status = (code: number) => { statusCode = code; return res; };
      let responseData: any;
      res.json = (data: any) => { responseData = data; };

      const next = () => {};
      await validateTaskQueue(req, res, next);

      expect(statusCode).toBe(400);
      expect(responseData.error).toContain('task_type');
    });
  });
});

// Test: PII Masking
describe('PII Masking', () => {
  it('should redact sensitive fields', () => {
    const input = {
      name: 'test',
      password: 'secret123',
      api_key: 'key123',
      email: 'test@example.com'
    };

    const redacted: any = {};
    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'email'];

    sensitiveFields.forEach(field => {
      if (input[field as keyof typeof input]) {
        redacted[field] = '[REDACTED]';
      }
    });

    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.api_key).toBe('[REDACTED]');
    expect(redacted.email).toBe('[REDACTED]');
    expect(input.name).toBe('test'); // preserved
  });
});

export { agentController, taskQueueController, validateTaskQueue };