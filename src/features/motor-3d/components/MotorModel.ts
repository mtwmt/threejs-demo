import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 機械手臂顏色
export const ROBOT_COLORS = {
  normal: 0x00d4aa,      // 台達綠（正常）
  warning: 0xfbbf24,     // 黃色（警告）
  danger: 0xef4444,      // 紅色（危險）
  body: 0xff6600,        // 橘色主體（工業機器人常見色）
  joint: 0x2a2a2a,       // 關節深灰
  accent: 0x333333,      // 細節灰
  base: 0x1a1a1a,        // 底座黑
  gripper: 0x444444,     // 夾爪灰
} as const;

interface RobotModelOptions {
  isOverheating?: boolean;
  isWarning?: boolean;
}

/**
 * Creates a 3D industrial robotic arm model (6軸機械手臂)
 * Similar to Delta, FANUC, KUKA style robots
 */
export function createMotorModel(options: RobotModelOptions = {}): THREE.Group {
  const { isOverheating = false, isWarning = false } = options;
  const robotGroup = new THREE.Group();

  // 狀態顏色
  const statusColor = isOverheating 
    ? ROBOT_COLORS.danger 
    : isWarning 
      ? ROBOT_COLORS.warning 
      : ROBOT_COLORS.normal;

  // 主體顏色（危險時變紅）
  const bodyColor = isOverheating ? ROBOT_COLORS.danger : ROBOT_COLORS.body;

  // === 底座 (Base) ===
  const baseGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 32);
  const baseMaterial = new THREE.MeshPhongMaterial({
    color: ROBOT_COLORS.base,
    shininess: 30,
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.15;
  robotGroup.add(base);

  // 底座上環
  const baseRingGeometry = new THREE.TorusGeometry(0.55, 0.05, 8, 32);
  const baseRingMaterial = new THREE.MeshPhongMaterial({
    color: statusColor,
    emissive: statusColor,
    emissiveIntensity: 0.5,
  });
  const baseRing = new THREE.Mesh(baseRingGeometry, baseRingMaterial);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.31;
  robotGroup.add(baseRing);

  // === 旋轉台 (J1) ===
  const turretGeometry = new THREE.CylinderGeometry(0.45, 0.5, 0.4, 32);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: bodyColor,
    shininess: 60,
    specular: 0x222222,
  });
  const turret = new THREE.Mesh(turretGeometry, bodyMaterial);
  turret.position.y = 0.5;
  robotGroup.add(turret);

  // === 肩部 (Shoulder / J2) ===
  const shoulderGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.4);
  const shoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
  shoulder.position.set(0, 1.1, 0);
  robotGroup.add(shoulder);

  // 肩關節
  const shoulderJointGeometry = new THREE.SphereGeometry(0.22, 16, 16);
  const jointMaterial = new THREE.MeshPhongMaterial({
    color: ROBOT_COLORS.joint,
    shininess: 80,
  });
  const shoulderJoint = new THREE.Mesh(shoulderJointGeometry, jointMaterial);
  shoulderJoint.position.set(0, 1.5, 0.15);
  robotGroup.add(shoulderJoint);

  // === 上臂 (Upper Arm / J3) ===
  const upperArmGeometry = new THREE.BoxGeometry(0.35, 1.0, 0.3);
  const upperArm = new THREE.Mesh(upperArmGeometry, bodyMaterial);
  upperArm.position.set(0, 2.1, 0.15);
  upperArm.rotation.x = -0.3; // 稍微傾斜
  robotGroup.add(upperArm);

  // 肘關節
  const elbowJointGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16);
  const elbowJoint = new THREE.Mesh(elbowJointGeometry, jointMaterial);
  elbowJoint.rotation.z = Math.PI / 2;
  elbowJoint.position.set(0, 2.55, 0.3);
  robotGroup.add(elbowJoint);

  // === 前臂 (Forearm / J4) ===
  const forearmGeometry = new THREE.BoxGeometry(0.28, 0.8, 0.25);
  const forearm = new THREE.Mesh(forearmGeometry, bodyMaterial);
  forearm.position.set(0, 2.95, 0.45);
  forearm.rotation.x = 0.4;
  robotGroup.add(forearm);

  // === 手腕 (Wrist / J5) ===
  const wristGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 16);
  const wrist = new THREE.Mesh(wristGeometry, jointMaterial);
  wrist.position.set(0, 3.3, 0.65);
  wrist.rotation.x = Math.PI / 2;
  robotGroup.add(wrist);

  // === 末端執行器 / 夾爪 (End Effector / J6) ===
  // 夾爪基座
  const gripperBaseGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.15);
  const gripperMaterial = new THREE.MeshPhongMaterial({
    color: ROBOT_COLORS.gripper,
    shininess: 50,
  });
  const gripperBase = new THREE.Mesh(gripperBaseGeometry, gripperMaterial);
  gripperBase.position.set(0, 3.4, 0.8);
  robotGroup.add(gripperBase);

  // 左夾爪
  const fingerGeometry = new THREE.BoxGeometry(0.04, 0.25, 0.08);
  const leftFinger = new THREE.Mesh(fingerGeometry, gripperMaterial);
  leftFinger.position.set(-0.08, 3.5, 0.85);
  leftFinger.rotation.x = 0.2;
  robotGroup.add(leftFinger);

  // 右夾爪
  const rightFinger = new THREE.Mesh(fingerGeometry, gripperMaterial);
  rightFinger.position.set(0.08, 3.5, 0.85);
  rightFinger.rotation.x = 0.2;
  robotGroup.add(rightFinger);

  // === 纜線管 ===
  const cableGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 0.5, -0.2),
      new THREE.Vector3(0.25, 1.5, -0.15),
      new THREE.Vector3(0.2, 2.5, 0.1),
      new THREE.Vector3(0.15, 3.2, 0.4),
    ]),
    20, 0.03, 8, false
  );
  const cableMaterial = new THREE.MeshPhongMaterial({
    color: 0x111111,
  });
  const cable = new THREE.Mesh(cableGeometry, cableMaterial);
  robotGroup.add(cable);

  // === 品牌標誌 ===
  const logoGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.01);
  const logoMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.2,
  });
  const logo = new THREE.Mesh(logoGeometry, logoMaterial);
  logo.position.set(0, 0.9, 0.21);
  robotGroup.add(logo);

  // === 狀態指示燈 ===
  const indicatorGeometry = new THREE.SphereGeometry(0.06, 16, 16);
  const indicatorMaterial = new THREE.MeshPhongMaterial({
    color: statusColor,
    emissive: statusColor,
    emissiveIntensity: 0.8,
  });
  const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  indicator.position.set(0.35, 1.3, 0.15);
  robotGroup.add(indicator);

  // 儲存參考
  robotGroup.userData.bodyMaterial = bodyMaterial;
  robotGroup.userData.indicatorMaterial = indicatorMaterial;
  robotGroup.userData.baseRingMaterial = baseRingMaterial;

  // 調整整體位置，讓機器人站在地面上
  robotGroup.position.y = -1.5;

  return robotGroup;
}

/**
 * Loads an external GLTF/GLB model
 */
export function loadExternalMotorModel(
  modelPath: string,
  onLoad: (model: THREE.Group) => void,
  onError?: (error: Error) => void
): void {
  const loader = new GLTFLoader();
  
  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      model.position.y = -1.5;
      
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      onLoad(model);
    },
    undefined,
    (error) => {
      console.warn('Failed to load model:', error);
      if (onError) onError(error as Error);
    }
  );
}

/**
 * Updates the robot arm colors based on status
 */
export function updateMotorColor(
  robotGroup: THREE.Group,
  isOverheating: boolean,
  isWarning: boolean
): void {
  const statusColor = isOverheating 
    ? ROBOT_COLORS.danger 
    : isWarning 
      ? ROBOT_COLORS.warning 
      : ROBOT_COLORS.normal;

  const bodyColor = isOverheating ? ROBOT_COLORS.danger : ROBOT_COLORS.body;

  // 更新主體顏色
  const bodyMat = robotGroup.userData.bodyMaterial as THREE.MeshPhongMaterial;
  if (bodyMat) {
    bodyMat.color.setHex(bodyColor);
  }

  // 更新指示燈
  const indicatorMat = robotGroup.userData.indicatorMaterial as THREE.MeshPhongMaterial;
  if (indicatorMat) {
    indicatorMat.color.setHex(statusColor);
    indicatorMat.emissive.setHex(statusColor);
  }

  // 更新底座環
  const baseRingMat = robotGroup.userData.baseRingMaterial as THREE.MeshPhongMaterial;
  if (baseRingMat) {
    baseRingMat.color.setHex(statusColor);
    baseRingMat.emissive.setHex(statusColor);
  }
}
