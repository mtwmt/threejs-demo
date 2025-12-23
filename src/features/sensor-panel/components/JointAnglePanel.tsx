import React from 'react';
import type { JointAngles } from '../types/sensor.types';

interface JointAnglePanelProps {
  angles: JointAngles;
}

// 各關節的角度限制範圍
const JOINT_LIMITS = {
  j1: { min: -180, max: 180, name: 'J1 基座旋轉' },
  j2: { min: -90, max: 90, name: 'J2 肩部' },
  j3: { min: -120, max: 120, name: 'J3 肘部' },
  j4: { min: -180, max: 180, name: 'J4 手腕旋轉' },
  j5: { min: -120, max: 120, name: 'J5 手腕擺動' },
  j6: { min: -360, max: 360, name: 'J6 末端旋轉' },
};

/**
 * Displays real-time joint angles for 6-axis robotic arm
 */
export function JointAnglePanel({ angles }: JointAnglePanelProps): React.JSX.Element {
  const joints = Object.entries(angles) as [keyof JointAngles, number][];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-white/90 pb-3 border-b border-white/10">
        關節角度監控
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {joints.map(([joint, angle]) => {
          const limits = JOINT_LIMITS[joint];
          const range = limits.max - limits.min;
          const normalizedAngle = ((angle - limits.min) / range) * 100;
          const isNearLimit = Math.abs(angle) > (limits.max * 0.8);
          
          return (
            <div 
              key={joint}
              className={`p-3 rounded-xl border transition-all duration-300 ${
                isNearLimit 
                  ? 'bg-yellow-400/10 border-yellow-400/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/60 font-medium">
                  {limits.name}
                </span>
                <span className={`text-lg font-bold tabular-nums ${
                  isNearLimit ? 'text-yellow-400' : 'text-white'
                }`}>
                  {angle > 0 ? '+' : ''}{angle}°
                </span>
              </div>
              {/* 角度進度條 */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isNearLimit 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, Math.max(0, normalizedAngle))}%`,
                    marginLeft: angle < 0 ? `${50 - normalizedAngle/2}%` : '50%',
                    transform: angle < 0 ? 'none' : 'none'
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/40">{limits.min}°</span>
                <span className="text-[10px] text-white/40">{limits.max}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
