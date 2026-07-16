/* Vibe Coding Sidebar React Component
 * Shows live status of 3 coding lanes
 */

import React, { useState, useEffect } from 'react';
import { VIBE_SIDEBAR } from '../.vibe-coding/sidebar-layout';

interface LaneStatus {
  state: 'working' | 'idle' | 'error' | 'awaiting';
  last_output?: string;
}

interface SidebarProps {
  className?: string;
}

export function VibeCodingSidebar({ className = '' }: SidebarProps) {
  const [lanes, setLanes] = useState<Record<string, LaneStatus>>({});
  const [activeTask, setActiveTask] = useState('');

  useEffect(() => {
    // Poll live status every 5s
    const pollStatus = async () => {
      try {
        const res = await fetch('/api/vibe-coding/status');
        const data = await res.json();
        setLanes(data.lanes || {});
      } catch (e) {
        // Fallback demo data
        setLanes({
          'codex-lane': { state: 'working', last_output: 'Edit services/api-gateway/routes.ts' },
          'opencode-lane': { state: 'working', last_output: 'Edit apps/dev-dashboard/components/LaneStatus.tsx' },
          'hermes-lane': { state: 'idle', last_output: 'Monitoring lanes...' },
        });
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const indicators = {
    working: '■',
    idle: '○',
    error: '▲',
    awaiting: '▶',
  };

  return (
    <aside className={`vibe-sidebar ${className}`}>
      <style jsx>{`
        .vibe-sidebar {
          display: flex;
          width: 100%;
          height: 100vh;
          background: #111;
          color: #eee;
        }
        .lane {
          flex: 1;
          padding: 1rem;
          border-right: 1px solid #333;
          overflow: hidden;
        }
        .lane:last-child {
          border-right: none;
        }
        .lane-header {
          font-weight: bold;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #444;
        }
        .status-indicator {
          font-size: 1.2rem;
          margin-right: 0.5rem;
        }
        .lane-content {
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .lane-label {
          display: block;
          margin-top: 0.5rem;
          color: #888;
        }
      `}</style>

      {VIBE_SIDEBAR.layout.lanes.map((lane) => (
        <div key={lane.id} className="lane">
          <div className="lane-header" style={{ color: lane.color }}>
            <span className="status-indicator">
              {indicators[lanes[lane.id]?.state || 'idle']}
            </span>
            {lane.name}
          </div>
          <div className="lane-content">
            <span className="lane-label">Role: {lane.role}</span>
            <span className="lane-label">Branch: {lane.branch}</span>
            <pre>{lanes[lane.id]?.last_output?.slice(0, 100) || 'idle...'}</pre>
          </div>
        </div>
      ))}
    </aside>
  );
}

// Lane orchestration hook
export function useVibeCodingLanes() {
  const dispatch = async (lane: string, task: string) => {
    const res = await fetch('/api/vibe-coding/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane, task }),
    });
    return res.json();
  };

  return { dispatch };
}