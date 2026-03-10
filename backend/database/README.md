# GeoPort PostgreSQL 資料庫設計

## 概述

GeoPort 災情資料搜集系統使用 PostgreSQL 作為主要資料庫，配合 PostGIS 擴展處理空間資料。本資料庫設計遵循關聯式資料庫正規化原則，並針對災情資料管理、空間資料處理和 WebGIS 應用進行優化。

## 系統架構

### 核心概念

1. **事件/專案 (Project/Case)**: 一個獨立的單元，像資料夾
2. **多源資料 (Data Sources)**: Shapefile、GeoJSON、LiDAR DEM、影像、CSV、現地調查表
3. **WebGIS 呈現**: 空間資料能被檢索、繪製、關聯到專案

### 資料庫結構

```
geoport_db/
├── projects          # 專案/事件資料表
├── data_files        # 原始資料檔案記錄
├── spatial_layers    # WebGIS 可讀的圖層
├── users            # 用戶權限管理
└── 視圖和函數        # 輔助查詢和統計
```

## 表結構詳解

### 1. projects 表

**用途**: 對應「事件專案資料夾」概念

**主要欄位**:

- `project_id`: 專案唯一識別碼 (UUID)
- `name`: 專案名稱
- `description`: 專案描述
- `project_type`: 專案類型 (disaster, monitoring, research)
- `category`: 專案分類/災害類型
- `location_geometry`: 專案主要位置座標 (PostGIS)
- `road_type`: 道路類型 (highway, national, railway)
- `road_number`: 道路編號
- `road_section`: 路段描述
- `status`: 專案狀態 (active, completed, archived, draft)
- `priority`: 專案優先級 (low, medium, high, urgent)
- `owner_id`: 專案負責人ID
- `file_count`: 檔案數量統計
- `total_size`: 總檔案大小
- `layer_count`: 圖層數量統計

### 2. data_files 表

**用途**: 記錄上傳的原始資料檔案

**主要欄位**:

- `file_id`: 檔案唯一識別碼 (UUID)
- `project_id`: 所屬專案ID (外鍵)
- `file_name`: 檔案名稱
- `file_type`: 檔案類型 (raster, vector, csv, lidar, report, image, document, other)
- `file_size`: 檔案大小 (bytes)
- `storage_path`: 檔案儲存路徑
- `storage_type`: 儲存類型 (local, s3, gcs)
- `file_hash`: 檔案雜湊值 (SHA-256)
- `uploader_id`: 上傳者ID (外鍵)
- `has_spatial_data`: 是否包含空間資料
- `spatial_extent`: 空間範圍 (PostGIS)
- `srid`: 空間參考系統ID
- `data_quality_score`: 資料品質評分 (0-1)
- `validation_status`: 驗證狀態 (pending, valid, invalid, warning)

### 3. spatial_layers 表

**用途**: 對應到 WebGIS 可讀的圖層

**主要欄位**:

- `layer_id`: 圖層唯一識別碼 (UUID)
- `project_id`: 所屬專案ID (外鍵)
- `source_file_id`: 來源檔案ID (外鍵)
- `layer_name`: 圖層名稱
- `geometry_type`: 幾何類型 (Point, LineString, Polygon, Raster, etc.)
- `srid`: 空間參考系統ID
- `spatial_extent`: 空間範圍 (PostGIS)
- `feature_count`: 要素數量
- `vertex_count`: 頂點數量
- `attributes`: 屬性結構定義 (JSON)
- `layer_style`: 圖層樣式設定 (JSON)
- `opacity`: 透明度 (0-1)
- `visible`: 是否可見
- `z_index`: 圖層順序
- `processing_status`: 處理狀態 (pending, processing, completed, failed)

### 4. users 表

**用途**: 控管資料上傳與查看權限

**主要欄位**:

- `user_id`: 用戶唯一識別碼 (UUID)
- `username`: 用戶名稱
- `email`: 電子郵件
- `role`: 用戶角色 (admin, editor, viewer)
- `permissions`: 額外權限陣列
- `organization`: 所屬組織
- `department`: 所屬部門
- `position`: 職位
- `is_active`: 帳戶是否啟用
- `is_verified`: 郵箱是否驗證
- `last_login_at`: 最後登入時間
- `login_count`: 登入次數
- `upload_count`: 上傳次數
- `total_upload_size`: 總上傳大小

## 索引設計

### 主要索引

1. **主鍵索引**: 所有表的主鍵自動創建
2. **外鍵索引**: 提升關聯查詢效能
3. **全文搜尋索引**: 支援中文全文搜尋
4. **空間索引**: PostGIS GIST 索引
5. **複合索引**: 針對常用查詢組合

### 特殊索引

- **部分索引**: 只對活躍資料建立索引
- **函數索引**: 支援複雜查詢條件
- **覆蓋索引**: 減少回表查詢

## 視圖設計

### 1. active_projects

活躍專案視圖，排除已刪除的專案

### 2. active_data_files

活躍檔案視圖，包含專案資訊

### 3. active_spatial_layers

活躍圖層視圖，包含專案和檔案資訊

### 4. webgis_layers

WebGIS 圖層列表，只包含有效的圖層

### 5. 統計視圖

- `project_statistics`: 專案統計資訊
- `file_statistics`: 檔案統計資訊
- `layer_statistics`: 圖層統計資訊
- `user_statistics`: 用戶統計資訊
- `organization_statistics`: 組織統計資訊

## 函數設計

### 1. 工具函數

- `update_updated_at_column()`: 自動更新時間戳記
- `generate_ulid()`: 生成 ULID 格式識別碼
- `validate_srid()`: 驗證空間座標系統
- `format_file_size()`: 格式化檔案大小顯示

### 2. 業務函數

- `check_user_permission()`: 檢查用戶權限
- `update_user_login_info()`: 更新用戶登入資訊
- `check_data_integrity()`: 檢查資料完整性
- `repair_project_statistics()`: 修復專案統計資訊
- `cleanup_old_sessions()`: 清理過期會話

### 3. 維護函數

- `update_table_statistics()`: 更新表統計資訊

## 觸發器設計

### 1. 自動更新觸發器

- 所有表的 `updated_at` 欄位自動更新

### 2. 統計更新觸發器

- 檔案變更時自動更新專案統計
- 圖層變更時自動更新專案統計

### 3. 業務邏輯觸發器

- 專案軟刪除時同步刪除相關檔案和圖層
- 用戶帳戶鎖定檢查
- 圖層邊界框自動計算

## 部署指南

### 1. 環境需求

- PostgreSQL 12+
- PostGIS 3.0+
- 足夠的磁碟空間
- 適當的記憶體配置

### 2. 部署步驟

```bash
# 1. 設置環境變數
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=geoport_db
export DB_USER=postgres
export DB_PASSWORD=your_password

# 2. 執行部署腳本
cd backend/database
./deploy.sh

# 3. 驗證部署
./manage.sh status
```

### 3. 管理命令

```bash
# 備份資料庫
./manage.sh backup

# 還原資料庫
./manage.sh restore

# 檢查資料完整性
./manage.sh integrity

# 修復統計資訊
./manage.sh repair

# 清理過期資料
./manage.sh cleanup

# 開啟資料庫 shell
./manage.sh shell
```

## 效能優化

### 1. 查詢優化

- 使用適當的索引
- 避免全表掃描
- 使用視圖簡化複雜查詢
- 合理使用 LIMIT 和 OFFSET

### 2. 空間查詢優化

- 使用空間索引 (GIST)
- 適當的座標系統轉換
- 空間範圍查詢優化

### 3. 維護策略

- 定期更新統計資訊
- 監控慢查詢
- 定期清理過期資料
- 備份策略

## 安全考量

### 1. 資料保護

- 軟刪除機制
- 資料完整性約束
- 外鍵約束
- 檢查約束

### 2. 權限控制

- 角色基礎存取控制
- 細粒度權限管理
- 會話管理
- 帳戶鎖定機制

### 3. 資料備份

- 定期備份
- 增量備份
- 異地備份
- 備份驗證

## 監控和維護

### 1. 效能監控

- 查詢執行時間
- 索引使用情況
- 連線池狀態
- 磁碟使用量

### 2. 資料品質

- 資料完整性檢查
- 統計資訊一致性
- 空間資料驗證
- 檔案完整性驗證

### 3. 定期維護

- 統計資訊更新
- 索引重建
- 資料庫清理
- 備份驗證

## 擴展性考量

### 1. 水平擴展

- 讀寫分離
- 分片策略
- 負載均衡

### 2. 垂直擴展

- 硬體升級
- 記憶體優化
- 磁碟 I/O 優化

### 3. 功能擴展

- 新資料類型支援
- 額外索引策略
- 自定義函數
- 觸發器擴展

## 故障排除

### 1. 常見問題

- 連線超時
- 鎖等待
- 索引失效
- 統計資訊過期

### 2. 診斷工具

- `pg_stat_activity`: 活動查詢
- `pg_locks`: 鎖定資訊
- `pg_stat_user_tables`: 表統計
- `pg_stat_user_indexes`: 索引統計

### 3. 解決方案

- 查詢優化
- 索引調整
- 配置調優
- 硬體升級

## 版本控制

### 1. 遷移腳本

- 版本化資料庫變更
- 向前和向後相容性
- 資料遷移策略

### 2. 版本管理

- 遷移腳本命名規範
- 版本追蹤
- 回滾策略

## 聯絡資訊

如有問題或建議，請聯絡 GeoPort 開發團隊。

---

**最後更新**: 2025-09-24  
**版本**: 1.0.0  
**維護者**: GeoPort Team
