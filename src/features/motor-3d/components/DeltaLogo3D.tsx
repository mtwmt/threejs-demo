'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DELTA_BLUE = 0x00a0e9;
const DELTA_DARK = 0x0a0a0f;

interface DeltaLogo3DProps {
  autoRotateSpeed?: number;
  height?: string;
}

/**
 * Delta 3D Logo - Anamorphic Sculpture
 * 正面：DELTA 文字
 * 側面：Delta 三角形 Logo
 */
export function DeltaLogo3D({
  autoRotateSpeed = 0.5,
  height = '400px',
}: DeltaLogo3DProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const createAnamorphicLogo = useCallback((): THREE.Group => {
    const group = new THREE.Group();
    const gridSize = 64; // 更高解析度
    const blockSize = 0.045;

    const material = new THREE.MeshStandardMaterial({
      color: DELTA_BLUE,
      metalness: 0.5,
      roughness: 0.35,
    });

    // 創建兩個 2D 遮罩
    const textMask = createDeltaTextMask(gridSize);   // XY 平面
    const triangleMask = createTriangleMask(gridSize); // ZY 平面

    // 計算交集
    let count = 0;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!textMask[y][x]) continue;
        for (let z = 0; z < gridSize; z++) {
          if (triangleMask[y][z]) count++;
        }
      }
    }

    console.log(`Anamorphic blocks: ${count}`);

    if (count === 0) {
      group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
      return group;
    }

    const geo = new THREE.BoxGeometry(blockSize * 0.92, blockSize * 0.92, blockSize * 0.92);
    const mesh = new THREE.InstancedMesh(geo, material, count);
    const mat = new THREE.Matrix4();
    let idx = 0;
    const half = (gridSize * blockSize) / 2;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!textMask[y][x]) continue;
        for (let z = 0; z < gridSize; z++) {
          if (triangleMask[y][z]) {
            mat.setPosition(
              x * blockSize - half,
              y * blockSize - half,
              z * blockSize - half
            );
            mesh.setMatrixAt(idx++, mat);
          }
        }
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    return group;
  }, []);

  const initScene = useCallback(() => {
    if (!containerRef.current || isInitialized) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DELTA_DARK);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotateSpeed > 0;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.9);
    frontLight.position.set(0, 2, 10);
    scene.add(frontLight);

    const sideLight = new THREE.DirectionalLight(0xffffff, 0.9);
    sideLight.position.set(10, 2, 0);
    scene.add(sideLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const logo = createAnamorphicLogo();
    scene.add(logo);
    setIsInitialized(true);
  }, [isInitialized, autoRotateSpeed, createAnamorphicLogo]);

  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    controlsRef.current?.update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  const handleResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    cameraRef.current.aspect = w / h;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(w, h);
  }, []);

  useEffect(() => { initScene(); }, [initScene]);
  useEffect(() => {
    if (isInitialized) animate();
    return () => { if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current); };
  }, [isInitialized, animate]);
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  useEffect(() => {
    return () => {
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      controlsRef.current?.dispose();
    };
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#0a0a0f]" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <p className="m-0 text-center text-sm text-white/60">
          🖱️ 拖曳旋轉 | 正面：DELTA | 側面：△ Logo
        </p>
      </div>
    </div>
  );
}

/**
 * DELTA 文字遮罩 - 使用實心粗體字母
 * 每行都盡量填滿，確保側面三角形能完整顯示
 */
function createDeltaTextMask(size: number): boolean[][] {
  const mask: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // 更粗更實心的字母設計 (每個字母 8x10)
  const font: Record<string, string[]> = {
    D: [
      '######..',
      '########',
      '##....##',
      '##....##',
      '##....##',
      '##....##',
      '##....##',
      '##....##',
      '########',
      '######..',
    ],
    E: [
      '########',
      '########',
      '##......',
      '######..',
      '######..',
      '##......',
      '##......',
      '##......',
      '########',
      '########',
    ],
    L: [
      '##......',
      '##......',
      '##......',
      '##......',
      '##......',
      '##......',
      '##......',
      '##......',
      '########',
      '########',
    ],
    T: [
      '########',
      '########',
      '...##...',
      '...##...',
      '...##...',
      '...##...',
      '...##...',
      '...##...',
      '...##...',
      '...##...',
    ],
    A: [
      '...##...',
      '..####..',
      '.##..##.',
      '##....##',
      '########',
      '########',
      '##....##',
      '##....##',
      '##....##',
      '##....##',
    ],
  };

  const word = 'DELTA';
  const charW = 8;
  const charH = 10;
  const gap = 1;
  const totalW = word.length * charW + (word.length - 1) * gap;

  // 計算縮放使文字填滿大約 90% 的網格
  const scaleX = Math.floor((size * 0.92) / totalW);
  const scaleY = Math.floor((size * 0.92) / charH);
  const scale = Math.min(scaleX, scaleY);

  const actualW = totalW * scale;
  const actualH = charH * scale;
  const startX = Math.floor((size - actualW) / 2);
  const startY = Math.floor((size - actualH) / 2);

  for (let ci = 0; ci < word.length; ci++) {
    const ch = word[ci];
    const charData = font[ch];
    if (!charData) continue;

    const charStartX = startX + ci * (charW + gap) * scale;

    for (let row = 0; row < charH; row++) {
      const rowStr = charData[row] || '';
      for (let col = 0; col < charW; col++) {
        if (rowStr[col] === '#') {
          // 填充這個像素（放大 scale 倍）
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const gx = charStartX + col * scale + sx;
              // Y 軸翻轉（頂行在上）
              const gy = startY + (charH - 1 - row) * scale + sy;
              if (gx >= 0 && gx < size && gy >= 0 && gy < size) {
                mask[gy][gx] = true;
              }
            }
          }
        }
      }
    }
  }

  return mask;
}

/**
 * 三角形 Logo 遮罩 - 實心空心三角形
 */
function createTriangleMask(size: number): boolean[][] {
  const mask: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  const margin = size * 0.04;
  const centerZ = size / 2;
  
  // 外三角形
  const outerTop = size - margin;
  const outerBottom = margin;
  const outerLeft = margin;
  const outerRight = size - margin;
  
  // 內三角形（空心部分）
  const thick = size * 0.16;
  const innerTop = outerTop - thick * 2.2;
  const innerBottom = outerBottom + thick * 1.1;
  const innerLeft = outerLeft + thick * 1.4;
  const innerRight = outerRight - thick * 1.4;

  for (let y = 0; y < size; y++) {
    for (let z = 0; z < size; z++) {
      const inOuter = pointInTriangle(z, y, centerZ, outerTop, outerLeft, outerBottom, outerRight, outerBottom);
      if (inOuter) {
        const inInner = pointInTriangle(z, y, centerZ, innerTop, innerLeft, innerBottom, innerRight, innerBottom);
        if (!inInner) {
          mask[y][z] = true;
        }
      }
    }
  }

  return mask;
}

function pointInTriangle(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): boolean {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(d) < 1e-10) return false;
  const u = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
  const v = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
  const w = 1 - u - v;
  return u >= 0 && v >= 0 && w >= 0;
}

export default DeltaLogo3D;
