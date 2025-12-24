'use client';

import { DeltaLogo3D } from '@/features/motor-3d/components/DeltaLogo3D';

export default function DeltaLogoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Delta 3D Logo
        </h1>
        <p className="text-white/60 text-center mb-8">
          旋轉觀看：正面顯示 DELTA 文字，側面顯示三角形 Logo
        </p>
        
        <DeltaLogo3D 
          autoRotateSpeed={1} 
          height="500px" 
        />
      </div>
    </main>
  );
}
