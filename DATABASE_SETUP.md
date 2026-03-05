# GeoPort PostgreSQL 資料庫快速部署指南

## 🚀 快速開始

### 1. 環境準備

確保您的系統已安裝：
- PostgreSQL 12+ 
- PostGIS 3.0+ 擴展
- Node.js 18+

### 2. 安裝 PostgreSQL 和 PostGIS

#### macOS (使用 Homebrew)
```bash
# 安裝 PostgreSQL
brew install postgresql postgis

# 啟動 PostgreSQL 服務
brew services start postgresql

# 創建資料庫用戶
createuser -s postgres
```

#### Ubuntu/Debian
```bash
# 安裝 PostgreSQL 和 PostGIS
sudo apt update
sudo apt install postgresql postgresql-contrib postgis postgresql-14-postgis-3

# 啟動服務
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
下載並安裝 [PostgreSQL](https://www.postgresql.org/download/windows/) 和 [PostGIS](https://postgis.net/install/)

### 3. 設置環境變數

創建 `.env` 文件：
```bash
cd backend
cp env.example .env
```

編輯 `.env` 文件：
```env
# 資料庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=geoport_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
```

### 4. 部署資料庫

```bash
# 進入資料庫目錄
cd backend/database

# 設置執行權限
chmod +x deploy.sh manage.sh

# 部署資料庫
./deploy.sh
```

### 5. 安裝後端依賴

```bash
cd backend
npm install
```

### 6. 啟動後端服務

```bash
npm run dev
```

## 📋 資料庫管理命令

### 基本管理
```bash
# 查看資料庫狀態
./manage.sh status

# 查看統計資訊
./manage.sh stats

# 備份資料庫
./manage.sh backup

# 還原資料庫
./manage.sh restore

# 重置資料庫
./manage.sh reset
```

### 維護命令
```bash
# 檢查資料完整性
./manage.sh integrity

# 修復統計資訊
./manage.sh repair

# 清理過期資料
./manage.sh cleanup

# 開啟資料庫 shell
./manage.sh shell
```

## 🗂️ 資料庫結構

### 核心表
- **projects**: 專案/事件資料
- **data_files**: 原始資料檔案記錄
- **spatial_layers**: WebGIS 圖層
- **users**: 用戶權限管理

### 主要視圖
- **active_projects**: 活躍專案
- **active_data_files**: 活躍檔案
- **active_spatial_layers**: 活躍圖層
- **webgis_layers**: WebGIS 圖層列表

## 🔧 配置說明

### 資料庫連線配置
```javascript
// backend/src/config/database.js
const config = {
  development: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'geoport_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    // ... 其他配置
  }
};
```

### 環境變數說明
- `DB_HOST`: 資料庫主機 (預設: localhost)
- `DB_PORT`: 資料庫端口 (預設: 5432)
- `DB_NAME`: 資料庫名稱 (預設: geoport_db)
- `DB_USER`: 資料庫用戶 (預設: postgres)
- `DB_PASSWORD`: 資料庫密碼
- `DB_SSL`: 是否使用 SSL (預設: false)

## 🚨 故障排除

### 常見問題

#### 1. 連線失敗
```bash
# 檢查 PostgreSQL 服務狀態
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# 檢查端口是否被占用
lsof -i :5432
```

#### 2. PostGIS 擴展未安裝
```sql
-- 連接到資料庫
psql -U postgres -d geoport_db

-- 安裝 PostGIS 擴展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

#### 3. 權限問題
```bash
# 檢查用戶權限
psql -U postgres -c "\du"

# 授予權限
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE geoport_db TO your_user;"
```

#### 4. 記憶體不足
```bash
# 檢查系統資源
free -h
df -h

# 調整 PostgreSQL 配置
sudo nano /etc/postgresql/14/main/postgresql.conf
```

### 日誌查看
```bash
# PostgreSQL 日誌
tail -f /var/log/postgresql/postgresql-14-main.log  # Linux
tail -f /usr/local/var/log/postgres.log             # macOS

# 應用程式日誌
cd backend
npm run dev
```

## 📊 效能監控

### 基本監控
```sql
-- 查看活躍連線
SELECT * FROM pg_stat_activity;

-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看慢查詢
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 索引使用情況
```sql
-- 查看索引使用統計
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

## 🔄 備份和還原

### 自動備份
```bash
# 創建備份腳本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres geoport_db > "$BACKUP_DIR/geoport_backup_$DATE.sql"
gzip "$BACKUP_DIR/geoport_backup_$DATE.sql"
EOF

chmod +x backup.sh

# 設置定時任務
crontab -e
# 添加: 0 2 * * * /path/to/backup.sh
```

### 手動備份
```bash
# 完整備份
pg_dump -h localhost -U postgres geoport_db > backup.sql

# 壓縮備份
pg_dump -h localhost -U postgres geoport_db | gzip > backup.sql.gz

# 還原備份
psql -h localhost -U postgres geoport_db < backup.sql
```

## 🎯 最佳實踐

### 1. 安全設定
- 使用強密碼
- 限制網路存取
- 定期更新 PostgreSQL
- 啟用 SSL (生產環境)

### 2. 效能優化
- 適當的記憶體配置
- 定期更新統計資訊
- 監控慢查詢
- 使用適當的索引

### 3. 維護策略
- 定期備份
- 監控磁碟空間
- 清理過期資料
- 更新統計資訊

## 📞 支援

如遇到問題，請：
1. 查看 [資料庫設計文檔](backend/database/README.md)
2. 檢查 [故障排除指南](#故障排除)
3. 聯絡開發團隊

---

**最後更新**: 2025-09-24  
**版本**: 1.0.0
