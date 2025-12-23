"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createMotorModel, updateMotorColor } from "./MotorModel";
import { getJointLabelConfigs, calculateLinePositions } from "./JointLabels";
import { CAMERA_SETTINGS } from "../constants";
import {
  getQualitySettings,
  FPSMonitor,
  type DeviceCapability,
} from "../utils";
import type { JointAngles, SensorData } from "@/features/sensor-panel";

// 外部模型路徑 (需考慮 GitHub Pages 的 basePath)
const isProd = process.env.NODE_ENV === "production";
const BASE_PATH = isProd ? "/threejs-demo" : "";
const EXTERNAL_MODEL_PATH = `${BASE_PATH}/models/kuma_heavy_robot_r-9000s.glb`;

interface MotorSceneProps {
  isOverheating: boolean;
  isWarning: boolean;
  isPaused?: boolean;
  onJointAnglesUpdate?: (angles: JointAngles) => void;
  onSensorDataUpdate?: (data: SensorData) => void;
  /** Sensor data for HUD display */
  sensorData?: SensorData;
  /** Joint angles for HUD display */
  jointAngles?: JointAngles;
}

/**
 * Handle type for external components to interact with MotorScene
 */
export interface MotorSceneHandle {
  /** Reset the camera and controls to initial view */
  resetView: () => void;
}

/**
 * Three.js scene container for the 3D robotic arm visualization
 * Loads external GLB model with fallback to procedural geometry
 */
export const MotorScene = React.forwardRef<MotorSceneHandle, MotorSceneProps>(
  (
    {
      isOverheating,
      isWarning,
      isPaused = false,
      onJointAnglesUpdate,
      onSensorDataUpdate,
      sensorData,
      jointAngles,
    },
    ref
  ): React.JSX.Element => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const bonesRef = useRef<THREE.Bone[]>([]);
    const prevAnglesRef = useRef<JointAngles | null>(null);
    const fpsMonitorRef = useRef<FPSMonitor | null>(null);
    const labelContainerRef = useRef<HTMLDivElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<
      "loading" | "loaded" | "error"
    >("loading");
    const [fps, setFps] = useState(0);
    const [qualityLevel, setQualityLevel] =
      useState<DeviceCapability>("medium");
    const [showJointLabels, setShowJointLabels] = useState(true);
    const [linePositions, setLinePositions] = useState<
      {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        visible: boolean;
      }[]
    >([]);

    // Reset animation state
    const isResettingRef = useRef(false);
    const resetStartTimeRef = useRef(0);
    const resetDuration = 1.0; // seconds
    const initialCameraPos = new THREE.Vector3(0.3, 1.7, 4.3);
    const initialTargetPos = new THREE.Vector3(0, 2, 0);
    const startCameraPosRef = useRef(new THREE.Vector3());
    const startTargetPosRef = useRef(new THREE.Vector3());

    // Camera debug info (for development)
    const [cameraDebug, setCameraDebug] = useState({
      position: { x: 0, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      distance: 0,
    });

    // Expose resetView via ref
    React.useImperativeHandle(ref, () => ({
      resetView: () => {
        if (cameraRef.current && controlsRef.current) {
          isResettingRef.current = true;
          resetStartTimeRef.current = performance.now();
          startCameraPosRef.current.copy(cameraRef.current.position);
          startTargetPosRef.current.copy(controlsRef.current.target);
        }
      },
    }));

    // 平滑處理用的歷史數據
    const smoothedAnglesRef = useRef<JointAngles>({
      j1: 0,
      j2: 0,
      j3: 0,
      j4: 0,
      j5: 0,
      j6: 0,
    });
    const smoothedSensorRef = useRef<SensorData>({
      jointLoad: 30,
      speed: 200,
      cycleTime: 12,
    });

    /**
     * Extract joint angles from model bones with smoothing
     * Reads actual bone rotation values from the animated model
     */
    const extractJointAngles = useCallback((): JointAngles => {
      const bones = bonesRef.current;
      const smoothingFactor = 0.15;

      const radToDeg = (rad: number) => rad * (180 / Math.PI);

      // 取得骨骼的主要旋轉角度（選擇絕對值最大的軸）
      const getBoneAngle = (bone: THREE.Bone | undefined): number => {
        if (!bone) return 0;
        const euler = bone.rotation;
        const absX = Math.abs(euler.x);
        const absY = Math.abs(euler.y);
        const absZ = Math.abs(euler.z);

        // 返回絕對值最大的軸的角度
        if (absX >= absY && absX >= absZ) {
          return radToDeg(euler.x);
        } else if (absY >= absX && absY >= absZ) {
          return radToDeg(euler.y);
        } else {
          return radToDeg(euler.z);
        }
      };

      const rawAngles: JointAngles = {
        j1: getBoneAngle(bones[0]),
        j2: getBoneAngle(bones[1]),
        j3: getBoneAngle(bones[2]),
        j4: getBoneAngle(bones[3]),
        j5: getBoneAngle(bones[4]),
        j6: getBoneAngle(bones[5]),
      };

      // 指數平滑處理（Exponential Moving Average）
      const prev = smoothedAnglesRef.current;
      const smoothed: JointAngles = {
        j1: Math.round(prev.j1 + smoothingFactor * (rawAngles.j1 - prev.j1)),
        j2: Math.round(prev.j2 + smoothingFactor * (rawAngles.j2 - prev.j2)),
        j3: Math.round(prev.j3 + smoothingFactor * (rawAngles.j3 - prev.j3)),
        j4: Math.round(prev.j4 + smoothingFactor * (rawAngles.j4 - prev.j4)),
        j5: Math.round(prev.j5 + smoothingFactor * (rawAngles.j5 - prev.j5)),
        j6: Math.round(prev.j6 + smoothingFactor * (rawAngles.j6 - prev.j6)),
      };

      smoothedAnglesRef.current = smoothed;
      return smoothed;
    }, []);

    /**
     * Calculate sensor data from joint angles with smoothing
     */
    const calculateSensorData = useCallback(
      (currentAngles: JointAngles): SensorData => {
        const prevAngles = prevAnglesRef.current;
        const smoothingFactor = 0.1; // 感測器數據更平滑

        // 計算角速度
        let totalAngularVelocity = 0;
        if (prevAngles) {
          const changes = [
            Math.abs(currentAngles.j1 - prevAngles.j1),
            Math.abs(currentAngles.j2 - prevAngles.j2),
            Math.abs(currentAngles.j3 - prevAngles.j3),
            Math.abs(currentAngles.j4 - prevAngles.j4),
            Math.abs(currentAngles.j5 - prevAngles.j5),
            Math.abs(currentAngles.j6 - prevAngles.j6),
          ];
          // 過濾大跳變
          totalAngularVelocity = changes
            .filter((c) => c < 30)
            .reduce((a, b) => a + b, 0);
        }

        // 原始值
        const rawLoad = Math.min(80, 20 + totalAngularVelocity * 3);
        const rawSpeed = Math.min(800, 100 + totalAngularVelocity * 50);

        // 指數平滑
        const prev = smoothedSensorRef.current;
        const smoothed: SensorData = {
          jointLoad: Math.round(
            prev.jointLoad + smoothingFactor * (rawLoad - prev.jointLoad)
          ),
          speed: Math.round(
            prev.speed + smoothingFactor * (rawSpeed - prev.speed)
          ),
          cycleTime: 12.0,
        };

        smoothedSensorRef.current = smoothed;
        prevAnglesRef.current = { ...currentAngles };

        return smoothed;
      },
      []
    );

    // Initialize Three.js scene
    const initScene = useCallback(() => {
      if (!containerRef.current || isInitialized) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Get adaptive quality settings based on device capability
      const qualitySettings = getQualitySettings();
      setQualityLevel(
        qualitySettings.pixelRatio > 1.5
          ? "high"
          : qualitySettings.pixelRatio > 1
          ? "medium"
          : "low"
      );

      // Initialize FPS monitor
      fpsMonitorRef.current = new FPSMonitor(30);

      // Scene - slightly lighter background for better visibility on various displays
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x121218);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(
        CAMERA_SETTINGS.fov,
        width / height,
        CAMERA_SETTINGS.near,
        CAMERA_SETTINGS.far
      );

      // Initial position
      camera.position.copy(initialCameraPos);
      cameraRef.current = camera;

      // Renderer with adaptive settings
      const renderer = new THREE.WebGLRenderer({
        antialias: qualitySettings.antialias,
        powerPreference: "high-performance", // Prefer discrete GPU
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(qualitySettings.pixelRatio);
      renderer.shadowMap.enabled = qualitySettings.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.6; // Increased for better visibility
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // OrbitControls with touch support
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 2;
      controls.maxDistance = 15;
      controls.target.copy(initialTargetPos);
      controls.enablePan = true; // Enable panning for mobile
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
      controlsRef.current = controls;

      // Lighting - increased intensity for better visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
      mainLight.position.set(5, 10, 5);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.7);
      fillLight.position.set(-5, 5, -5);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(0xff6600, 0.9);
      rimLight.position.set(0, 3, -5);
      scene.add(rimLight);

      // Grid helper - slightly brighter for visibility
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // Load external GLB model
      const loader = new GLTFLoader();
      loader.load(
        EXTERNAL_MODEL_PATH,
        (gltf) => {
          const model = gltf.scene;

          // Auto-center and scale the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          model.scale.setScalar(scale);

          model.position.x = -center.x * scale;
          model.position.y = -box.min.y * scale;
          model.position.z = -center.z * scale;

          // Collect bones for joint angle reading
          const allBones: THREE.Bone[] = [];

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
            if (child instanceof THREE.Bone) {
              allBones.push(child);
            }
          });

          // Find the main bone chain by traversing from root
          // Look for the longest chain of bones (main arm hierarchy)
          const findBoneChain = (startBone: THREE.Bone): THREE.Bone[] => {
            const chain: THREE.Bone[] = [startBone];
            let current = startBone;

            while (current.children.length > 0) {
              // Find the child bone with the most descendants (main chain)
              const childBones = current.children.filter(
                (c): c is THREE.Bone => c instanceof THREE.Bone
              );

              if (childBones.length === 0) break;

              // Pick the child with most descendants (usually the main arm)
              let bestChild = childBones[0];
              let maxDescendants = 0;

              for (const child of childBones) {
                let count = 0;
                child.traverse(() => count++);
                if (count > maxDescendants) {
                  maxDescendants = count;
                  bestChild = child;
                }
              }

              chain.push(bestChild);
              current = bestChild;
            }

            return chain;
          };

          // Find root bones (bones without bone parents)
          const rootBones = allBones.filter((bone) => {
            return !(bone.parent instanceof THREE.Bone);
          });

          // Find the longest bone chain starting from any root
          let longestChain: THREE.Bone[] = [];
          for (const root of rootBones) {
            const chain = findBoneChain(root);
            if (chain.length > longestChain.length) {
              longestChain = chain;
            }
          }

          // Select 6 bones evenly distributed along the chain
          if (longestChain.length >= 6) {
            const step = (longestChain.length - 1) / 5;
            bonesRef.current = [0, 1, 2, 3, 4, 5].map(
              (i) => longestChain[Math.round(i * step)]
            );
          } else {
            bonesRef.current = longestChain.slice(0, 6);
          }

          scene.add(model);
          modelRef.current = model;

          // Set up animation mixer
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              mixer.clipAction(clip).play();
            });
            mixerRef.current = mixer;
          }

          setLoadingStatus("loaded");
        },
        undefined,
        (error) => {
          console.warn("Failed to load external model, using fallback:", error);
          setLoadingStatus("error");

          const fallbackModel = createMotorModel({ isOverheating, isWarning });
          scene.add(fallbackModel);
          modelRef.current = fallbackModel;
        }
      );

      setIsInitialized(true);
    }, [isInitialized, isOverheating, isWarning]);

    // Animation loop
    const animate = useCallback(() => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current)
        return;

      // Handle Reset Animation
      if (isResettingRef.current && controlsRef.current) {
        const now = performance.now();
        const elapsed = (now - resetStartTimeRef.current) / 1000;
        const alpha = Math.min(elapsed / resetDuration, 1.0);

        // Smooth easing (easeInOutCubic)
        const ease =
          alpha < 0.5
            ? 4 * alpha * alpha * alpha
            : 1 - Math.pow(-2 * alpha + 2, 3) / 2;

        cameraRef.current.position.lerpVectors(
          startCameraPosRef.current,
          initialCameraPos,
          ease
        );
        controlsRef.current.target.lerpVectors(
          startTargetPosRef.current,
          initialTargetPos,
          ease
        );

        if (alpha >= 1.0) {
          isResettingRef.current = false;
          // Ensure exact positions at the end
          cameraRef.current.position.copy(initialCameraPos);
          controlsRef.current.target.copy(initialTargetPos);
        }
      }

      // Update animation mixer
      if (mixerRef.current && !isPaused) {
        const delta = clockRef.current.getDelta();
        mixerRef.current.update(delta);

        // Extract joint angles and calculate sensor data
        const angles = extractJointAngles();

        if (onJointAnglesUpdate) {
          onJointAnglesUpdate(angles);
        }

        if (onSensorDataUpdate) {
          const sensorData = calculateSensorData(angles);
          onSensorDataUpdate(sensorData);
        }
      } else if (isPaused) {
        // Just keep the clock updated so delta doesn't jump
        clockRef.current.getDelta();
      }

      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Calculate 2D line positions by projecting 3D joints to screen
      if (
        showJointLabels &&
        bonesRef.current.length > 0 &&
        containerRef.current &&
        labelContainerRef.current
      ) {
        // Get label positions from DOM
        const labelElements =
          labelContainerRef.current.querySelectorAll(".joint-label");
        const labelPositions: { x: number; y: number }[] = [];
        const containerRect = containerRef.current.getBoundingClientRect();

        labelElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          labelPositions.push({
            x: rect.left - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top,
          });
        });

        const newLinePositions = calculateLinePositions(
          bonesRef.current,
          cameraRef.current,
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
          labelPositions
        );
        setLinePositions(newLinePositions);
      }

      // Monitor FPS
      if (fpsMonitorRef.current) {
        const currentFps = fpsMonitorRef.current.tick();
        setFps(currentFps);
      }

      // Update camera debug info
      if (cameraRef.current && controlsRef.current) {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        const distance = cam.position.distanceTo(ctrl.target);
        setCameraDebug({
          position: {
            x: Math.round(cam.position.x * 10) / 10,
            y: Math.round(cam.position.y * 10) / 10,
            z: Math.round(cam.position.z * 10) / 10,
          },
          target: {
            x: Math.round(ctrl.target.x * 10) / 10,
            y: Math.round(ctrl.target.y * 10) / 10,
            z: Math.round(ctrl.target.z * 10) / 10,
          },
          distance: Math.round(distance * 10) / 10,
        });
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);

      animationIdRef.current = requestAnimationFrame(animate);
    }, [
      isPaused,
      onJointAnglesUpdate,
      onSensorDataUpdate,
      extractJointAngles,
      calculateSensorData,
    ]);

    // Handle window resize
    const handleResize = useCallback(() => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current)
        return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    }, []);

    // Initialize scene on mount
    useEffect(() => {
      initScene();
    }, [initScene]);

    // Start animation loop after initialization
    useEffect(() => {
      if (isInitialized) {
        animate();
      }

      return () => {
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
    }, [isInitialized, animate]);

    // Update model color when status changes
    useEffect(() => {
      if (modelRef.current && loadingStatus === "error") {
        updateMotorColor(modelRef.current, isOverheating, isWarning);
      }
    }, [isOverheating, isWarning, loadingStatus]);

    // Handle resize
    useEffect(() => {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [handleResize]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
      };
    }, []);

    return (
      <div className="relative w-full h-full rounded overflow-hidden bg-linear-to-br from-[#121218] to-[#1e1e2a]">
        {loadingStatus === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white/60 text-lg animate-pulse">
              載入模型中...
            </div>
          </div>
        )}

        {/* Top HUD Status Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/40 to-transparent">
            {/* Sensor Data */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex flex-col px-3 py-1.5 rounded-sm bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-[10px] text-white/40 font-mono tracking-tight">
                  LOAD [AVG]
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/60 text-xs">負荷</span>
                  <span
                    className={`font-mono font-medium ${
                      (sensorData?.jointLoad ?? 30) > 70
                        ? "text-red-400"
                        : (sensorData?.jointLoad ?? 30) > 50
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {(sensorData?.jointLoad ?? 30).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col px-3 py-1.5 rounded-sm bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-[10px] text-white/40 font-mono tracking-tight">
                  VELOCITY [RMS]
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/60 text-xs">速率</span>
                  <span className="font-mono font-medium text-blue-400">
                    {sensorData?.speed ?? 200} mm/s
                  </span>
                </div>
              </div>
              <div className="flex flex-col px-3 py-1.5 rounded-sm bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-[10px] text-white/40 font-mono tracking-tight">
                  CYCLE TIME
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/60 text-xs">週期</span>
                  <span className="font-mono font-medium text-purple-400">
                    {sensorData?.cycleTime?.toFixed(1) ?? "12.0"}s
                  </span>
                </div>
              </div>
            </div>

            {/* Joint Labels Toggle & FPS and Quality Indicator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJointLabels(!showJointLabels)}
                className={`px-2 py-1 rounded-sm text-xs font-mono backdrop-blur-sm transition-colors pointer-events-auto cursor-pointer ${
                  showJointLabels
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                }`}
                title={showJointLabels ? "隱藏關節標籤" : "顯示關節標籤"}
              >
                🏷️ J1-J6
              </button>
              <div
                className={`px-2 py-1 rounded-sm text-xs font-mono backdrop-blur-sm ${
                  fps >= 50
                    ? "bg-green-500/20 text-green-400"
                    : fps >= 30
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {fps} FPS
              </div>
              <div
                className={`px-2 py-1 rounded-sm text-xs font-mono backdrop-blur-sm ${
                  qualityLevel === "high"
                    ? "bg-purple-500/20 text-purple-400"
                    : qualityLevel === "medium"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {qualityLevel.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Left Joint Angle Panel */}
        <div className="absolute top-20 left-4 z-10 pointer-events-none">
          <div className="flex flex-col gap-1 px-3 py-3 rounded bg-black/40 backdrop-blur-sm border border-white/10">
            <div className="text-xs text-white/50 font-medium mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              關節角度
            </div>
            {[
              { label: "J1", value: jointAngles?.j1 ?? 0 },
              { label: "J2", value: jointAngles?.j2 ?? 0 },
              { label: "J3", value: jointAngles?.j3 ?? 0 },
              { label: "J4", value: jointAngles?.j4 ?? 0 },
              { label: "J5", value: jointAngles?.j5 ?? 0 },
              { label: "J6", value: jointAngles?.j6 ?? 0 },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-white/60 font-medium w-6">{label}</span>
                <span
                  className={`font-mono w-16 text-right ${
                    value >= 0 ? "text-cyan-400" : "text-orange-400"
                  }`}
                >
                  {value >= 0 ? "+" : ""}
                  {value}°
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Debug Panel (development only) */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
          <div className="flex flex-col gap-1 px-3 py-3 rounded bg-black/40 backdrop-blur-sm border border-white/10 text-xs font-mono">
            <div className="text-white/50 font-medium mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
              Camera Debug
            </div>
            <div className="text-white/70">
              <span className="text-white/50">pos: </span>(
              {cameraDebug.position.x}, {cameraDebug.position.y},{" "}
              {cameraDebug.position.z})
            </div>
            <div className="text-white/70">
              <span className="text-white/50">target: </span>(
              {cameraDebug.target.x}, {cameraDebug.target.y},{" "}
              {cameraDebug.target.z})
            </div>
            <div className="text-pink-400">
              <span className="text-white/50">distance: </span>
              {cameraDebug.distance}
            </div>
          </div>
        </div>

        {/* Fixed Joint Labels with SVG Lines */}
        {showJointLabels && (
          <>
            {/* SVG overlay for connecting lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-6"
              style={{ overflow: "visible" }}
            >
              {linePositions.map(
                (line, index) =>
                  line.visible && (
                    <line
                      key={`line-${index}`}
                      x1={line.startX}
                      y1={line.startY}
                      x2={line.endX}
                      y2={line.endY}
                      stroke="#888888"
                      strokeWidth="1"
                      strokeOpacity="0.6"
                    />
                  )
              )}
            </svg>

            {/* Labels */}
            <div
              ref={labelContainerRef}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            >
              <div className="flex flex-col gap-2">
                {getJointLabelConfigs().map((config) => (
                  <div
                    key={config.name}
                    className="joint-label px-3 py-1.5 rounded bg-[#28282d]/90 text-white text-xs font-mono font-medium border border-white/20 shadow-lg"
                  >
                    {config.name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 3D Model Canvas */}
        <div
          ref={containerRef}
          className="w-full h-full [&_canvas]:block [&_canvas]:rounded"
        />

        {/* Bottom Hints */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          <p className="m-0 text-center text-sm text-white/60">
            🖱️ 拖曳旋轉視角 | 📱 觸控支援 | 滾輪縮放
          </p>
        </div>
      </div>
    );
  }
);

MotorScene.displayName = "MotorScene";
