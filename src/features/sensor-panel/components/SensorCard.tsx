import React from 'react';
import { Card } from '@/shared';
import type { SensorReading } from '../types/sensor.types';

interface SensorCardProps {
  reading: SensorReading;
}

/**
 * Displays a single sensor reading with status indication
 * Visual appearance changes based on sensor status
 */
export function SensorCard({ reading }: SensorCardProps): React.JSX.Element {
  const { label, value, unit, icon, status } = reading;
  
  // Map sensor status to card variant
  const cardVariant = status === 'danger' ? 'danger' 
                    : status === 'warning' ? 'warning' 
                    : 'default';

  // Status-dependent value color
  const valueColorClass = {
    normal: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-500 animate-flash',
  }[status];

  // Status indicator styles
  const statusBadgeClass = {
    normal: 'bg-green-400/20 text-green-400',
    warning: 'bg-yellow-400/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-500',
  }[status];

  const statusText = {
    normal: '正常',
    warning: '警告',
    danger: '危險',
  }[status];

  return (
    <Card variant={cardVariant} className="min-w-[180px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-white/70 font-medium">{label}</span>
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={`text-4xl font-bold tabular-nums transition-colors duration-300 ${valueColorClass}`}>
          {value.toFixed(1)}
        </span>
        <span className="text-base text-white/50">{unit}</span>
      </div>
      
      {/* Status Badge */}
      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusBadgeClass}`}>
        {statusText}
      </div>
    </Card>
  );
}
