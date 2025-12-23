# 🤖 機械手臂監控系統 - Digital Twin 即時視覺化平台

一個基於 **Next.js 15** 與 **Three.js** 建構的工業機械手臂數位分身 (Digital Twin) 監控系統，展示即時 3D 視覺化、效能自適應與專業級 HUD 介面設計。

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r182-black?style=flat-square&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss)

---

## ✨ 專案特色

### 🎯 核心功能

- **即時 3D 視覺化**：載入 GLB 格式機械手臂模型，支援骨架動畫與關節角度讀取
- **Digital Twin 數據同步**：從 3D 模型動態計算並顯示感測器數據（負荷、速率、週期）
- **專業級 HUD 介面**：工業標準的監控面板設計，含狀態指示燈與告警系統
- **平滑歸位動畫**：支援一鍵歸位，相機與視角採用 Ease-InOut Cubic 緩動過場

### ⚡ 效能優化

- **裝置自適應渲染**：根據 GPU 類型、CPU 核心數、記憶體自動調整畫質等級 (High/Medium/Low)
- **FPS 即時監控**：滑動視窗平均演算法，避免數據跳動
- **動態品質降級**：FPS 持續低於目標時自動降低畫質，確保流暢體驗

### 🏗️ 架構設計

- **Feature-level Colocation**：每個功能模組 (3D 場景、感測器面板、告警系統) 獨立封裝
- **Clean Code 原則**：遵循 SOLID 設計原則，單一職責、依賴反轉
- **型別安全**：完整的 TypeScript 型別定義，避免 `any` 使用

---

## 🛠️ 技術棧

| 類別           | 技術                         |
| :------------- | :--------------------------- |
| **Framework**  | Next.js 15 (App Router)      |
| **UI Library** | React 19                     |
| **3D Engine**  | Three.js r182                |
| **Styling**    | Tailwind CSS v4              |
| **Language**   | TypeScript 5                 |
| **Build**      | Turbopack                    |
| **Deployment** | GitHub Pages (Static Export) |

---

## 📂 專案結構

```
src/
├── app/                      # Next.js App Router
│   └── page.tsx              # 主頁面 (Dashboard)
├── features/                 # 功能模組 (Feature-level Colocation)
│   ├── motor-3d/             # 3D 視覺化模組
│   │   ├── components/       # MotorScene, MotorModel
│   │   ├── hooks/            # useMotorAnimation
│   │   ├── utils/            # 效能監控 (FPSMonitor, AdaptiveQualityController)
│   │   └── constants/        # 相機、燈光、動畫設定
│   ├── sensor-panel/         # 感測器面板模組
│   │   ├── components/       # SensorCard
│   │   ├── hooks/            # useSensorData
│   │   └── types/            # SensorData, JointAngles
│   └── alert-system/         # 告警系統模組
│       ├── components/       # AlertBanner
│       ├── hooks/            # useAlertDetection
│       └── constants/        # 閾值設定
└── shared/                   # 共用元件
    └── components/           # Card (Glassmorphism)
```

---

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

### 建置靜態網站

```bash
npm run build
```

輸出至 `out/` 目錄，可直接部署至任何靜態網站服務。

---

## 🎮 操作說明

| 操作            | 功能                   |
| :-------------- | :--------------------- |
| 🖱️ **滑鼠拖曳** | 旋轉視角               |
| 🔍 **滾輪縮放** | 調整相機距離           |
| 📱 **觸控支援** | 單指旋轉、雙指縮放平移 |
| ⏸️ **暫停按鈕** | 暫停/繼續動畫播放      |
| 🏠 **歸位按鈕** | 平滑回歸初始視角       |

---

## 📊 效能指標

系統會根據裝置能力自動調整畫質：

| 等級       | Pixel Ratio | 陰影解析度 | 抗鋸齒 | 目標 FPS |
| :--------- | :---------- | :--------- | :----- | :------- |
| **HIGH**   | 2.0x        | 2048px     | ✅     | 60       |
| **MEDIUM** | 1.5x        | 1024px     | ✅     | 30       |
| **LOW**    | 1.0x        | 512px      | ❌     | 30       |

---

## 🔧 設定檔說明

### 環境適應 (next.config.ts)

```typescript
const isProd = process.env.NODE_ENV === "production";
const nextConfig = {
  basePath: isProd ? "/threejs-demo" : "", // GitHub Pages 路徑
  assetPrefix: isProd ? "/threejs-demo" : "",
};
```

### 效能參數 (performanceUtils.ts)

- `FPSMonitor`: 60 幀滑動視窗平均
- `AdaptiveQualityController`: 120 幀低 FPS 後降級，300 幀高 FPS 後升級

---

## 🌐 線上 Demo

👉 [https://mtwmt.github.io/threejs-demo](https://mtwmt.github.io/threejs-demo)

---

## 📝 開發規範

本專案遵循 `.agent/workflows/project-guidelines.md` 中定義的規範：

- **React 19**: 使用 Hooks (`useState`, `useCallback`, `useRef`, `useEffect`)
- **TypeScript**: 完整型別定義，禁用 `any`
- **Three.js**: 資源在 `useEffect` cleanup 中 `dispose()`
- **Tailwind CSS v4**: 使用官方 utility classes
- **SOLID 原則**: 單一職責、開放封閉、依賴反轉

---

## 📄 License

MIT License © 2024

---

## 🙏 致謝

- 3D 模型來源：[Sketchfab - KUMA Heavy Robot R-9000S](https://sketchfab.com/)
- 圖標：Emoji (跨平台原生支援)
