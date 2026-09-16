/**
 * GHOSTCLAW_LOOP_ENGINEERING - Monitoring Integration
 * Phase 2G: Metrics + Logging + Health
 */

import { Request, Response, NextFunction } from 'express';

// Metrics Collector - Prometheus Style
export class GhostClawMetrics {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  increment(name: string, labels?: Record<string, string>) {
    const key = `${name}_${JSON.stringify(labels || {})}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  observe(name: string, value: number, labels?: Record<string, string>) {
    const key = `${name}_${JSON.stringify(labels || {})}`;
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  set(name: string, value: number, labels?: Record<string, string>) {
    const key = `${name}_${JSON.stringify(labels || {})}`;
    this.gauges.set(key, value);
  }

  // Export metrics for Prometheus scraping
  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(this.histograms),
      gauges: Object.fromEntries(this.gauges)
    };
  }
}

export const metrics = new GhostClawMetrics();

// Logging Utility
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  correlation_id: string;
  agent_id?: string;
  duration_ms?: number;
}

export class GhostClawLogger {
  private logs: LogEntry[] = [];

  info(message: string, context: Partial<LogEntry> = {}) {
    this.log('info', message, context);
  }

  warn(message: string, context: Partial<LogEntry> = {}) {
    this.log('warn', message, context);
  }

  error(message: string, context: Partial<LogEntry> = {}) {
    this.log('error', message, context);
  }

  debug(message: string, context: Partial<LogEntry> = {}) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, context);
    }
  }

  private log(level: LogEntry['level'], message: string, context: Partial<LogEntry> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlation_id: context.correlation_id || 'unknown',
      agent_id: context.agent_id,
      duration_ms: context.duration_ms
    };
    this.logs.push(entry);

    // Console log (PII-safe)
    console.log(`[${level.toUpperCase()}] ${message}`, { correlation_id: entry.correlation_id });
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit);
  }
}

export const logger = new GhostClawLogger();

// Health Check Endpoint
export const healthCheck = (req: Request, res: Response) => {
  const checks = {
    api: 'ok',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    mcp: process.env.MCP_TOOLS_ENABLED ? 'enabled' : 'disabled',
    correlation_id: (req as any).correlationId
  };

  const allOk = Object.values(checks).every(c => c === 'ok' || c === 'configured' || c === 'enabled');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
};

// Metrics middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.route?.path || req.path;

    metrics.increment('http_requests_total', {
      method: req.method,
      status: res.statusCode.toString()
    });

    metrics.observe('http_request_duration_ms', duration);

    logger.info('Request completed', {
      correlation_id: (req as any).correlationId,
      duration_ms: duration
    });
  });

  next();
};