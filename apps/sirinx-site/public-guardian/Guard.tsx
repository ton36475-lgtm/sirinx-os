import React from 'react';

interface GuardProps {
  status?: 'active' | 'inactive' | 'warning';
  shieldLevel?: 'high' | 'medium' | 'low';
  lastChecked?: Date;
  siteName?: string;
}

export const Guard: React.FC<GuardProps> = ({
  status = 'active',
  shieldLevel = 'high',
  lastChecked = new Date(),
  siteName = 'Sirinx Site'
}) => {
  const statusConfig = {
    active: {
      icon: '🛡️',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500',
      label: 'Protected'
    },
    inactive: {
      icon: '⚠️',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500',
      label: 'Unprotected'
    },
    warning: {
      icon: '⚠️',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500',
      label: 'Warning'
    }
  };

  const shieldConfig = {
    high: {
      label: 'Level 3 - High Protection',
      bars: 3
    },
    medium: {
      label: 'Level 2 - Medium Protection',
      bars: 2
    },
    low: {
      label: 'Level 1 - Low Protection',
      bars: 1
    }
  };

  const config = statusConfig[status];
  const shield = shieldConfig[shieldLevel];

  return (
    <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border ${config.borderColor} ${config.bgColor} backdrop-blur-sm`}>
      {/* Shield Icon with Level Indicators */}
      <div className="relative">
        <span className={`text-2xl ${config.color}`}>{config.icon}</span>
        {/* Shield level bars */}
        <div className="absolute -bottom-1 -right-1 flex space-x-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-full ${
                i < shield.bars ? config.color.replace('text-', 'bg-') : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Status Info */}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`font-semibold ${config.color}`}>{config.label}</span>
          <span className="text-xs text-gray-500">
            {lastChecked.toLocaleTimeString()}
          </span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {shield.label} • {siteName}
        </div>
      </div>

      {/* Pulse indicator for active status */}
      {status === 'active' && (
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
        </div>
      )}
    </div>
  );
};

export default Guard;