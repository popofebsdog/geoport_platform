# GeoPort 災情資料搜集系統

GeoPort 是一個以 **PostgreSQL/PostGIS + Vue.js 3 + Express.js + Docker** 為核心的前後端分離災情資料搜集與管理平台，支援地理資訊展示、災情點位管理、時序資料分析與報告流程，並已完成 SSDLC 安全強化。

## 🏗️ 專案架構

```text
geoport_platform/
├── frontend/          # Vue.js 3 + Vite 前端應用
├── backend/           # Express.js 後端 API
│   ├── src/
│   │   ├── config/        # 資料庫、環境驗證配置
│   │   ├── controllers/   # 路由控制器
│   │   ├── middleware/     # 認證、錯誤處理、限流、審計日誌
│   │   ├── models/        # Sequelize 資料模型
│   │   ├── routes/        # API 路由定義
│   │   ├── utils/         # 日誌等工具
│   │   └── __tests__/     # Jest 測試套件
│   └── uploads/       # 上傳文件存儲
├── data/              # 專案數據
├── docs/              # SSDLC 文檔
├── docker-compose.yml # Docker Compose 部署 (5 services)
└── README.md
```

## 🛠️ 技術棧

### 前端
- **Vue.js 3 + Composition API**
- **Vite 4**（建置工具）
- **Leaflet + leaflet-omnivore**（地圖與地理資料）
- **Chart.js**（圖表）
- **Axios**（HTTP Client）
- **Vitest + @vue/test-utils**（測試）

### 後端
- **Node.js 18+（ESM）**
- **Express.js 4**
- **PostgreSQL 15 + PostGIS**（`pg` driver + Sequelize v6）
- **JWT Bearer Token Authentication**
- **Winston**（結構化日誌）
- **Jest（ESM mode）**

### 基礎設施
- **Docker Compose（5 個服務）**：postgres、backend、frontend、titiler、nginx
- **TiTiler**（COG tile server）
- **Nginx**（Reverse Proxy）

## 🔒 安全強化功能（SSDLC）

- 🔒 Helmet（強化 CSP）與 HSTS（1 年 + preload）
- 🔒 CORS 依環境變數白名單控制來源
- 🔒 Rate limiting：全域 API `100 req / 15min`、認證端點 `10 req / 15min`
- 🔒 請求主體大小限制：JSON / form `1MB`（檔案上傳由 multer 路由處理）
- 🔒 JWT Bearer Token 驗證
- 🔒 審計日誌（Security-relevant events）
- 🔒 Production 錯誤訊息去敏（不暴露內部細節）
- 🔒 Joi 輸入驗證
- 🔒 啟動時環境變數驗證

## 🚀 快速開始

### 環境需求

- Node.js 18+
- npm
- PostgreSQL 15+（或使用 Docker）

### 本地開發

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd geoport_platform
   ```

2. **安裝所有依賴**
   ```bash
   npm run install:all
   ```

3. **設定環境變數**
   ```bash
   # 後端
   cp backend/env.example backend/.env

   # 前端
   cp frontend/env.example frontend/.env
   ```
   請在 `backend/.env` 設定 PostgreSQL 連線資訊（`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`）與 JWT 參數。

4. **啟動開發服務**
   ```bash
   npm run dev
   ```
   會同時啟動 backend、frontend 與 TiTiler。

### Docker 部署

1. **構建並啟動容器**
   ```bash
   npm run docker:build
   npm run docker:up
   ```

2. **查看日誌**
   ```bash
   npm run docker:logs
   ```

3. **停止容器**
   ```bash
   npm run docker:down
   ```

## 📝 環境變數

### 後端（`backend/.env`）

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
DB_HOST=localhost
DB_PORT=5432
DB_NAME=geoport_db
DB_USER=postgres
DB_PASSWORD=your-postgres-password
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
LOG_LEVEL=info
```

## 📡 API 端點

> 以下為目前實際掛載路由（以 `backend/src/app.js` 與各 route 檔案為準）。

| 分類 | Endpoint | Method | 說明 |
|------|----------|--------|------|
| Health | /api/health | GET | 基本健康檢查 |
| Health | /api/health/ready | GET | 就緒檢查（含資料庫連線） |
| Auth | /api/auth | GET | 認證 API 索引 |
| Auth | /api/auth/register | POST | 用戶註冊 |
| Auth | /api/auth/login | POST | 用戶登入（JWT） |
| Auth | /api/auth/logout | POST | 用戶登出 |
| Auth | /api/auth/profile | GET | 取得目前用戶資料 |
| Auth | /api/auth/users | GET | 管理員查詢用戶清單 |
| Auth | /api/auth/users/:id | PUT | 管理員更新用戶狀態/角色 |
| Projects | /api/projects | GET/POST | 專案列表/新增 |
| Projects | /api/projects/deleted | GET | 已刪除專案列表 |
| Projects | /api/projects/:id | GET/PUT/DELETE | 專案 CRUD |
| Projects | /api/projects/:id/bookmark | PATCH | 切換書籤 |
| Projects | /api/projects/:id/restore | PATCH | 還原專案 |
| Parent Projects | /api/parent-projects | GET/POST | 母專案列表/新增 |
| Parent Projects | /api/parent-projects/:id | GET/PUT/DELETE | 母專案 CRUD |
| Parent Projects | /api/parent-projects/:parentId/children | GET/POST | 以母專案管理子專案 |
| Parent Projects | /api/parent-projects/:id/report-links | GET/POST | 報告關聯列表/新增 |
| Parent Projects | /api/parent-projects/:id/report-links/:linkId | PUT/DELETE | 報告關聯更新/刪除 |
| Child Projects | /api/child-projects | GET | 子專案列表 |
| Child Projects | /api/child-projects/:id | GET/PUT/DELETE | 子專案 CRUD |
| Data | /api/data | GET | 數據 API 索引 |
| Data | /api/data/upload | POST | 上傳數據檔案 |
| Data | /api/data/project/:projectId | GET | 取得專案數據列表 |
| Data | /api/data/project/:projectId/geojson | GET | 取得專案 GeoJSON |
| Data | /api/data/project/:projectId/geojson-list | GET | 取得專案 GeoJSON 清單 |
| Data | /api/data/project/:projectId/basemaps | GET | 取得專案底圖清單 |
| Data | /api/data/potential-analysis/:fileId/intervals | GET | 潛勢分析區間設定 |
| Data | /api/data/:id | GET/PUT/DELETE | 單筆數據 CRUD |
| Data | /api/data/:id/download | GET | 下載數據檔案 |
| Data | /api/data/feature/upload | POST | 關聯上傳至 GeoJSON feature |
| Data | /api/data/feature/:dataFilesId/:featureId | GET | 取得 feature 關聯上傳資料 |
| Data | /api/data/feature/:uploadId | DELETE | 刪除 feature 關聯上傳資料 |
| Data Files | /api/data-files | GET/POST | 資料檔案列表/新增 |
| Data Files | /api/data-files/deleted | GET | 已刪除資料檔案列表 |
| Data Files | /api/data-files/:id | GET/PUT/DELETE | 資料檔案 CRUD |
| Data Files | /api/data-files/:id/permanent | DELETE | 永久刪除資料檔案 |
| Data Files | /api/data-files/:id/restore | PATCH | 還原資料檔案 |
| Reports | /api/reports | GET/POST | 報告列表/新增 |
| Reports | /api/reports/deleted | GET | 已刪除報告列表 |
| Reports | /api/reports/:id | GET/PUT/DELETE | 報告 CRUD |
| Reports | /api/reports/:id/bookmark | PATCH | 切換報告書籤 |
| Reports | /api/reports/:id/restore | PATCH | 還原報告 |
| Temporal Data | /api/projects/:projectId/temporal-data | GET | 專案時序資料列表 |
| Temporal Data | /api/projects/:projectId/temporal-data/upload | POST | 上傳時序資料 |
| Temporal Data | /api/temporal-data/:temporalId | GET/PUT/DELETE | 單筆時序資料 CRUD |
| Temporal Data | /api/temporal-data/:temporalId/chart | GET | 時序圖表資料 |
| Temporal Data | /api/temporal-data/:temporalId/parse | POST | 解析 CSV 作圖資料 |
| Temporal Data | /api/temporal-data/:temporalId/columns | GET | 可用欄位清單 |
| Temporal Data | /api/temporal-data/:temporalId/chart/apex | POST | 產生 Apex 圖表配置 |
| Temporal Data | /api/temporal-data/:temporalId/chart/preview | GET | 圖表預覽資訊 |
| Temporal Data Enhanced | /api/temporal-data-enhanced/:projectId/upload | POST | 上傳增強時序資料 |
| Temporal Data Enhanced | /api/temporal-data-enhanced/:projectId/list | GET | 專案增強時序資料列表 |
| Temporal Data Enhanced | /api/temporal-data-enhanced/:temporalId | GET/PUT/DELETE | 單筆增強時序資料 CRUD |
| Temporal Data Enhanced | /api/temporal-data-enhanced/:temporalId/chart | GET | 增強時序圖表資料 |
| Temporal Data Enhanced | /api/temporal-data-enhanced/:temporalId/json | GET | 下載 JSON |
| Temporal Data Enhanced | /api/temporal-data-enhanced/:temporalId/parse | POST | 解析並產生圖表資料 |
| Disaster Points | /api/disaster-points/project/:projectId | GET | 專案災點列表 |
| Disaster Points | /api/disaster-points/:id | GET/PUT/DELETE | 災點 CRUD |
| Disaster Points | /api/disaster-points | POST | 新增災點（含多媒體） |
| Disaster Points | /api/disaster-points/:disasterPointId/media/:mediaId | DELETE | 刪除災點媒體 |
| Warning Regions | /api/warning-regions | GET | 警戒區域列表 |
| Warning Regions | /api/warning-regions/:regionCode | GET | 依區域代碼查詢 |
| Warning Regions | /api/warning-regions/:regionCode/data | GET/POST | 區域資料查詢/更新 |
| Warning Regions | /api/warning-regions/id/:regionId/data | GET | 依 region_id 查詢區域資料 |
| Warning Regions | /api/warning-regions/create-project | POST | 建立區域專案（含上傳） |
| Warning Regions | /api/warning-regions/id/:regionId | PUT/DELETE | 更新/刪除區域專案 |
| Warning Regions | /api/warning-regions/:regionCode/point-colors | GET/POST | 點位顏色設定（region_code） |
| Warning Regions | /api/warning-regions/id/:regionId/point-colors | GET/POST | 點位顏色設定（region_id） |
| Warning Regions | /api/warning-regions/:regionCode/import-inspection | POST | 匯入巡查紀錄（Excel） |
| Warning Regions | /api/warning-regions/:regionCode/inspection-records | GET/POST | 巡查紀錄列表/新增 |
| Warning Regions | /api/warning-regions/:regionCode/inspection-records/:recordId | PUT/DELETE | 巡查紀錄更新/刪除 |
| Warning Regions | /api/warning-regions/id/:regionId/inspection-records | GET | 依 region_id 查詢巡查紀錄 |
| Warning Regions | /api/warning-regions/:regionCode/alert-lights | GET/POST | 告警燈號列表/新增 |
| Warning Regions | /api/warning-regions/:regionCode/alert-lights/:lightId | DELETE | 刪除告警燈號（region_code） |
| Warning Regions | /api/warning-regions/id/:regionId/alert-lights | GET | 告警燈號列表（region_id） |
| Warning Regions | /api/warning-regions/id/:regionId/alert-lights/:lightId | DELETE | 刪除告警燈號（region_id） |
| Warning Regions | /api/warning-regions/:regionCode/disaster-counts | GET | 里程災害統計（region_code） |
| Warning Regions | /api/warning-regions/id/:regionId/disaster-counts | GET | 里程災害統計（region_id） |

## 🔧 開發命令

```bash
# 開發
npm run dev                 # 同時啟動前後端 + TiTiler
npm run dev:backend         # 僅啟動後端
npm run dev:frontend        # 僅啟動前端

# 測試
npm test                    # 運行所有測試 (Backend Jest + Frontend Vitest)
npm run test:backend        # 後端測試 (Jest, 128 tests)
npm run test:frontend       # 前端測試 (Vitest, 17 tests)

# 程式碼品質
npm run lint                # ESLint 檢查
npm run lint:fix            # ESLint 自動修復

# 構建
npm run build               # 構建前後端

# Docker
npm run docker:build        # 構建 Docker 鏡像
npm run docker:up           # 啟動容器
npm run docker:down         # 停止容器
npm run docker:logs         # 查看日誌
```

## 🧪 測試

- **Backend**：Jest（ESM support），共 **128 tests / 8 suites**
  - middleware tests
  - auth routes
  - project routes
  - data routes
  - reports/disaster/warning
  - temporal data
  - security integration
  - health checks
- **Frontend**：Vitest + @vue/test-utils，共 **17 tests / 4 suites**
  - App
  - Login
  - Home
  - ProjectManagement

## ✅ SSDLC 合規說明

- 專案已完成 SSDLC hardening（Waves 1-3 完成，Wave 4 進行中）。
- 風險與弱點接受文件請參考：`docs/SSDLC_Audit_Risk_Acceptance.md`。
- Swagger API 文件可由 `/api-docs` 存取。
- CI/CD 流程透過 GitHub Actions 持續補強中（與本次安全治理同步進行）。

## 🐳 Docker 服務組成

1. **postgres** — PostgreSQL 15 Alpine（資料庫）
2. **backend** — Express.js API Server
3. **frontend** — Vue.js 3 development/production server
4. **titiler** — TiTiler COG tile server
5. **nginx** — Reverse proxy（ports 80/443）

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 開啟 Pull Request

## 📄 授權

本專案採用 MIT 授權，詳見 [LICENSE](LICENSE)。
