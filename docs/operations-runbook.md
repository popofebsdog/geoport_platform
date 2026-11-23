# GeoPort 維運交接

部署後以本文件為操作入口。先在獨立空白資料庫、獨立 uploads/data 路徑演練，不要對正式資料試跑。禁止執行 `docker compose down -v`。

## 發布與回退

使用 Node 20.19.x 或 22.12–24.x，建議 `.nvmrc` 的 Node 22。正式環境目前使用單一 backend 實例。

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
npm test
VITE_API_URL=/api VITE_STATIC_URL= VITE_TITILER_URL=/titiler \
  VITE_TITILER_ASSET_ORIGIN=http://backend:3001 npm run build
npm run release:package
```

`releases/` 不可覆寫壓縮檔包含目前來源（含未追蹤新檔）及前端建置。`release-manifest.json` 記錄逐檔 SHA256、發布識別及來源 commit；未提交修改以逐檔雜湊為準，commit 不代表完整發布內容。封裝不會自動執行測試，須先完成檢查。

不包含 `.env`、私鑰、資料、依賴或備份。憑證與設定另用加密管道交接。正式部署另保存已驗收的容器映像、image digest、操作者與部署時間；來源封裝不等同離線映像。

升級前禁止寫入、完整備份，再執行 migration。不得藉由刪除 volume 或修改 checksum 消除錯誤。回退須匹配程式映像、資料庫與檔案時點，先還原至新環境再切換；不能只退程式而假設 schema 相容。保留原環境。

## 就緒與監控

`/api/health` 僅代表程序存活。負載平衡器使用 `/api/ready`：資料庫、migration、TiTiler、儲存全部正常才回傳 200，否則 503，不含內部錯誤細節。詳細健康狀態由管理員查閱。

```bash
HEALTHCHECK_URL=https://your-host/api/ready npm run ops:check
```

失敗傳回非零狀態。可於執行環境設定 `ALERT_WEBHOOK_URL`（HTTPS），只傳元件狀態摘要；須實測收件。`BACKUP_ROOT` 與 `BACKUP_MAX_AGE_HOURS=26` 可另外檢查本機完整備份與新鮮度，不代表異地保存成功。

由維運人員設定健康檢查、夜間備份及失敗通知，另監控主機磁碟容量、TLS 憑證到期與異地備份。**本次未啟用外部排程或真實通知**。同機探測無法偵測整台主機離線，必須有異地探測。

## 完整備份

先將反向代理切換維護模式，停止所有寫入來源及 backend。`BACKUP_WRITES_QUIESCED=true` 僅為操作者確認，不會自動停止服務。以下臨時容器使用相同設定讀取停止服務的檔案：

```bash
docker compose --profile prod stop backend
docker compose --profile prod run --rm --no-deps \
  -e BACKUP_WRITES_QUIESCED=true backend bash scripts/backup-bundle.sh
```

成功輸出 `/app/backups/geoport_bundle_...`，包含 `database.sql.gz`、`uploads.tar.gz`、`data.tar.gz` 及 SHA256 清單。三個來源均成功且校驗通過才發布，失敗不得繼續升級。

```bash
docker compose --profile prod run --rm --no-deps backend \
  node scripts/verify-backup.js /app/backups/geoport_bundle_SELECTED
docker compose --profile prod start backend
```

確認 `/api/ready` 才開放流量。named volume 不能防主機故障；從掛載該 volume 的容器以 `docker cp` 匯出整組備份，複製至加密、有版本保留與獨立權限的異地儲存，再驗證 SHA256。備份含個資與帳號雜湊，禁止放入 Git、靜態網站或公開 bucket。

## 還原演練

1. 保留故障環境並停止寫入，選定整組備份與相符程式版本，確認可信來源及 SHA256。
2. 建立獨立空白 PostgreSQL/PostGIS 資料庫與兩個空白目錄。主版本須相容，匯入帳號須有建立擴充套件權限。
3. 在 shell 設定指向新目標的 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`；腳本不會自動讀 `.env`。選取 SQL 前再次確認目標。

```bash
node backend/scripts/verify-backup.js /secure/geoport_bundle_SELECTED
BACKUP_ROOT=/secure/geoport_bundle_SELECTED bash backend/database/manage.sh restore
mkdir /restore/uploads /restore/data
tar -xzf /secure/geoport_bundle_SELECTED/uploads.tar.gz -C /restore/uploads
tar -xzf /secure/geoport_bundle_SELECTED/data.tar.gz -C /restore/data
```

SQL 先完整解壓至權限受限的暫存目錄，再以 `psql -X -v ON_ERROR_STOP=1 --single-transaction -f` 匯入；解壓失敗不匯入，SQL 失敗回滾。預留暫存及 DB 空間；僅支援此工具產出的 plain SQL dump，不可混入自行提交交易的 SQL。

4. 新 backend 使用還原後的 `UPLOADS_ROOT`、`DATA_ROOT`，確認容器 UID 1000 權限；不得混合不同時點檔案。
5. 啟動相符程式，檢查 `/api/ready`、migration、帳號權限、專案數、附件下載、地圖與 TiTiler 真實讀檔。
6. 記錄時間、筆數及抽查，由負責人核准切換。失敗時維持維護模式並保留證據。

## 紀錄與存取

前端應用不輸出 console，正式建置亦移除依賴內 console/debugger，沒有全域遮蔽原生錯誤。瀏覽器自身或網路失敗訊息仍可能出現，應修正原因。

backend 使用 `LOG_FORMAT=json`、`LOG_LEVEL=info`、`LOG_REQUESTS=true`，記錄 request ID、方法、路徑、狀態、耗時、已驗證使用者，以及登入失敗、權限拒絕、帳號修改與錯誤 stack/cause。遮罩密碼、token、敏感欄位與 URL query，不記錄 request body 或 authorization header，不可列印 `.env`。

Compose 每服務 local driver 上限為 10 MB × 5 份，不是長期稽核保存；須另接受控異地紀錄系統並設定保留期限與存取權限。

`TRUST_PROXY=1` 適用只有 Nginx 的固定路徑；ALB → Nginx → backend 若無較短路徑，可設 2 或明確可信網段。backend 不得公網直連，禁止無限制信任 `true`。登入預設每來源 15 分鐘最多 10 次失敗，成功不累計。MemoryStore 重啟重置，多實例前須改用共用限流儲存。

## 驗收責任與風險

指定部署、備份、告警及資安負責人，核准 RPO/RTO；例如 RPO 24 小時、RTO 4 小時僅是待核准目標，不是保證。每月隔離還原並量測耗時，另完成公網 TLS/DNS、異地備份、通知送達、磁碟與憑證監控及 production 權限驗收。

2026-11-22 依賴檢查：根目錄 0、後端 3 項中風險、前端 15 項（2 高、8 中、5 低）。georaster 的舊 Webpack/worker-loader 建置依賴帶入 decoder 等通告，Vite 模組圖測試確認相關建置工具不進入瀏覽器輸出；後端 Sequelize、ExcelJS 與直接使用的 uuid 通告涉及未使用的 v3/v5/v6 buffer API，目前使用 v4。未強制破壞相容性的升級，這不是零漏洞聲明。每次發布重跑三份 `npm audit`，保存結果並驗證相容替代方案。
