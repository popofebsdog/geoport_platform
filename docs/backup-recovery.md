# PostgreSQL 備份與還原

整組備份、發布、還原驗收及異地保存，統一依照 [維運交接](operations-runbook.md)。以下保留單獨資料庫工具契約。

## 儲存位置

`backend/database/manage.sh` 的 `backup` 與 `restore` 共用 `BACKUP_ROOT`：

- 設定 `BACKUP_ROOT` 時優先採用該路徑，建議使用絕對路徑。
- `NODE_ENV=production` 且未設定時，預設 `/app/backups`。
- 其他環境未設定時，預設專案根目錄的 `backups/`，不受執行時工作目錄影響。

舊的 `backend/database/backups/` 不會自動搬移、刪除或合併。讀取舊備份時，
請明確將 `BACKUP_ROOT` 指向舊目錄。所有既有資料庫與備份資料保持不變。

## Production 容器契約

由主部署設定在 production backend 服務加入：

```yaml
environment:
  - BACKUP_ROOT=/app/backups
volumes:
  - backups:/app/backups
```

並在 Compose 最上層 `volumes` 宣告 `backups:`。這是獨立的 named volume，
不變更既有 `postgres_data` volume。Dockerfile 必須先建立 `/app/backups`，
並在切換至 `USER node` 前將該目錄交由 `node:node`（UID/GID 1000）擁有；
新的空 volume 首次掛載會保留映像目錄的擁有權。不要使用 `volume-nocopy`。
既有非空 volume 不會因此自動修正權限，需先確認容器使用者可寫。

重建／替換 backend 容器不會移除 named volume。
**不要執行 `docker compose down -v` 或刪除備份 volume**，那會刪除持久化資料。
volume 的實際名稱通常帶有 Compose project 前綴，切換 project 名稱會使用不同 volume。

## 手動備份

使用 backend 已設定的資料庫連線環境：

```bash
docker compose --profile prod exec backend bash database/manage.sh backup
```

本機請先在目前 shell 設定 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、
`DB_PASSWORD`（腳本不會自動載入 `.env`），再執行：

```bash
BACKUP_ROOT="$PWD/backups" bash backend/database/manage.sh backup
```

備份先寫入隱藏暫存目錄，只有 `pg_dump` 與 `gzip` 全部成功後才發布
`geoport_backup_<時間>.<隨機值>.sql.gz` 並顯示完成。失敗會以非零狀態退出，
只清除這次建立的暫存目錄，不修改既有備份；同秒執行也不覆寫。
備份目錄預設只允許建立者存取，新備份檔案不開放其他使用者讀取。
強制斷電或 SIGKILL 可能留下隱藏暫存目錄，但它不會列為可還原備份。

備份不含上傳檔案、地圖資料或部署設定。named volume 只提供容器重建後的持久化，
不是異地主機備援；請依既有維運流程保存獨立副本並驗證還原。本次不新增排程或保留策略。
Git 與 backend Docker build 排除 `backups/`、隱藏備份暫存目錄及 `geoport_backup_*` 檔案；
自訂其他備份檔名／目錄若放在專案內，需另外確認排除規則。

## 手動還原

還原包含 `--clean` dump 內容，會覆蓋資料；先停止應用寫入並保留目前資料的備份，
確認目標連線與選取的備份正確，再操作：

```bash
docker compose --profile prod exec backend bash database/manage.sh restore
```

本機使用與備份相同的 `BACKUP_ROOT` 執行 `restore`。選擇編號後須再次確認。
只有該目錄中的 `.sql.gz` 檔案會列入選單，未完成的隱藏暫存目錄不會列入。
還原先完整解壓至權限受限的暫存目錄，再以
`psql -X -v ON_ERROR_STOP=1 --single-transaction -f` 匯入。
解壓失敗不匯入，SQL 失敗回滾，非零退出且不顯示成功。
須預留暫存空間；僅支援此工具的 dump，不可混用含自行提交交易的 SQL。

部署測試若建立自己的備份 fixture，應明確傳入對應的 `BACKUP_ROOT`，
不要再假設 `manage.sh` 同目錄下的 `backups/` 是預設位置。
