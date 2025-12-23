import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { ANIMATION_SETTINGS } from '../constants';

interface UseMotorAnimationProps {
  motorGroup: THREE.Group | null;
  rpm: number;
  maxRpm?: number;
}

interface UseMotorAnimationReturn {
  start: () => void;
  stop: () => void;
  isAnimating: boolean;
}

/**
 * Custom hook for managing motor rotation animation
 * Rotation speed scales with RPM value
 */
export function useMotorAnimation({
  motorGroup,
  rpm,
  maxRpm = 2000,
}: UseMotorAnimationProps): UseMotorAnimationReturn {
  const animationIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // Calculate rotation speed based on RPM
  const getRotationSpeed = useCallback(() => {
    const normalizedRpm = Math.min(rpm / maxRpm, 1);
    const { baseRotationSpeed, maxRotationSpeed } = ANIMATION_SETTINGS;
    return baseRotationSpeed + (maxRotationSpeed - baseRotationSpeed) * normalizedRpm;
  }, [rpm, maxRpm]);

  const animate = useCallback(() => {
    if (!motorGroup || !isAnimatingRef.current) return;

    const speed = getRotationSpeed();
    motorGroup.rotation.y += speed;

    animationIdRef.current = requestAnimationFrame(animate);
  }, [motorGroup, getRotationSpeed]);

  const start = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    animate();
  }, [animate]);

  const stop = useCallback(() => {
    isAnimatingRef.current = false;
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    isAnimating: isAnimatingRef.current,
  };
}
