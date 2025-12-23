import * as THREE from "three";

/**
 * Joint label configuration
 */
interface JointLabelConfig {
  name: string;
}

/**
 * Default joint configurations
 */
const JOINT_CONFIGS: JointLabelConfig[] = [
  { name: "J1" },
  { name: "J2" },
  { name: "J3" },
  { name: "J4" },
  { name: "J5" },
  { name: "J6" },
];

/**
 * Get the label configurations for rendering in React
 */
export function getJointLabelConfigs(): JointLabelConfig[] {
  return JOINT_CONFIGS;
}

/**
 * Projects a 3D world position to 2D screen coordinates
 */
export function projectToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } {
  const vector = worldPos.clone().project(camera);

  return {
    x: (vector.x * 0.5 + 0.5) * width,
    y: (-vector.y * 0.5 + 0.5) * height,
  };
}

/**
 * Fixed joint positions based on visual appearance of the robot model
 * These are manually tuned to match the kuma_heavy_robot model
 * J1 = base (top of model), J6 = end effector (gripper at bottom-left)
 */
const VISUAL_JOINT_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(0, 3.5, 0), // J1 - Head (orange part at top)
  new THREE.Vector3(0, 2.8, 0.1), // J2 - Upper torso
  new THREE.Vector3(-0.2, 2.2, 0.2), // J3 - Shoulder joint
  new THREE.Vector3(-0.4, 1.5, 0.25), // J4 - Upper arm / elbow
  new THREE.Vector3(-0.6, 0.9, 0.2), // J5 - Lower arm / wrist
  new THREE.Vector3(-0.8, 0.3, 0.1), // J6 - Gripper tip (bottom-left)
];

/**
 * Gets the current world positions of joints from bones
 * Uses actual bone positions so lines follow animation
 */
export function getJointWorldPositions(bones: THREE.Bone[]): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];

  for (let i = 0; i < 6; i++) {
    const bone = bones[i];
    if (bone) {
      const pos = new THREE.Vector3();
      bone.getWorldPosition(pos);
      positions.push(pos);
    } else {
      // Fallback for missing bones
      positions.push(
        VISUAL_JOINT_POSITIONS[i]?.clone() || new THREE.Vector3(0, i * 0.5, 0)
      );
    }
  }

  return positions;
}

/**
 * Calculates line positions for SVG rendering
 * Returns array of { startX, startY, endX, endY } for each joint
 */
export function calculateLinePositions(
  bones: THREE.Bone[],
  camera: THREE.Camera,
  containerWidth: number,
  containerHeight: number,
  labelPositions: { x: number; y: number }[]
): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}[] {
  const jointPositions = getJointWorldPositions(bones);
  const lines: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    visible: boolean;
  }[] = [];

  for (let i = 0; i < jointPositions.length; i++) {
    const worldPos = jointPositions[i];
    const labelPos = labelPositions[i];

    // Project 3D joint position to 2D screen
    const screenPos = projectToScreen(
      worldPos,
      camera,
      containerWidth,
      containerHeight
    );

    // Check if the point is in front of the camera
    const vector = worldPos.clone().project(camera);
    const isVisible = vector.z < 1; // z < 1 means in front of camera

    lines.push({
      startX: labelPos?.x ?? containerWidth - 50,
      startY: labelPos?.y ?? 100 + i * 40,
      endX: screenPos.x,
      endY: screenPos.y,
      visible: isVisible,
    });
  }

  return lines;
}
