/**
 * GHOSTCLAW_LOOP_ENGINEERING - React Hooks
 * Phase 1C: UI Integration Wiring
 */

import { useState, useEffect } from 'react';

// Hook: useAgents - Fetch agent list
export const useAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dry-run stub - would call /api/agents
    setAgents([
      { id: 'gc-planner-01', name: 'Planner Agent', role: 'planner', status: 'idle' },
      { id: 'gc-frontend-01', name: 'Frontend Agent', role: 'frontend', status: 'idle' },
      { id: 'gc-backend-01', name: 'Backend Agent', role: 'backend', status: 'idle' },
      { id: 'gc-review-01', name: 'Review Agent', role: 'reviewer', status: 'idle' }
    ]);
    setLoading(false);
  }, []);

  return { agents, loading };
};

// Hook: useAgentRuns - Fetch runs for specific agent
export const useAgentRuns = (agentId: string) => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dry-run stub - would call /api/agents/{id}/runs
    setRuns([]);
    setLoading(false);
  }, [agentId]);

  return { runs, loading };
};

// Hook: useTaskQueue - Manage task queue
export const useTaskQueue = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const enqueueTask = async (taskType: string, taskDescription: string, inputData = {}) => {
    // Dry-run stub - would POST /api/task-queue
    const newTask = {
      id: `task-${Date.now()}`,
      task_type: taskType,
      task_description: taskDescription,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  };

  useEffect(() => {
    // Dry-run stub - would GET /api/task-queue
    setTasks([]);
    setLoading(false);
  }, []);

  return { tasks, loading, enqueueTask };
};