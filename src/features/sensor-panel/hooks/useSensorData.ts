import { useState, useCallback } from 'react';
import { useInterval } from '@/shared/hooks/useInterval';
import type { SensorData, JointAngles } from '../types/sensor.types';

/**
 * Simulates robotic arm sensor data
 */
function generateSensorData(): SensorData {
  const baseLoad = 45;
  const loadVariance = Math.random() * 40 - 10;
  
  const baseSpeed = 500;
  const speedVariance = Math.random() * 300 - 150;
  
  const baseCycle = 12;
  const cycleVariance = Math.random() * 4 - 2;
  
  return {
    jointLoad: Math.round((baseLoad + loadVariance) * 10) / 10,
    speed: Math.round(baseSpeed + speedVariance),
    cycleTime: Math.round((baseCycle + cycleVariance) * 10) / 10,
  };
}

/**
 * Simulates 6-axis joint angles with realistic motion
 */
function generateJointAngles(time: number): JointAngles {
  // 模擬機械手臂循環運動的關節角度
  const cycle = time * 0.5; // 調整速度
  
  return {
    j1: Math.round(Math.sin(cycle * 0.3) * 90),           // 基座: -90° ~ +90°
    j2: Math.round(45 + Math.sin(cycle * 0.5) * 30),      // 肩部: 15° ~ 75°
    j3: Math.round(-30 + Math.sin(cycle * 0.7) * 45),     // 肘部: -75° ~ 15°
    j4: Math.round(Math.sin(cycle * 1.1) * 180),          // 手腕旋轉: -180° ~ 180°
    j5: Math.round(Math.sin(cycle * 0.9) * 120),          // 手腕擺動: -120° ~ 120°
    j6: Math.round(Math.sin(cycle * 1.5) * 360),          // 末端旋轉: -360° ~ 360°
  };
}

interface UseSensorDataReturn {
  data: SensorData;
  jointAngles: JointAngles;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Custom hook for managing robotic arm sensor data and joint angles
 */
export function useSensorData(updateInterval: number | null = 1000): UseSensorDataReturn {
  const [data, setData] = useState<SensorData>({
    jointLoad: 45,
    speed: 500,
    cycleTime: 12,
  });
  const [jointAngles, setJointAngles] = useState<JointAngles>({
    j1: 0, j2: 45, j3: -30, j4: 0, j5: 0, j6: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(0);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setData(generateSensorData());
      setJointAngles(generateJointAngles(time));
      setTime(prev => prev + 1);
      setIsLoading(false);
    }, 50);
  }, [time]);

  useInterval(refresh, updateInterval);

  return { data, jointAngles, isLoading, refresh };
}
