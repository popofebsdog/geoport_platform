# 構建階段
FROM node:18-alpine as build

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_STATIC_URL=
ARG VITE_TITILER_URL=/titiler
ARG VITE_LOG_LEVEL=warn

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STATIC_URL=$VITE_STATIC_URL
ENV VITE_TITILER_URL=$VITE_TITILER_URL
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 生產階段
FROM nginx:alpine

# 複製構建結果到 nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 5173

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
