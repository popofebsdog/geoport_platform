# 資料夾結構說明

## 專案資料夾結構

```
data/
├── projects/          # 專案基本資料
├── uploads/           # 上傳檔案分類存放
│   ├── inSAR/         # InSAR 資料
│   ├── numerical-simulation/  # 數值模擬資料
│   ├── orthophoto/    # 正射影像
│   ├── uav-lidar/     # UAV/光達判釋資料
│   └── shapefile/     # Shapefile 向量資料
├── temp/              # 暫存檔案
└── reports/           # 分析報告
```

## 各資料夾用途說明

### projects/
存放專案基本資訊檔案（JSON格式）
- 專案設定
- 座標資料
- 專案元資料

### uploads/
分類存放各種類型的上傳檔案
- **inSAR/**: 干涉雷達資料檔案
- **numerical-simulation/**: 數值模擬結果檔案
- **orthophoto/**: 正射影像檔案
- **uav-lidar/**: UAV無人機與光達判釋資料
- **shapefile/**: Shapefile 向量資料檔案 (.shp, .shx, .dbf, .prj)

### temp/
暫存檔案處理區域
- 檔案上傳處理暫存
- 資料轉換暫存
- 系統暫存檔案

### reports/
分析報告與輸出檔案
- 專案分析報告
- 資料處理結果
- 輸出報表

## 檔案命名規則

- 專案檔案：`project_[專案ID].json`
- 上傳檔案：`[專案ID]_[資料類型]_[時間戳]_[原檔名]`
- 報告檔案：`report_[專案ID]_[日期].pdf`

## 權限設定

- 所有資料夾預設為讀寫權限
- 建議定期清理temp資料夾
- 重要資料建議定期備份 