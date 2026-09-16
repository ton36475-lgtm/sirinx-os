/**
 * GHOSTCLAW_LOOP_ENGINEERING - Agent Integration Service
 * Phase 2D: Wiring Layer
 */

// Agent Orchestration Service - connects UI to API
class GhostClawOrchestrator {
  private apiBase: string;
  private correlationId: string;

  constructor() {
    this.apiBase = process.env.DEV_CONTROL_API_URL || 'http://localhost:3600';
    this.correlationId = '';
  }

  async initialize() {
    // Initialize connection to API
    const response = await fetch(`${this.apiBase}/health`);
    const data = await response.json();
    this.correlationId = data.correlation_id;
    return data;
  }

  async createAgent(name: string, role: string) {
    const response = await fetch(`${this.apiBase}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': this.correlationId
      },
      body: JSON.stringify({ name, role })
    });
    return response.json();
  }

  async enqueueTask(taskType: string, description: string, priority: number = 100) {
    const response = await fetch(`${this.apiBase}/api/task-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': this.correlationId
      },
      body: JSON.stringify({ task_type: taskType, task_description: description, priority })
    });
    return response.json();
  }

  async runAgentCycle(role: string, task: string) {
    const response = await fetch(`${this.apiBase}/api/ghostclaw/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': this.correlationId
      },
      body: JSON.stringify({ agent_role: role, task_description: task })
    });
    return response.json();
  }
}

export const orchestrator = new GhostClawOrchestrator();

// React Hook: useGhostClawOrchestrator
import { useState, useEffect } from 'react';

export const useGhostClawOrchestrator = () => {
  const [isReady, setIsReady] = useState(false);
  const [correlationId, setCorrelationId] = useState('');

  useEffect(() => {
    orchestrator.initialize().then(data => {
      setIsReady(true);
      setCorrelationId(data.correlation_id);
    });
  }, []);

  return { orchestrator: orchestrator, isReady, correlationId };
};