# GeoPort 災情資料搜集系統

一個現代化的前後端分離災情資料搜集與管理系統，專為地理資訊系統（GIS）和災害監測設計。

## 🏗️ 專案架構

```
geoport/
├── frontend/          # Vue.js 前端應用
├── backend/           # Node.js/Express 後端 API
├── shared/            # 共享的類型定義和工具
├── data/              # 專案數據和上傳文件
├── docker-compose.yml # 容器化部署配置
└── README.md          # 專案說明文檔
```

## 🚀 快速開始

### 環境要求

- Node.js 18+
- npm 或 yarn
- Docker (可選)

### 本地開發

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd geoport
   ```

2. **安裝所有依賴**
   ```bash
   npm run install:all
   ```

3. **設置環境變數**
   ```bash
   # 後端環境變數
   cp backend/env.example backend/.env
   
   # 前端環境變數
   cp frontend/env.example frontend/.env
   ```

4. **啟動開發服務器**
   ```bash
   npm run dev
   ```

   這將同時啟動：
   - 前端開發服務器：http://localhost:5173
   - 後端 API 服務器：http://localhost:3001

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

## 📁 目錄結構

### Frontend (Vue.js)
- `src/components/` - Vue 組件
- `src/views/` - 頁面視圖
- `src/services/` - API 服務
- `src/utils/` - 工具函數
- `src/router/` - 路由配置

### Backend (Node.js/Express)
- `src/controllers/` - 控制器
- `src/models/` - 數據模型
- `src/routes/` - 路由定義
- `src/middleware/` - 中間件
- `src/services/` - 業務邏輯
- `src/config/` - 配置文件

## 🔧 主要功能

### 前端功能
- 📊 災情資料搜集界面
- 🗺️ 地圖視圖和專案定位
- 📋 專案管理和分類
- 🔍 搜尋和篩選功能
- 📁 文件上傳和管理
- 📈 數據視覺化圖表

### 後端功能
- 🔐 用戶認證和授權
- 📊 專案 CRUD 操作
- 📁 文件上傳和存儲
- 🗄️ 數據庫管理
- 📈 API 端點服務
- 🔒 數據驗證和安全

## 🛠️ 技術棧

### 前端
- **Vue.js 3** - 現代化前端框架
- **Vite** - 快速構建工具
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Leaflet** - 開源地圖庫
- **Chart.js** - 圖表庫
- **Axios** - HTTP 客戶端

### 後端
- **Node.js** - JavaScript 運行環境
- **Express.js** - Web 應用框架
- **Sequelize** - ORM 數據庫工具
- **SQLite** - 輕量級數據庫
- **Multer** - 文件上傳中間件
- **JWT** - 身份驗證

## 📡 API 端點

### 專案管理
- `GET /api/projects` - 獲取專案列表
- `POST /api/projects` - 創建新專案
- `GET /api/projects/:id` - 獲取特定專案
- `PUT /api/projects/:id` - 更新專案
- `DELETE /api/projects/:id` - 刪除專案

### 數據管理
- `GET /api/data` - 獲取數據列表
- `POST /api/data` - 上傳數據文件
- `GET /api/data/:id` - 獲取特定數據

### 報告管理
- `GET /api/reports` - 獲取報告列表
- `POST /api/reports` - 上傳報告
- `GET /api/reports/:id/download` - 下載報告

## 🔧 開發命令

```bash
# 開發
npm run dev                 # 同時啟動前後端
npm run dev:frontend        # 僅啟動前端
npm run dev:backend         # 僅啟動後端

# 構建
npm run build               # 構建所有
npm run build:frontend      # 構建前端
npm run build:backend       # 構建後端

# 測試
npm test                    # 運行所有測試
npm run test:frontend       # 前端測試
npm run test:backend        # 後端測試

# Docker
npm run docker:build        # 構建 Docker 鏡像
npm run docker:up           # 啟動容器
npm run docker:down         # 停止容器
npm run docker:logs         # 查看日誌
```

## 📝 環境變數

### 後端 (.env)
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DB_PATH=./database.sqlite
JWT_SECRET=your-secret-key
```

### 前端 (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=GeoPort 災情資料搜集系統
VITE_MAP_API_KEY=your-map-api-key
```

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

本專案採用 MIT 授權 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 📞 聯繫方式

- 專案維護者：[您的姓名]
- 電子郵件：[您的郵箱]
- 專案連結：[專案 URL]

## 🙏 致謝

感謝所有為此專案做出貢獻的開發者和開源社區。