/**
 * GHOSTCLAW_LOOP_ENGINEERING - API Middleware
 * Phase 2B: Security + Rate Limiting + Validation
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Middleware: Add correlation_id to every request
export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

// Middleware: Rate limiting
export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientId = req.ip || 'unknown';
  const limit = 100; // requests per window
  const windowMs = 60000; // 1 minute

  // Dry-run stub - would check Redis in production
  console.log(`[RateCheck] ${clientId} - ok for limit ${limit}`);
  next();
};

// Middleware: Input validation for GhostClaw endpoints
export const validateTaskQueue = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { task_type, task_description } = req.body;

  if (!task_type) {
    return res.status(400).json({
      error: 'Missing task_type',
      correlation_id: (req as any).correlationId
    });
  }

  const validTypes = ['figma', 'schema', 'diagram', 'api', 'review', 'deploy'];
  if (!validTypes.includes(task_type)) {
    return res.status(400).json({
      error: `Invalid task_type. Must be one of: ${validTypes.join(', ')}`,
      correlation_id: (req as any).correlationId
    });
  }

  next();
};

// Middleware: PII masking for logs
export const piiMaskMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'email'];
  const sanitized = { ...req.body };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Log sanitized version only
  console.log('[Request]', {
    path: req.path,
    correlation_id: (req as any).correlationId,
    body: sanitized
  });

  next();
};