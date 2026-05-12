# 使用 Debian slim，避免 canvas / chartjs native dependencies 在 Alpine musl 上編譯失敗
FROM node:18-bookworm-slim

# 設置工作目錄
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    postgresql-client \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --omit=dev

# 複製源代碼
COPY . .

# 創建必要的目錄
RUN mkdir -p uploads/projects uploads/reports uploads/data

# 設置權限
RUN chown -R node:node /app
USER node

# 暴露端口
EXPOSE 3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 啟動應用
CMD ["npm", "start"]
