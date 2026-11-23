#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "${TITILER_PYTHON:-}" ]; then
    TITILER_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
    if [ ! -x "$TITILER_PYTHON" ]; then
        TITILER_PYTHON=python3
    fi
fi

# TiTiler 服務器啟動腳本

echo "🚀 啟動 TiTiler COG 服務器..."

# 檢查 Python 環境
if ! command -v "$TITILER_PYTHON" &> /dev/null; then
    echo "❌ 錯誤: 找不到 python3"
    exit 1
fi

# 檢查 TiTiler 是否已安裝
if ! "$TITILER_PYTHON" -c "from titiler.application.main import app; import uvicorn" &> /dev/null; then
    echo "❌ 錯誤: TiTiler 未安裝"
    echo "請運行: python3.11 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements-titiler.txt"
    exit 1
fi

if [ "${1:-}" = "--test" ]; then
    exec "$TITILER_PYTHON" -m unittest discover -s "$SCRIPT_DIR/tests" -p test_titiler_runtime.py
fi

# 檢查 GDAL 是否已安裝
if ! command -v gdal_translate &> /dev/null; then
    echo "⚠️  警告: 找不到 gdal_translate 命令"
    echo "請確保已安裝 GDAL"
fi

# 設置環境變量
export PYTHONPATH="${PYTHONPATH:-}:$SCRIPT_DIR"

# 啟動 TiTiler 服務器
echo "📍 服務器地址: http://localhost:8080"
echo "📚 API 文檔: http://localhost:8080/docs"
echo "🔍 健康檢查: http://localhost:8080/healthz"
echo ""
echo "按 Ctrl+C 停止服務器"
echo ""

exec "$TITILER_PYTHON" "$SCRIPT_DIR/titiler_server.py"
