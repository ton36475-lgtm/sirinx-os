/**
 * GHOSTCLAW_LOOP_ENGINEERING - Controllers
 * Phase 2B: API Layer Deep Implementation
 */

// In-memory dry-run store (replaces database in Phase 2A)
const agentStore = new Map();
const taskStore = new Map();
const runStore = new Map();

// Agent Controller
export const agentController = {
  async list(req: any, res: any) {
    const agents = Array.from(agentStore.values());
    res.json({
      data: agents,
      count: agents.length,
      correlation_id: req.correlationId
    });
  },

  async create(req: any, res: any) {
    const { name, role, capabilities } = req.body;
    const id = `agent-${Date.now()}`;

    const agent = {
      id,
      name,
      role,
      capabilities: JSON.stringify(capabilities),
      status: 'idle',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    agentStore.set(id, agent);

    res.status(201).json({
      data: agent,
      correlation_id: req.correlationId
    });
  },

  async updateStatus(req: any, res: any) {
    const { id } = req.params;
    const { status } = req.body;

    const agent = agentStore.get(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    agent.status = status;
    agent.updated_at = new Date().toISOString();
    agentStore.set(id, agent);

    res.json({
      data: agent,
      correlation_id: req.correlationId
    });
  }
};

// Task Queue Controller
export const taskQueueController = {
  async list(req: any, res: any) {
    const tasks = Array.from(taskStore.values());
    res.json({
      data: tasks,
      count: tasks.length,
      correlation_id: req.correlationId
    });
  },

  async create(req: any, res: any) {
    const { task_type, task_description, priority } = req.body;
    const id = `task-${Date.now()}`;

    const task = {
      id,
      task_type,
      description: task_description,
      priority: priority || 100,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    taskStore.set(id, task);

    res.status(201).json({
      data: task,
      correlation_id: req.correlationId
    });
  },

  async assign(req: any, res: any) {
    const { id } = req.params;
    const { agent_id } = req.body;

    const task = taskStore.get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.status = 'assigned';
    task.agent_id = agent_id;
    task.started_at = new Date().toISOString();
    taskStore.set(id, task);

    res.json({
      data: task,
      correlation_id: req.correlationId
    });
  },

  async complete(req: any, res: any) {
    const { id } = req.params;
    const { output } = req.body;

    const task = taskStore.get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.status = 'completed';
    task.output = output;
    task.completed_at = new Date().toISOString();
    taskStore.set(id, task);

    res.json({
      data: task,
      correlation_id: req.correlationId
    });
  }
};

// Agent Run Controller
export const agentRunController = {
  async create(req: any, res: any) {
    const { agent_id, task, model_name } = req.body;
    const id = `run-${Date.now()}`;

    const run = {
      id,
      agent_id,
      task: JSON.stringify(task),
      model_name,
      status: 'running',
      correlation_id: req.correlationId,
      created_at: new Date().toISOString()
    };

    runStore.set(id, run);

    res.status(201).json({
      data: run,
      correlation_id: req.correlationId
    });
  },

  async complete(req: any, res: any) {
    const { id } = req.params;
    const { status, output_tokens, cost_estimate } = req.body;

    const run = runStore.get(id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    run.status = status || 'completed';
    run.output_tokens = output_tokens;
    run.cost_estimate = cost_estimate || 0;
    run.completed_at = new Date().toISOString();
    runStore.set(id, run);

    res.json({
      data: run,
      correlation_id: req.correlationId
    });
  }
};