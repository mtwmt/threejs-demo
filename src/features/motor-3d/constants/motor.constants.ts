/**
 * Motor 3D visualization constants
 */

// Motor geometry dimensions
export const MOTOR_DIMENSIONS = {
  body: {
    radiusTop: 1,
    radiusBottom: 1,
    height: 2,
    radialSegments: 32,
  },
  shaft: {
    radiusTop: 0.2,
    radiusBottom: 0.2,
    height: 1.5,
    radialSegments: 16,
  },
  fan: {
    width: 1.8,
    height: 0.1,
    depth: 0.3,
  },
} as const;

// Motor colors
export const MOTOR_COLORS = {
  normal: 0x4a9eff,      // Blue
  warning: 0xfbbf24,     // Yellow
  danger: 0xef4444,      // Red
  shaft: 0x888888,       // Gray
  fan: 0x666666,         // Dark gray
} as const;

// Animation settings
export const ANIMATION_SETTINGS = {
  baseRotationSpeed: 0.01,
  maxRotationSpeed: 0,
} as const;

// Camera settings
export const CAMERA_SETTINGS = {
  fov: 75,
  near: 0.1,
  far: 1000,
  position: { x: 3, y: 2, z: 4 },
} as const;

// Light settings
export const LIGHT_SETTINGS = {
  ambient: {
    color: 0xffffff,
    intensity: 0.4,
  },
  point: {
    color: 0xffffff,
    intensity: 1,
    position: { x: 5, y: 5, z: 5 },
  },
} as const;
