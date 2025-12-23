"use client";

import { useState, useCallback, useRef } from "react";
import { MotorScene, type MotorSceneHandle } from "@/features/motor-3d";
import { type JointAngles, type SensorData } from "@/features/sensor-panel";
import { useAlertDetection } from "@/features/alert-system";

/**
 * Main dashboard page
 * Composes all feature modules into a cohesive interface
 */
export default function Home() {
  const [isPaused, setIsPaused] = useState(false);
  const sceneRef = useRef<MotorSceneHandle>(null);

  // Primary data source: 3D model (real-time from GLB bones)
  const [sensorData, setSensorData] = useState<SensorData>({
    jointLoad: 30,
    speed: 200,
    cycleTime: 12,
  });
  const [jointAngles, setJointAngles] = useState<JointAngles>({
    j1: 0,
    j2: 0,
    j3: 0,
    j4: 0,
    j5: 0,
    j6: 0,
  });

  // Handle joint angles update from 3D model
  const handleJointAnglesUpdate = useCallback((angles: JointAngles) => {
    setJointAngles(angles);
  }, []);

  // Handle sensor data update from 3D model
  const handleSensorDataUpdate = useCallback((data: SensorData) => {
    setSensorData(data);
  }, []);

  // Get alert status from sensor data
  const { isOverheating, hasWarning } = useAlertDetection(sensorData);

  // Toggle motor pause state
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Handle home button click
  const handleReset = useCallback(() => {
    // 1. Reset 3D camera and view
    sceneRef.current?.resetView();

    // 2. Resume animation if paused
    setIsPaused(false);

    console.log("System reset to home position");
  }, []);

  // Status dot color class
  const statusDotClass = isOverheating
    ? "bg-red-500 shadow-[0_0_12px_var(--color-red-500)] animate-pulse"
    : hasWarning
    ? "bg-yellow-400 shadow-[0_0_12px_var(--color-yellow-400)]"
    : "bg-green-400 shadow-[0_0_12px_var(--color-green-400)]";

  return (
    <>
      {/* Alert Banner */}
      {/* <AlertBanner alerts={alerts} /> */}
      <main className="h-screen p-4 flex flex-col gap-6 max-w-[1600px] mx-auto animate-[fadeIn_0.5s_ease-out]">
        {/* Header */}
        <header className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
              機械手臂監控系統
            </h1>
            <p className="text-base text-white/70">Digital Twin 即時監控平台</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-sm border border-white/10">
              <span className={`w-3 h-3 rounded-full ${statusDotClass}`} />
              <span className="font-medium text-white/70">
                {isOverheating
                  ? "系統告警"
                  : hasWarning
                  ? "注意狀態"
                  : "執行正常"}
              </span>
            </div>
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className={`px-4 py-2 rounded-sm font-medium text-sm transition-all duration-300 ${
                  isPaused
                    ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                }`}
              >
                {isPaused ? "▶️ 繼續" : "⏸️ 暫停"}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-sm font-medium text-sm transition-all duration-300 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
              >
                🏠 歸位
              </button>
            </div>
          </div>
        </header>

        {/* 3D Motor Visualization - Full Width */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 rounded overflow-hidden border border-white/10">
            <MotorScene
              ref={sceneRef}
              isOverheating={isOverheating}
              isWarning={hasWarning}
              isPaused={isPaused}
              onJointAnglesUpdate={handleJointAnglesUpdate}
              onSensorDataUpdate={handleSensorDataUpdate}
              sensorData={sensorData}
              jointAngles={jointAngles}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-6 border-t border-white/10 text-white/50 text-sm flex flex-col gap-1">
          <p>使用 Next.js 15 + Three.js + TypeScript + Tailwind CSS v4 建構</p>
          <p>Feature-level Colocation 架構示範</p>
        </footer>
      </main>
    </>
  );
}
