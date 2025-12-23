import { useMemo } from 'react';
import type { SensorData } from '@/features/sensor-panel';
import { ALL_THRESHOLDS } from '../constants';

export interface Alert {
  id: string;
  type: 'warning' | 'danger';
  sensor: string;
  message: string;
  value: number;
  threshold: number;
}

interface UseAlertDetectionReturn {
  alerts: Alert[];
  hasWarning: boolean;
  hasDanger: boolean;
  isOverheating: boolean;  // 保持向後相容，用於指示危險狀態
}

/**
 * Detects alerts based on robotic arm sensor data and thresholds
 * Returns active alerts and status flags
 */
export function useAlertDetection(data: SensorData): UseAlertDetectionReturn {
  const alerts = useMemo(() => {
    const activeAlerts: Alert[] = [];

    // Check joint load
    if (data.jointLoad >= ALL_THRESHOLDS.jointLoad.danger) {
      activeAlerts.push({
        id: 'load-danger',
        type: 'danger',
        sensor: '關節負載',
        message: `關節過載！當前 ${data.jointLoad}% 已超過危險閾值 ${ALL_THRESHOLDS.jointLoad.danger}%`,
        value: data.jointLoad,
        threshold: ALL_THRESHOLDS.jointLoad.danger,
      });
    } else if (data.jointLoad >= ALL_THRESHOLDS.jointLoad.warning) {
      activeAlerts.push({
        id: 'load-warning',
        type: 'warning',
        sensor: '關節負載',
        message: `關節負載偏高：當前 ${data.jointLoad}%`,
        value: data.jointLoad,
        threshold: ALL_THRESHOLDS.jointLoad.warning,
      });
    }

    // Check speed
    if (data.speed >= ALL_THRESHOLDS.speed.danger) {
      activeAlerts.push({
        id: 'speed-danger',
        type: 'danger',
        sensor: '運動速度',
        message: `速度過快！當前 ${data.speed} mm/s 已超過安全閾值`,
        value: data.speed,
        threshold: ALL_THRESHOLDS.speed.danger,
      });
    } else if (data.speed >= ALL_THRESHOLDS.speed.warning) {
      activeAlerts.push({
        id: 'speed-warning',
        type: 'warning',
        sensor: '運動速度',
        message: `運動速度偏高：當前 ${data.speed} mm/s`,
        value: data.speed,
        threshold: ALL_THRESHOLDS.speed.warning,
      });
    }

    // Check cycle time
    if (data.cycleTime >= ALL_THRESHOLDS.cycleTime.danger) {
      activeAlerts.push({
        id: 'cycle-danger',
        type: 'danger',
        sensor: '週期時間',
        message: `週期過長！當前 ${data.cycleTime} 秒`,
        value: data.cycleTime,
        threshold: ALL_THRESHOLDS.cycleTime.danger,
      });
    } else if (data.cycleTime >= ALL_THRESHOLDS.cycleTime.warning) {
      activeAlerts.push({
        id: 'cycle-warning',
        type: 'warning',
        sensor: '週期時間',
        message: `週期時間偏長：當前 ${data.cycleTime} 秒`,
        value: data.cycleTime,
        threshold: ALL_THRESHOLDS.cycleTime.warning,
      });
    }

    return activeAlerts;
  }, [data]);

  const hasWarning = alerts.some(a => a.type === 'warning');
  const hasDanger = alerts.some(a => a.type === 'danger');
  // isOverheating 用於向後相容，當有任何危險告警時為 true
  const isOverheating = hasDanger;

  return { alerts, hasWarning, hasDanger, isOverheating };
}
