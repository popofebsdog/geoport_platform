#!/bin/bash

echo "🚀 啟動 GeoPort 災情資料搜集系統"
echo "=================================="

# 檢查 Node.js 版本
echo "📋 檢查環境..."
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js 版本: $node_version"
else
    echo "❌ 未找到 Node.js，請先安裝 Node.js 18+"
    exit 1
fi

# 檢查是否已安裝依賴
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "📦 安裝依賴..."
    npm run install:all
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
    echo "✅ 依賴安裝完成"
fi

# 檢查環境變數文件
if [ ! -f "backend/.env" ]; then
    echo "⚙️  設置後端環境變數..."
    cp backend/env.example backend/.env
    echo "✅ 後端環境變數已創建，請根據需要修改 backend/.env"
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚙️  設置前端環境變數..."
    cp frontend/env.example frontend/.env
    echo "✅ 前端環境變數已創建，請根據需要修改 frontend/.env"
fi

echo ""
echo "🎯 選擇啟動模式："
echo "1) 開發模式 (前後端同時啟動)"
echo "2) 僅啟動後端"
echo "3) 僅啟動前端"
echo "4) Docker 模式"
echo "5) 退出"
echo ""

read -p "請選擇 (1-5): " choice

case $choice in
    1)
        echo "🚀 啟動開發模式..."
        npm run dev
        ;;
    2)
        echo "🚀 啟動後端服務器..."
        npm run dev:backend
        ;;
    3)
        echo "🚀 啟動前端服務器..."
        npm run dev:frontend
        ;;
    4)
        echo "🐳 啟動 Docker 模式..."
        npm run docker:build
        npm run docker:up
        echo "✅ 服務已啟動，訪問 http://localhost"
        ;;
    5)
        echo "👋 再見！"
        exit 0
        ;;
    *)
        echo "❌ 無效選擇"
        exit 1
        ;;
esac
