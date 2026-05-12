# GeoPort 災情資料搜集系統

災情資料搜集與管理平台，整合 GIS 地圖、檔案上傳與專案管理功能。

## 技術棧

- **前端**：Vue3 + Vite + Tailwind CSS + Leaflet（地圖）+ Chart.js
- **後端**：Node.js + Express.js + Sequelize ORM + SQLite
- **地圖服務**：TiTiler（獨立 Python 服務，port 8080）
- **測試**：Jest（後端）
- **部署**：Docker Compose

## 常用指令

```bash
npm run dev            # 同時啟動前端、後端、TiTiler 三個服務
npm run dev:frontend   # 僅前端（port 5173）
npm run dev:backend    # 僅後端（port 3001）
npm run dev:titiler    # 僅 TiTiler（port 8080）
npm test               # 跑所有測試
npm run docker:up      # Docker 啟動
```

## 目錄結構

```
frontend/src/
  components/   Vue 元件
  views/        頁面（Home、Login、ProjectManagement、DisasterCollection 等）
  services/     API 呼叫
  composables/  Vue composables
  router/       路由

backend/src/
  controllers/  控制器
  models/       Sequelize 資料模型
  routes/       路由定義
  middleware/   認證等 middleware
  services/     業務邏輯
  config/       設定檔
```

## 環境變數

- 後端：`backend/.env`（PORT=3001、JWT_SECRET、DB_PATH）
- 前端：`frontend/.env`（VITE_API_URL=http://localhost:3001/api）
- **`.env` 絕對不能提交到 git**

## 注意事項

- TiTiler 是獨立的 Python 地圖磚服務，和 Node.js 後端分開運作
- 地圖座標系統使用 EPSG:3826（TWD97 台灣坐標）
- 資料庫操作一律透過 Sequelize，不使用裸 SQL
- 檔案上傳路徑在 `backend/uploads/`
- API 路由統一前綴 `/api`
