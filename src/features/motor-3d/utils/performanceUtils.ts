/**
 * Performance utilities for multi-device 3D rendering
 * Provides device detection, adaptive quality, and performance monitoring
 */

/**
 * Device capability levels for adaptive rendering
 */
export type DeviceCapability = 'high' | 'medium' | 'low';

/**
 * Rendering quality settings based on device capability
 */
export interface QualitySettings {
  pixelRatio: number;
  shadowMapSize: number;
  antialias: boolean;
  shadowsEnabled: boolean;
  maxLights: number;
  targetFPS: number;
}

/**
 * Get device pixel ratio safely (SSR compatible)
 */
function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

/**
 * Quality presets for different device capabilities
 * Note: pixelRatio is a getter to support SSR
 */
export const QUALITY_PRESETS: Record<DeviceCapability, QualitySettings> = {
  high: {
    get pixelRatio() { return Math.min(getDevicePixelRatio(), 2); },
    shadowMapSize: 2048,
    antialias: true,
    shadowsEnabled: true,
    maxLights: 4,
    targetFPS: 60,
  },
  medium: {
    get pixelRatio() { return Math.min(getDevicePixelRatio(), 1.5); },
    shadowMapSize: 1024,
    antialias: true,
    shadowsEnabled: true,
    maxLights: 3,
    targetFPS: 30,
  },
  low: {
    pixelRatio: 1,
    shadowMapSize: 512,
    antialias: false,
    shadowsEnabled: false,
    maxLights: 2,
    targetFPS: 30,
  },
};

/**
 * Detect device capability based on hardware and browser features
 */
export function detectDeviceCapability(): DeviceCapability {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return 'medium';
  }

  // Check for mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Check hardware concurrency (CPU cores)
  const cpuCores = navigator.hardwareConcurrency || 4;
  
  // Check device memory (if available)
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  
  // Check WebGL capabilities
  let webglCapability: 'high' | 'medium' | 'low' = 'medium';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Check for integrated vs discrete GPU
        if (/NVIDIA|AMD|Radeon|GeForce|RTX|GTX/i.test(renderer)) {
          webglCapability = 'high';
        } else if (/Intel|Mali|Adreno|Apple/i.test(renderer)) {
          webglCapability = isMobile ? 'low' : 'medium';
        }
      }
    }
  } catch {
    webglCapability = 'low';
  }
  
  // Calculate overall capability
  if (isMobile && deviceMemory < 4) {
    return 'low';
  }
  
  if (cpuCores >= 8 && deviceMemory >= 8 && webglCapability === 'high') {
    return 'high';
  }
  
  if (cpuCores >= 4 && deviceMemory >= 4) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Get quality settings based on device capability
 */
export function getQualitySettings(capability?: DeviceCapability): QualitySettings {
  const deviceCapability = capability || detectDeviceCapability();
  return QUALITY_PRESETS[deviceCapability];
}

/**
 * FPS Monitor class for performance tracking
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime: number = performance.now();
  private fps: number = 0;
  private frameCallback: ((fps: number) => void) | null = null;
  
  constructor(private sampleSize: number = 60) {}
  
  /**
   * Call this every frame to update FPS calculation
   */
  tick(): number {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    // Calculate instantaneous FPS
    const instantFPS = 1000 / delta;
    
    // Add to samples
    this.frames.push(instantFPS);
    if (this.frames.length > this.sampleSize) {
      this.frames.shift();
    }
    
    // Calculate average FPS
    this.fps = Math.round(
      this.frames.reduce((a, b) => a + b, 0) / this.frames.length
    );
    
    if (this.frameCallback) {
      this.frameCallback(this.fps);
    }
    
    return this.fps;
  }
  
  /**
   * Get current average FPS
   */
  getFPS(): number {
    return this.fps;
  }
  
  /**
   * Set callback for FPS updates
   */
  onUpdate(callback: (fps: number) => void): void {
    this.frameCallback = callback;
  }
  
  /**
   * Reset FPS samples
   */
  reset(): void {
    this.frames = [];
    this.fps = 0;
  }
}

/**
 * Adaptive quality controller
 * Automatically adjusts quality based on FPS
 */
export class AdaptiveQualityController {
  private currentCapability: DeviceCapability;
  private fpsMonitor: FPSMonitor;
  private lowFPSCount: number = 0;
  private highFPSCount: number = 0;
  private onQualityChange: ((settings: QualitySettings) => void) | null = null;
  
  constructor(initialCapability?: DeviceCapability) {
    this.currentCapability = initialCapability || detectDeviceCapability();
    this.fpsMonitor = new FPSMonitor();
  }
  
  /**
   * Call every frame to monitor and adapt quality
   */
  tick(): { fps: number; capability: DeviceCapability; settings: QualitySettings } {
    const fps = this.fpsMonitor.tick();
    const targetFPS = QUALITY_PRESETS[this.currentCapability].targetFPS;
    
    // Check if FPS is consistently low
    if (fps < targetFPS * 0.7) {
      this.lowFPSCount++;
      this.highFPSCount = 0;
      
      // Downgrade after 120 low FPS frames (about 4 seconds at 30fps)
      if (this.lowFPSCount > 120) {
        this.downgradeQuality();
        this.lowFPSCount = 0;
      }
    } else if (fps > targetFPS * 0.95) {
      this.highFPSCount++;
      this.lowFPSCount = 0;
      
      // Upgrade after 300 high FPS frames (about 5 seconds at 60fps)
      if (this.highFPSCount > 300) {
        this.upgradeQuality();
        this.highFPSCount = 0;
      }
    }
    
    return {
      fps,
      capability: this.currentCapability,
      settings: QUALITY_PRESETS[this.currentCapability],
    };
  }
  
  private downgradeQuality(): void {
    if (this.currentCapability === 'high') {
      this.currentCapability = 'medium';
      this.notifyChange();
    } else if (this.currentCapability === 'medium') {
      this.currentCapability = 'low';
      this.notifyChange();
    }
  }
  
  private upgradeQuality(): void {
    if (this.currentCapability === 'low') {
      this.currentCapability = 'medium';
      this.notifyChange();
    } else if (this.currentCapability === 'medium') {
      this.currentCapability = 'high';
      this.notifyChange();
    }
  }
  
  private notifyChange(): void {
    if (this.onQualityChange) {
      this.onQualityChange(QUALITY_PRESETS[this.currentCapability]);
    }
    console.log(`Quality changed to: ${this.currentCapability}`);
  }
  
  /**
   * Set callback for quality changes
   */
  onQualityUpdate(callback: (settings: QualitySettings) => void): void {
    this.onQualityChange = callback;
  }
  
  /**
   * Get current quality settings
   */
  getSettings(): QualitySettings {
    return QUALITY_PRESETS[this.currentCapability];
  }
  
  /**
   * Get current capability level
   */
  getCapability(): DeviceCapability {
    return this.currentCapability;
  }
}
