"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createMotorModel, updateMotorColor } from "./MotorModel";
import { CAMERA_SETTINGS } from "../constants";
import {
  getQualitySettings,
  FPSMonitor,
  type DeviceCapability,
} from "../utils";
import type { JointAngles, SensorData } from "@/features/sensor-panel";

// 外部模型路徑
const EXTERNAL_MODEL_PATH = "/models/kuma_heavy_robot_r-9000s.glb";

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
 * Three.js scene container for the 3D robotic arm visualization
 * Loads external GLB model with fallback to procedural geometry
 */
export function MotorScene({
  isOverheating,
  isWarning,
  isPaused = false,
  onJointAnglesUpdate,
  onSensorDataUpdate,
  sensorData,
  jointAngles,
}: MotorSceneProps): React.JSX.Element {
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
  const cycleStartTimeRef = useRef<number>(Date.now());
  const lastCycleTimeRef = useRef<number>(12);
  const fpsMonitorRef = useRef<FPSMonitor | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const [fps, setFps] = useState(0);
  const [qualityLevel, setQualityLevel] = useState<DeviceCapability>("medium");

  // Camera debug info (for development)
  const [cameraDebug, setCameraDebug] = useState({
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    distance: 0,
  });

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
   * Falls back to sine wave simulation if no bones available
   */
  const extractJointAngles = useCallback((): JointAngles => {
    const bones = bonesRef.current;
    const smoothingFactor = 0.15; // 較低 = 更平滑 (0.1-0.3)

    let rawAngles: JointAngles;

    // 如果沒有骨架，使用模擬
    if (bones.length === 0) {
      const time = Date.now() * 0.001;
      rawAngles = {
        j1: Math.sin(time * 0.3) * 45,
        j2: 30 + Math.sin(time * 0.4) * 25,
        j3: -45 + Math.sin(time * 0.5) * 30,
        j4: Math.sin(time * 0.6) * 90,
        j5: Math.sin(time * 0.35) * 45,
        j6: Math.sin(time * 0.8) * 180,
      };
    } else {
      // 從骨架讀取角度（轉換為度數）
      const radToDeg = (rad: number) => rad * (180 / Math.PI);
      rawAngles = {
        j1: bones[0] ? radToDeg(bones[0].rotation.y) : 0,
        j2: bones[1] ? radToDeg(bones[1].rotation.z) : 0,
        j3: bones[2] ? radToDeg(bones[2].rotation.z) : 0,
        j4: bones[3] ? radToDeg(bones[3].rotation.x) : 0,
        j5: bones[4] ? radToDeg(bones[4].rotation.z) : 0,
        j6: bones[5] ? radToDeg(bones[5].rotation.x) : 0,
      };
    }

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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      CAMERA_SETTINGS.fov,
      width / height,
      CAMERA_SETTINGS.near,
      CAMERA_SETTINGS.far
    );

    // 距離計算公式： 距離 = √(x² + (y - target.y)² + z²)
    camera.position.set(0.3, 1.7, 4.3);
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
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls with touch support
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.target.set(0, 2, 0); // 相機看向的位置 - 調低 y 讓視角對準模型下半部
    controls.enablePan = true; // Enable panning for mobile
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.5);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff6600, 0.8);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x333333, 0x222222);
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
        // Prioritize bones with joint-related names
        const allBones: THREE.Bone[] = [];
        const jointBones: THREE.Bone[] = [];
        const jointKeywords = [
          "joint",
          "arm",
          "link",
          "shoulder",
          "elbow",
          "wrist",
          "axis",
          "rotate",
        ];

        model.traverse((child) => {
          console.log("name", child.name, "type", child.type);
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          if (child instanceof THREE.Bone) {
            allBones.push(child);
            const name = child.name.toLowerCase();
            if (jointKeywords.some((keyword) => name.includes(keyword))) {
              jointBones.push(child);
            }
          }
        });

        // Use joint-named bones if found, otherwise use all bones
        const selectedBones = jointBones.length >= 6 ? jointBones : allBones;
        bonesRef.current = selectedBones.slice(0, 6);

        console.log(
          `Found ${allBones.length} total bones, ${jointBones.length} joint-named bones`
        );
        console.log(
          "Selected bones:",
          bonesRef.current.map((b) => b.name)
        );

        scene.add(model);
        modelRef.current = model;

        // Set up animation mixer
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
          });
          mixerRef.current = mixer;
          console.log(`Playing ${gltf.animations.length} animations`);
        }

        setLoadingStatus("loaded");
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
          console.log(`Loading model: ${percent}%`);
        }
      },
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
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

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
    }

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
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
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e]">
      {loadingStatus === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white/60 text-lg animate-pulse">
            載入模型中...
          </div>
        </div>
      )}

      {/* Top HUD Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          {/* Sensor Data */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-white/50">負載</span>
              <span
                className={`font-mono font-medium ${
                  (sensorData?.jointLoad ?? 30) > 70
                    ? "text-red-400"
                    : (sensorData?.jointLoad ?? 30) > 50
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {sensorData?.jointLoad ?? 30}%
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-white/50">速度</span>
              <span className="font-mono font-medium text-blue-400">
                {sensorData?.speed ?? 200} mm/s
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-white/50">週期</span>
              <span className="font-mono font-medium text-purple-400">
                {sensorData?.cycleTime?.toFixed(1) ?? "12.0"}s
              </span>
            </div>
          </div>

          {/* FPS and Quality Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`px-2 py-1 rounded text-xs font-mono backdrop-blur-sm ${
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
              className={`px-2 py-1 rounded text-xs font-mono backdrop-blur-sm ${
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
        <div className="flex flex-col gap-1 px-3 py-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
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
        <div className="flex flex-col gap-1 px-3 py-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-xs font-mono">
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

      {/* 3D Model Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full [&_canvas]:block [&_canvas]:rounded-xl"
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
