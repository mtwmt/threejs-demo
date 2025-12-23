# threejs-demo1 專案規範與架構指南

> 此文件為每次新對話的必讀參考資料

---

description: threejs-demo 專案的程式規範與結構架構

---

## 技術棧

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Three.js**
- **Tailwind CSS v4**

---

## 程式規範（官方最佳實踐）

### Next.js 15 (App Router)

- 使用 `use client` 標記客戶端元件
- Server Components 優先，僅在需要時使用 Client Components
- API Route 放在 `app/api/` 目錄
- 參考：https://nextjs.org/docs

### React 19

- 使用 `useState`, `useCallback`, `useRef`, `useEffect` Hooks
- 避免不必要的 re-render（使用 `React.memo` 或 `useMemo`）
- Props 命名使用 camelCase
- 參考：https://react.dev

### TypeScript

- 所有函數和元件都要有明確的型別定義
- 使用 `interface` 定義 Props 型別
- 避免使用 `any`
- 參考：https://www.typescriptlang.org/docs

### Three.js

- 資源清理：在 `useEffect` cleanup 中 `dispose()` 材質、幾何體
- 使用 `requestAnimationFrame` 進行動畫
- 使用 `OrbitControls` 處理相機控制
- 參考：https://threejs.org/docs

### Tailwind CSS v4

- 使用官方 utility classes
- 避免自定義 CSS（除非必要）
- 響應式設計使用 `sm:`, `md:`, `lg:` 前綴
- 參考：https://tailwindcss.com/docs

### 程式碼風格

- 元件檔案使用 PascalCase（如 `MotorScene.tsx`）
- Hook 檔案使用 camelCase（如 `useRobotApi.ts`）
- 常數使用 UPPER_SNAKE_CASE
- 每個函數/元件都要有 JSDoc 註解
- 保持單一職責原則 (SRP)

---

## 專案結構

```
src/
├── app/                  # Next.js App Router
├── features/             # 功能模組（Feature-level Colocation）
│   ├── motor-3d/        # 3D 視覺化模組
│   ├── sensor-panel/    # 感測器面板模組
│   └── alert-system/    # 告警系統模組
└── shared/              # 共用元件
```

---

## Feature-level Colocation 架構

每個 feature 模組包含自己的：

```
features/motor-3d/
├── components/          # 元件
├── hooks/               # Custom Hooks
├── utils/               # 工具函數
├── constants/           # 常數
├── types/               # TypeScript 型別
└── index.ts             # 對外導出
```

**原則：**

- 同一功能的檔案放在同一目錄
- 模組間透過 `index.ts` 明確導出
- 避免跨模組直接引用內部檔案

---

## Clean Code 原則 (SOLID)

| 原則               | 說明                    | 範例                                  |
| ------------------ | ----------------------- | ------------------------------------- |
| **SRP** (單一職責) | 每個函數/元件只做一件事 | `extractJointAngles()` 只讀取角度     |
| **OCP** (開放封閉) | 對擴展開放，對修改封閉  | 使用 props 而非硬編碼                 |
| **LSP** (里氏替換) | 子型別可替換父型別      | 介面一致性                            |
| **ISP** (介面隔離) | 不強迫依賴不需要的介面  | 型別拆分 `SensorData` / `JointAngles` |
| **DIP** (依賴反轉) | 依賴抽象而非具體實作    | Hook 回傳介面型別                     |

**其他原則：**

- DRY (Don't Repeat Yourself) - 抽取共用邏輯
- KISS (Keep It Simple) - 保持簡單
- 有意義的命名 - 變數/函數名稱要能自我解釋
- 小函數 - 每個函數不超過 20-30 行

---

_建立日期：2024-12-23_
