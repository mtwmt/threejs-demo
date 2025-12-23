import React from 'react';
import { SensorCard } from './SensorCard';
import type { SensorData, SensorReading } from '../types/sensor.types';

interface SensorPanelProps {
  data: SensorData;
  thresholds?: {
    jointLoad: { warning: number; danger: number };
    speed: { warning: number; danger: number };
    cycleTime: { warning: number; danger: number };
  };
}

// Default thresholds for robotic arm sensor readings
const DEFAULT_THRESHOLDS = {
  jointLoad: { warning: 70, danger: 85 },   // 關節負載 %
  speed: { warning: 700, danger: 800 },     // 速度 mm/s
  cycleTime: { warning: 15, danger: 18 },   // 週期時間 秒
};

/**
 * Determines the status based on value and thresholds
 */
function getStatus(
  value: number, 
  thresholds: { warning: number; danger: number }
): 'normal' | 'warning' | 'danger' {
  if (value >= thresholds.danger) return 'danger';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}

/**
 * Sensor Panel component for robotic arm
 * Displays all sensor readings in a responsive grid layout
 */
export function SensorPanel({ 
  data, 
  thresholds = DEFAULT_THRESHOLDS 
}: SensorPanelProps): React.JSX.Element {
  // Transform raw sensor data into display-ready readings
  const readings: SensorReading[] = [
    {
      id: 'jointLoad',
      label: '關節負載',
      value: data.jointLoad,
      unit: '%',
      icon: '🦾',
      status: getStatus(data.jointLoad, thresholds.jointLoad),
    },
    {
      id: 'speed',
      label: '運動速度',
      value: data.speed,
      unit: 'mm/s',
      icon: '⚡',
      status: getStatus(data.speed, thresholds.speed),
    },
    {
      id: 'cycleTime',
      label: '週期時間',
      value: data.cycleTime,
      unit: '秒',
      icon: '⏱️',
      status: getStatus(data.cycleTime, thresholds.cycleTime),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-white/90 pb-3 border-b border-white/10">
        機械手臂監控
      </h2>
      <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap">
        {readings.map((reading) => (
          <SensorCard key={reading.id} reading={reading} />
        ))}
      </div>
    </div>
  );
}
