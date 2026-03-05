#!/bin/bash

# TiTiler 服務器啟動腳本

echo "🚀 啟動 TiTiler COG 服務器..."

# 檢查 Python 環境
if ! command -v python3 &> /dev/null; then
    echo "❌ 錯誤: 找不到 python3"
    exit 1
fi

# 檢查 TiTiler 是否已安裝
if ! python3 -c "import titiler" &> /dev/null; then
    echo "❌ 錯誤: TiTiler 未安裝"
    echo "請運行: pip install 'titiler[all]'"
    exit 1
fi

# 檢查 GDAL 是否已安裝
if ! command -v gdal_translate &> /dev/null; then
    echo "⚠️  警告: 找不到 gdal_translate 命令"
    echo "請確保已安裝 GDAL"
fi

# 設置環境變量
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# 啟動 TiTiler 服務器
echo "📍 服務器地址: http://localhost:8000"
echo "📚 API 文檔: http://localhost:8000/docs"
echo "🔍 健康檢查: http://localhost:8000/health"
echo ""
echo "按 Ctrl+C 停止服務器"
echo ""

python3 titiler_server.py
