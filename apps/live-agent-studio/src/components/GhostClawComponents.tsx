/**
 * GHOSTCLAW_LOOP_ENGINEERING - React Components
 * Phase 2C: Full UI Build
 */

import React from 'react';

// AgentCard Component
interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    role: string;
    status: string;
    lastHeartbeat?: string;
  };
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const statusColors: Record<string, string> = {
    idle: 'bg-gray-200',
    running: 'bg-green-500 animate-pulse',
    completed: 'bg-blue-500',
    error: 'bg-red-500'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{agent.name}</h3>
        <span className={`w-3 h-3 rounded-full ${statusColors[agent.status] || 'bg-gray-400'}`} />
      </div>
      <p className="text-sm text-gray-600 mt-1">Role: {agent.role}</p>
      <p className="text-xs text-gray-400 mt-2">ID: {agent.id.slice(0, 8)}...</p>
    </div>
  );
};

// ApprovalQueuePanel Component
interface ApprovalQueueItem {
  id: string;
  taskType: string;
  description: string;
  status: string;
  createdAt: string;
}

interface ApprovalQueuePanelProps {
  items: ApprovalQueueItem[];
}

export const ApprovalQueuePanel: React.FC<ApprovalQueuePanelProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Approval Queue</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-gray-400">No pending tasks</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <span className="font-medium">{item.taskType}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">{item.status}</span>
              </div>
              <p className="text-sm mt-1">{item.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// MultiAgentMonitor Component
interface AgentMonitorProps {
  agents: AgentCardProps['agent'][];
}

export const MultiAgentMonitor: React.FC<AgentMonitorProps> = ({ agents }) => {
  const activeCount = agents.filter(a => a.status === 'running').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Agent Monitor</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-gray-600">Total Agents</p>
          <p className="text-2xl font-bold">{agents.length}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Idle</p>
          <p className="text-2xl font-bold">{idleCount}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
};

// APIStatusPanel Component
interface APIStatusProps {
  endpoints: { path: string; method: string; status: number; latency: number }[];
}

export const APIStatusPanel: React.FC<APIStatusProps> = ({ endpoints }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">API Status</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left">Endpoint</th>
            <th className="text-left">Method</th>
            <th className="text-right">Latency</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="font-mono text-xs">{ep.path}</td>
              <td>
                <span className={`px-2 py-1 rounded text-xs ${
                  ep.method === 'GET' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {ep.method}
                </span>
              </td>
              <td className="text-right font-mono">{ep.latency}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};