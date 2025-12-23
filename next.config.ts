import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // 必須設定 basePath 讓 Next.js 知道資源在 /threejs-demo/ 資料夾下
  basePath: "/threejs-demo",
  // 確保資產路徑正確
  assetPrefix: "/threejs-demo",
};

export default nextConfig;
