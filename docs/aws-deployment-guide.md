# GeoPort AWS 上雲操作指南

本文針對目前這個階段的 GeoPort 專案，說明如何先穩定部署到 AWS，並保留後續升級到正式雲端架構的路線。

目前專案已具備：

- Docker Compose `prod` / `dev` profiles
- 單一公開入口 Nginx
- Backend `/api/health` 與 `/api/health/deep`
- PostgreSQL
- TiTiler COG 服務
- 可抽換 storage 設定，但目前實作仍以 local filesystem 為主
- JSON/pretty logger，可接 CloudWatch 類型的 log 收集

## 建議部署路線

### 這個階段先用 EC2 + Docker Compose

這是目前最順的方案：

- 不需要立刻拆成 ECS task definitions
- 可以直接使用現有 `docker-compose.yml`
- `uploads` 與 `data` 先掛在 EC2 磁碟或 EBS volume
- Nginx 對外只開 80/443，backend、Postgres、TiTiler 不公開
- 適合 MVP、內部試用、單機正式測試

限制：

- 不適合直接水平擴充多台 EC2，因為 `uploads/data` 目前還是本機儲存
- EC2 故障時需要從 EBS snapshot 或備份還原
- SSL、備份、監控要自己補齊

### 正式長期架構再升級 ECS / RDS / EFS 或 S3

等系統穩定後再做：

- Backend / frontend / TiTiler 拆成 ECS services
- PostgreSQL 改用 Amazon RDS for PostgreSQL
- `uploads/data` 改 EFS 或 S3 storage adapter
- HTTPS 由 ALB + ACM certificate 處理
- Logs 送 CloudWatch Logs

官方參考：

- AWS ECS: <https://docs.aws.amazon.com/ecs/>
- Elastic Beanstalk Docker Compose QuickStart: <https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/docker-compose-quickstart.html>
- RDS for PostgreSQL: <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html>
- ACM certificate: <https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html>
- Docker Compose plugin: <https://docs.docker.com/compose/install/linux/>

## 一、AWS 資源準備

### 1. EC2

建議規格：

- AMI: Ubuntu Server LTS 或 Amazon Linux 2023
- Instance: `t3.medium` 起跳；TIF/COG 處理較多時用 `t3.large`
- Disk: gp3 50GB 起跳，實際依上傳資料量調整
- Region: 建議東京 `ap-northeast-1` 或新加坡 `ap-southeast-1`

Security Group：

| Port | Source | 用途 |
| --- | --- | --- |
| 22 | 你的固定 IP | SSH |
| 80 | 0.0.0.0/0 | HTTP |
| 443 | 0.0.0.0/0 | HTTPS |

不要公開：

- `3001` backend
- `5432` PostgreSQL
- `8000` TiTiler
- `5173` frontend container

### 2. Domain

先準備一個網域，例如：

```text
geoport.example.com
```

DNS A record 指向 EC2 public IP。

### 3. SSL

快速方案可用 EC2 上的 Nginx + Certbot。

正式 AWS 方案建議用：

- Application Load Balancer
- AWS Certificate Manager
- Route 53 DNS validation

如果先用單機 Compose，Certbot 會最快。

## 二、EC2 安裝 Docker

Ubuntu 範例：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
```

依 Docker 官方文件安裝 Docker Engine 與 Compose plugin：

```bash
docker --version
docker compose version
```

把目前使用者加入 docker group：

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## 三、部署程式碼

在 EC2 上：

```bash
cd /opt
sudo git clone <your-repo-url> geoport
sudo chown -R $USER:$USER /opt/geoport
cd /opt/geoport
```

如果還沒推到遠端 Git，也可以先用 `scp` 或壓縮檔上傳，但正式流程建議走 Git。

## 四、建立 production `.env`

在專案根目錄建立 `.env`：

```bash
cp .env.example .env  # 如果根目錄有範例檔
touch .env            # 沒有就直接建立
```

建議內容：

```env
NODE_ENV=production
HTTP_PORT=80

DB_NAME=geoport
DB_USER=geoport_user
DB_PASSWORD=<請換成強密碼>
DB_SSL=false

JWT_SECRET=<請換成 32 bytes 以上隨機字串>
JWT_EXPIRES_IN=24h

FRONTEND_URL=https://geoport.example.com
ALLOWED_ORIGINS=https://geoport.example.com
TRUST_PROXY=1

STORAGE_PROVIDER=local
UPLOADS_ROOT=/app/uploads
DATA_ROOT=/app/data
UPLOADS_PUBLIC_PATH=/uploads
DATA_PUBLIC_PATH=/data

TITILER_INTERNAL_URL=http://titiler:8000

LOG_LEVEL=info
LOG_FORMAT=json
LOG_REQUESTS=true
SERVICE_NAME=geoport-backend
```

產生 JWT secret：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

注意：

- `.env` 不要 commit
- `JWT_SECRET` 不可用預設值
- `DB_PASSWORD` 不可用 `password` 或範例密碼

## 五、建立資料目錄與權限

目前 compose 會把資料掛在：

```text
./backend/uploads -> /app/uploads
./data            -> /app/data
```

後端以容器 `node` 使用者（UID/GID `1000:1000`）執行。請在專案根目錄、啟動服務前執行：

```bash
sudo ./scripts/prepare-storage.sh
```

腳本只建立缺少的目錄，設定擁有者為 `1000:1000`、權限 `755`。既有目錄及內容完全不改動；顯示 `Unchanged` 不代表權限正確。不要使用 `777` 或對既有資料遞迴改權限。

建置後，以後端實際的容器使用者測試兩個掛載目錄（不啟動資料庫或其他相依服務）：

```bash
docker compose --profile prod build backend
docker compose --profile prod run --rm --no-deps backend node -e 'const fs = require("fs"); for (const dir of ["/app/uploads", "/app/data"]) { const p = dir + "/.write-check-" + process.pid; fs.writeFileSync(p, "", { flag: "wx" }); fs.unlinkSync(p); console.log("Writable: " + dir); }'
```

若既有目錄驗證失敗，先備份並確認擁有者需求，由部署操作人員選擇處理。若目錄應由容器專用，可只調整兩個目錄本身（不遞迴）：

```bash
sudo chown 1000:1000 backend/uploads data
sudo chmod 755 backend/uploads data
```

若需保留既有擁有者，Linux 可改為授予 UID `1000` ACL：

```bash
sudo setfacl -m u:1000:rwx -m d:u:1000:rwx backend/uploads data
```

以上指令不處理既有子目錄或檔案；如應用程式須寫入既有子目錄，請操作人員逐一檢查並針對必要路徑授權，再重跑寫入驗證。Docker 未啟動時無法執行容器驗證，不應視為權限已通過。

如果資料會很大，建議把這兩個目錄放到獨立 EBS volume，再 bind mount 回專案。

## 六、啟動 production stack

```bash
docker compose --profile prod build
docker compose --profile prod up -d
```

確認服務：

```bash
docker compose ps
docker compose logs -f nginx
docker compose logs -f backend
```

應該只看到 Nginx 對外開 port 80。

## 七、初始化與 migration

如果是全新資料庫，確認 migration 狀態：

```bash
curl -fsS http://localhost/api/health/deep
```

如果 deep health 顯示 migration pending，到 backend container 執行：

```bash
docker compose exec backend sh
cd database
./deploy.sh
```

或在 host 執行專案既有的 migration 流程，視 `backend/database/deploy.sh` 實際需要的環境變數而定。

`init.sql` 只建立擴充、型別與共用函數，不會建立完整業務資料表；即使 Docker 已執行初始化，仍須執行 migration。詢問是否重新建立既有資料庫時選 **N**，升級前先備份，勿刪除 volume。

搜尋設定缺少 `chinese` 時，初始化會使用 PostgreSQL 內建 `simple` 作為相容設定，不提供中文斷詞；既有自訂設定會保留。全新部署不再插入 `021`、`022` 的虛構災點或不存在的影像，既有紀錄不刪除。

本版修正了早期 `001`、`005`、`021`、`022` 的重放內容。已記錄舊版本的資料庫可能出現 checksum 差異；一般部署腳本不會重跑這些版本或改寫舊 checksum。`042` 提供缺少索引的前向修復；僅限已知舊雜湊的升級，可使用 `database/reconcile_legacy_migrations.js`，但必須先驗證備份還原、獨立全新結構與業務資料指紋，再於同一交易套用並留下稽核紀錄。未知差異或資料變更會回滾，不可只修改版本紀錄來消除警告。`014a` 會略過已正確的統計，避免觸發既有專案更新時間。詳見 [Database Notes](cloud-deployment.md#database-notes)。

建立 admin（以下使用 Bash）：腳本沒有預設密碼，只接受 `ADMIN_PASSWORD` 或 `ADMIN_PASSWORD_FILE`，不可同時設定兩個非空來源，也不可將密碼放在 CLI 參數。Production 密碼至少 12 個字元、最多 72 UTF-8 bytes，且不可使用預設或範例密碼。

透過隱藏輸入取得密碼，再以 stdin 傳給 container；不要開啟 shell tracing，也不要將密碼直接寫在命令、日誌或 git 檔案內：

```bash
set +x
IFS= read -r -s -p 'Admin password: ' ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | docker compose exec -T backend sh -c '
  unset ADMIN_PASSWORD_FILE
  ADMIN_PASSWORD="$(cat)"
  export ADMIN_PASSWORD
  exec node database/seed_admin.js
'
status=$?
unset ADMIN_PASSWORD
test "$status" -eq 0
```

若要重設 admin 密碼，重新隱藏輸入新密碼並加上 `--reset`（未加此選項時，已存在帳號只會略過，不會覆寫）：

```bash
set +x
IFS= read -r -s -p 'New admin password: ' ADMIN_PASSWORD
printf '\n'
printf '%s' "$ADMIN_PASSWORD" | docker compose exec -T backend sh -c '
  unset ADMIN_PASSWORD_FILE
  ADMIN_PASSWORD="$(cat)"
  export ADMIN_PASSWORD
  exec node database/seed_admin.js --reset
'
status=$?
unset ADMIN_PASSWORD
test "$status" -eq 0
```

若已由部署平台將 secret file 以唯讀方式掛載至 backend container（例如 `/run/secrets/geoport_admin_password`），可使用以下替代方式；檔案只能讓執行帳號讀取，內容為密碼，可有一個結尾換行，不可提交至 git：

```bash
docker compose exec -e ADMIN_PASSWORD_FILE=/run/secrets/geoport_admin_password backend sh -c '
  unset ADMIN_PASSWORD
  exec node database/seed_admin.js
'
# 重設時將最後一行改成：exec node database/seed_admin.js --reset
```

本機開發也必須明確提供密碼：可在未追蹤的 `backend/.env` 設定其中一個來源，或用上述隱藏輸入方式取得 `ADMIN_PASSWORD` 後 `export ADMIN_PASSWORD`，執行 `node backend/database/seed_admin.js`（需要時加 `--reset`），最後 `unset ADMIN_PASSWORD`。帳號與 email 仍可透過前兩個位置參數指定，預設為 `admin`、`admin@geoport.local`。腳本不輸出密碼或雜湊；設定錯誤、資料庫操作或連線清理失敗均以非零狀態退出。

## 八、Smoke Test

本機測：

```bash
curl -fsS http://localhost/api/health
curl -fsS http://localhost/api/health/deep
curl -fsS http://localhost/titiler/healthz
curl -I http://localhost/
```

網域測：

```bash
curl -fsS https://geoport.example.com/api/health
curl -fsS https://geoport.example.com/api/health/deep
curl -fsS https://geoport.example.com/titiler/healthz
curl -I https://geoport.example.com/
```

預期：

- `/api/health` 回 `status: "OK"`
- `/api/health/deep` 回 `status: "ok"` 或 `warning`
- `/titiler/healthz` 有 TiTiler 版本資訊
- `/` 回前端頁面

## 九、HTTPS 快速設定

如果使用 EC2 內 Nginx + Certbot，會和 compose 內 Nginx port 80 衝突。建議二選一：

### 方案 A：AWS ALB + ACM

正式推薦：

1. 建立 ACM public certificate
2. 用 DNS validation 驗證網域
3. 建立 ALB
4. ALB 443 listener 掛 ACM certificate
5. ALB target group 指向 EC2 port 80
6. Route 53 A/AAAA alias 指向 ALB

此方案不需要在 EC2 內管理 TLS 憑證。

### 方案 B：EC2 Host Nginx + Certbot

如果要用 Certbot：

1. compose 的 nginx 改只綁 `127.0.0.1:8080`
2. host Nginx 監聽 80/443
3. host Nginx reverse proxy 到 `http://127.0.0.1:8080`
4. Certbot 管理憑證

根目錄 `.env`：

```env
HTTP_PORT=127.0.0.1:8080
```

但目前 `docker-compose.yml` 的 `HTTP_PORT` 是簡單 port 映射，若 Docker Compose 不接受這個格式，就要把 `nginx.ports` 改成：

```yaml
ports:
  - "127.0.0.1:8080:80"
```

## 十、備份

依 [維運交接](operations-runbook.md) 執行完整備份與還原：停止寫入，保存同一時點的 DB、uploads 與 data，校驗後複製至異地。EBS snapshot 或 S3 同步不能替代完整校驗與隔離還原演練。

## 十一、維運指令

查看狀態：

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f titiler
```

重新部署：

```bash
git pull
docker compose --profile prod build
docker compose --profile prod up -d
docker compose ps
```

只重啟 backend：

```bash
docker compose restart backend
```

清理舊 image：

```bash
docker image prune -f
```

## 十二、上線前檢查清單

- [ ] `.env` 已設定 production 值
- [ ] `JWT_SECRET` 是強隨機字串
- [ ] Public registration is unavailable; only an authenticated admin creates login accounts.
- [ ] `ALLOWED_ORIGINS` 只包含正式網域
- [ ] Security Group 沒有公開 3001、5432、8000、5173
- [ ] `/api/health` 正常
- [ ] `/api/health/deep` 沒有 migration error
- [ ] admin 帳號可登入
- [ ] 可建立專案
- [ ] 可上傳 GeoJSON/KML/TIF
- [ ] TIF/COG 在地圖可載入
- [ ] Console 沒有大量錯誤
- [ ] Backend log 是 JSON 格式
- [ ] 有 DB 備份策略
- [ ] 有 uploads/data 備份策略

## 十三、什麼時候要升級正式 AWS 架構

出現以下情況就該升級：

- 同時使用者增加，需要水平擴充
- 上傳檔案量變大，EC2 磁碟備份開始麻煩
- 需要高可用，不能接受單台 EC2 故障
- 需要正式監控、告警、部署回滾
- 需要分 staging / production

建議升級目標：

```text
Route 53
  -> ALB + ACM HTTPS
    -> ECS frontend service
    -> ECS backend service
    -> ECS TiTiler service
Backend
  -> RDS PostgreSQL
  -> EFS or S3 for uploads/data
  -> CloudWatch Logs
```

升級前要先完成：

- `STORAGE_PROVIDER=s3` adapter 或 EFS mount 設計
- migration command 正式化
- CI/CD build and deploy pipeline
- secrets 移到 AWS Secrets Manager 或 SSM Parameter Store
- staging 環境
