#!/bin/bash

# GeoPort PostgreSQL 資料庫部署腳本
# 創建時間: 2025-09-24

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置變數
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-geoport_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

# 腳本目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 開始部署 GeoPort PostgreSQL 資料庫...${NC}"

# 檢查 PostgreSQL 是否安裝
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL 未安裝，請先安裝 PostgreSQL${NC}"
    exit 1
fi

# 檢查環境變數
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  請設置 DB_PASSWORD 環境變數${NC}"
    read -s -p "請輸入 PostgreSQL 密碼: " DB_PASSWORD
    echo
fi

# 設置 PGPASSWORD 環境變數
export PGPASSWORD="$DB_PASSWORD"

# 測試資料庫連線
echo -e "${BLUE}🔍 測試資料庫連線...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ 無法連接到 PostgreSQL 伺服器${NC}"
    echo "請檢查以下設定："
    echo "  - 主機: $DB_HOST"
    echo "  - 端口: $DB_PORT"
    echo "  - 用戶: $DB_USER"
    echo "  - 密碼: [已設置]"
    exit 1
fi

echo -e "${GREEN}✅ 資料庫連線成功${NC}"

# 創建資料庫 (如果不存在)
echo -e "${BLUE}📦 創建資料庫...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  資料庫 '$DB_NAME' 已存在${NC}"
    read -p "是否要重新創建資料庫？這將刪除所有現有資料！(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  刪除現有資料庫...${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✅ 資料庫已刪除${NC}"
    else
        echo -e "${BLUE}📝 使用現有資料庫${NC}"
    fi
fi

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${BLUE}🆕 創建新資料庫...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ 資料庫 '$DB_NAME' 創建成功${NC}"
fi

# 執行初始化腳本
echo -e "${BLUE}🔧 執行資料庫初始化...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/init.sql"
echo -e "${GREEN}✅ 資料庫初始化完成${NC}"

# 執行遷移腳本
echo -e "${BLUE}📋 執行資料庫遷移...${NC}"

# 按順序執行遷移腳本
MIGRATION_FILES=(
    "001_create_projects_table.sql"
    "002_create_data_files_table.sql"
    "003_create_spatial_layers_table.sql"
    "004_create_users_table.sql"
    "005_create_foreign_keys_and_indexes.sql"
)

for migration_file in "${MIGRATION_FILES[@]}"; do
    migration_path="$SCRIPT_DIR/migrations/$migration_file"
    if [ -f "$migration_path" ]; then
        echo -e "${BLUE}  📄 執行 $migration_file...${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_path"
        echo -e "${GREEN}  ✅ $migration_file 完成${NC}"
    else
        echo -e "${YELLOW}  ⚠️  找不到 $migration_file${NC}"
    fi
done

echo -e "${GREEN}✅ 所有遷移腳本執行完成${NC}"

# 驗證資料庫結構
echo -e "${BLUE}🔍 驗證資料庫結構...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"

echo -e "${BLUE}📊 資料庫統計資訊:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    'Tables' as type,
    COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Views' as type,
    COUNT(*) as count
FROM pg_views 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Functions' as type,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
"

# 創建預設管理員用戶 (可選)
echo -e "${BLUE}👤 是否要創建預設管理員用戶？${NC}"
read -p "創建預設管理員用戶 (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "請輸入管理員用戶名 (預設: admin): " admin_username
    admin_username=${admin_username:-admin}
    
    read -s -p "請輸入管理員密碼: " admin_password
    echo
    
    read -p "請輸入管理員郵箱: " admin_email
    
    # 這裡需要實際的密碼雜湊邏輯
    echo -e "${YELLOW}⚠️  請手動創建管理員用戶，或使用應用程式的註冊功能${NC}"
fi

echo -e "${GREEN}🎉 資料庫部署完成！${NC}"
echo -e "${BLUE}📋 部署摘要:${NC}"
echo "  - 資料庫名稱: $DB_NAME"
echo "  - 主機: $DB_HOST:$DB_PORT"
echo "  - 用戶: $DB_USER"
echo "  - 表數量: $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';")"
echo "  - 視圖數量: $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public';")"

echo -e "${BLUE}🔗 連線字串範例:${NC}"
echo "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo -e "${YELLOW}📝 下一步:${NC}"
echo "1. 更新 .env 文件中的資料庫配置"
echo "2. 啟動後端應用程式"
echo "3. 測試 API 連線"

# 清理環境變數
unset PGPASSWORD

echo -e "${GREEN}✨ 部署腳本執行完成！${NC}"
