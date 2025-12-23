/**
 * Sensor data interface for robotic arm
 */
export interface SensorData {
  jointLoad: number;      // 關節負載 (%)
  speed: number;          // 運動速度 (mm/s)
  cycleTime: number;      // 週期時間 (秒)
}

/**
 * Joint angle data for 6-axis robotic arm
 */
export interface JointAngles {
  j1: number;  // 基座旋轉 (°)
  j2: number;  // 肩部 (°)
  j3: number;  // 肘部 (°)
  j4: number;  // 手腕旋轉 (°)
  j5: number;  // 手腕擺動 (°)
  j6: number;  // 末端旋轉 (°)
}

/**
 * Individual sensor reading with metadata
 */
export interface SensorReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  icon: string;
  status: 'normal' | 'warning' | 'danger';
}

/**
 * Sensor thresholds configuration
 */
export interface SensorThresholds {
  warning: number;
  danger: number;
}
