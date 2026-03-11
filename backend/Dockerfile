# 使用 Node.js 18 Alpine 作為基礎鏡像
FROM node:18-alpine

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製源代碼
COPY . .

# 創建必要的目錄
RUN mkdir -p uploads/projects uploads/reports uploads/data \
    uploads/warning-regions uploads/temporal uploads/features \
    uploads/data/disaster-points uploads/data/geojson uploads/data/kml \
    uploads/data/basemaps uploads/data/others uploads/data/snapshots/geojson

# 設置權限
RUN chown -R node:node /app
USER node

# 暴露端口
EXPOSE 3001

# 健康檢查 - 使用 /ready 端點檢查 DB 連接
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/api/health/ready || exit 1

# 啟動應用
CMD ["npm", "start"]
