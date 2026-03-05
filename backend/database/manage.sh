#!/bin/bash

# GeoPort PostgreSQL 資料庫管理腳本
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

# 顯示使用說明
show_help() {
    echo -e "${BLUE}GeoPort PostgreSQL 資料庫管理工具${NC}"
    echo
    echo "用法: $0 [命令]"
    echo
    echo "可用命令:"
    echo "  deploy      - 部署資料庫 (創建表結構)"
    echo "  backup      - 備份資料庫"
    echo "  restore     - 還原資料庫"
    echo "  reset       - 重置資料庫 (刪除所有資料)"
    echo "  status      - 顯示資料庫狀態"
    echo "  stats       - 顯示資料庫統計資訊"
    echo "  integrity   - 檢查資料完整性"
    echo "  repair      - 修復統計資訊"
    echo "  cleanup     - 清理過期資料"
    echo "  shell       - 開啟資料庫 shell"
    echo "  help        - 顯示此說明"
    echo
    echo "環境變數:"
    echo "  DB_HOST     - 資料庫主機 (預設: localhost)"
    echo "  DB_PORT     - 資料庫端口 (預設: 5432)"
    echo "  DB_NAME     - 資料庫名稱 (預設: geoport_db)"
    echo "  DB_USER     - 資料庫用戶 (預設: postgres)"
    echo "  DB_PASSWORD - 資料庫密碼 (預設: password)"
}

# 設置資料庫連線
setup_connection() {
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  請設置 DB_PASSWORD 環境變數${NC}"
        read -s -p "請輸入 PostgreSQL 密碼: " DB_PASSWORD
        echo
    fi
    export PGPASSWORD="$DB_PASSWORD"
}

# 測試連線
test_connection() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${RED}❌ 無法連接到資料庫${NC}"
        exit 1
    fi
}

# 部署資料庫
deploy_database() {
    echo -e "${BLUE}🚀 部署資料庫...${NC}"
    "$SCRIPT_DIR/deploy.sh"
}

# 備份資料庫
backup_database() {
    echo -e "${BLUE}💾 備份資料庫...${NC}"
    setup_connection
    test_connection
    
    backup_file="geoport_backup_$(date +%Y%m%d_%H%M%S).sql"
    backup_path="$SCRIPT_DIR/backups/$backup_file"
    
    # 創建備份目錄
    mkdir -p "$SCRIPT_DIR/backups"
    
    echo -e "${BLUE}📦 創建備份檔案: $backup_file${NC}"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --no-owner --no-privileges \
        --file="$backup_path"
    
    echo -e "${GREEN}✅ 備份完成: $backup_path${NC}"
    
    # 壓縮備份檔案
    echo -e "${BLUE}🗜️  壓縮備份檔案...${NC}"
    gzip "$backup_path"
    echo -e "${GREEN}✅ 備份已壓縮: ${backup_path}.gz${NC}"
}

# 還原資料庫
restore_database() {
    echo -e "${BLUE}🔄 還原資料庫...${NC}"
    setup_connection
    
    # 列出可用的備份檔案
    backup_dir="$SCRIPT_DIR/backups"
    if [ ! -d "$backup_dir" ] || [ -z "$(ls -A "$backup_dir" 2>/dev/null)" ]; then
        echo -e "${RED}❌ 找不到備份檔案${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📋 可用的備份檔案:${NC}"
    ls -la "$backup_dir"/*.sql.gz 2>/dev/null | nl
    
    read -p "請選擇要還原的備份檔案編號: " backup_choice
    
    backup_file=$(ls "$backup_dir"/*.sql.gz | sed -n "${backup_choice}p")
    if [ -z "$backup_file" ]; then
        echo -e "${RED}❌ 無效的選擇${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  這將覆蓋現有資料庫！${NC}"
    read -p "確定要還原嗎？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ 取消還原${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}🔄 還原備份檔案: $(basename "$backup_file")${NC}"
    
    # 解壓縮並還原
    gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    
    echo -e "${GREEN}✅ 還原完成${NC}"
}

# 重置資料庫
reset_database() {
    echo -e "${RED}⚠️  這將刪除所有資料！${NC}"
    read -p "確定要重置資料庫嗎？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ 取消重置${NC}"
        exit 0
    fi
    
    setup_connection
    
    echo -e "${BLUE}🗑️  重置資料庫...${NC}"
    
    # 刪除所有表
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO $DB_USER;
    GRANT ALL ON SCHEMA public TO public;
    "
    
    echo -e "${GREEN}✅ 資料庫已重置${NC}"
    
    # 重新部署
    deploy_database
}

# 顯示資料庫狀態
show_status() {
    echo -e "${BLUE}📊 資料庫狀態${NC}"
    setup_connection
    test_connection
    
    echo -e "${BLUE}🔗 連線資訊:${NC}"
    echo "  主機: $DB_HOST:$DB_PORT"
    echo "  資料庫: $DB_NAME"
    echo "  用戶: $DB_USER"
    
    echo -e "${BLUE}📋 表結構:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
    "
    
    echo -e "${BLUE}👁️  視圖:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        viewname,
        viewowner
    FROM pg_views 
    WHERE schemaname = 'public' 
    ORDER BY viewname;
    "
}

# 顯示統計資訊
show_stats() {
    echo -e "${BLUE}📈 資料庫統計資訊${NC}"
    setup_connection
    test_connection
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    -- 基本統計
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
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    UNION ALL
    SELECT 
        'Indexes' as type,
        COUNT(*) as count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    "
    
    echo -e "${BLUE}📊 資料統計:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
    FROM pg_stat_user_tables 
    ORDER BY n_live_tup DESC;
    "
}

# 檢查資料完整性
check_integrity() {
    echo -e "${BLUE}🔍 檢查資料完整性...${NC}"
    setup_connection
    test_connection
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT * FROM check_data_integrity();
    "
}

# 修復統計資訊
repair_stats() {
    echo -e "${BLUE}🔧 修復統計資訊...${NC}"
    setup_connection
    test_connection
    
    result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT repair_project_statistics();")
    echo -e "${GREEN}✅ 修復了 $result 個專案的統計資訊${NC}"
}

# 清理過期資料
cleanup_data() {
    echo -e "${BLUE}🧹 清理過期資料...${NC}"
    setup_connection
    test_connection
    
    # 清理過期會話
    result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT cleanup_old_sessions();")
    echo -e "${GREEN}✅ 清理了 $result 個過期會話${NC}"
    
    # 更新統計資訊
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT update_table_statistics();"
    echo -e "${GREEN}✅ 統計資訊已更新${NC}"
}

# 開啟資料庫 shell
open_shell() {
    echo -e "${BLUE}🐚 開啟資料庫 shell...${NC}"
    setup_connection
    test_connection
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
}

# 主函數
main() {
    case "${1:-help}" in
        deploy)
            deploy_database
            ;;
        backup)
            backup_database
            ;;
        restore)
            restore_database
            ;;
        reset)
            reset_database
            ;;
        status)
            show_status
            ;;
        stats)
            show_stats
            ;;
        integrity)
            check_integrity
            ;;
        repair)
            repair_stats
            ;;
        cleanup)
            cleanup_data
            ;;
        shell)
            open_shell
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@"

# 清理環境變數
unset PGPASSWORD
