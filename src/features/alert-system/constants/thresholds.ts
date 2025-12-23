/**
 * Alert threshold constants for robotic arm
 * Centralized configuration for warning and danger levels
 */
export const JOINT_LOAD_THRESHOLDS = {
  warning: 70,  // %
  danger: 85,   // %
} as const;

export const SPEED_THRESHOLDS = {
  warning: 700,  // mm/s
  danger: 800,   // mm/s
} as const;

export const CYCLE_TIME_THRESHOLDS = {
  warning: 15,   // 秒
  danger: 18,    // 秒
} as const;

/**
 * All thresholds combined for easy access
 */
export const ALL_THRESHOLDS = {
  jointLoad: JOINT_LOAD_THRESHOLDS,
  speed: SPEED_THRESHOLDS,
  cycleTime: CYCLE_TIME_THRESHOLDS,
} as const;
