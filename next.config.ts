import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // 如果你的 GitHub Pages 網址包含專案名稱（例如 /threejs-demo/），請取消下面這行的註解
  // basePath: "/threejs-demo",
};

export default nextConfig;
