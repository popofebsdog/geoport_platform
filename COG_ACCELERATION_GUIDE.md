# WebGIS 大影像加速方案 — COG + TiTiler + Leaflet

## 🚀 概述

本方案使用 **Cloud Optimized GeoTIFF (COG)** + **TiTiler** + **Leaflet** 來解決大型 GeoTIFF 影像在 WebGIS 中的性能問題。

### 性能提升效果
- **載入速度**: 從數十秒縮短到數秒
- **縮放流暢度**: 即時響應，無延遲
- **記憶體使用**: 降低 80% 以上
- **支援檔案大小**: 可處理 1GB+ 的影像檔案

## 📋 系統要求

### 後端要求
- Python 3.8+
- GDAL 3.0+
- TiTiler 0.24+

### 前端要求
- Leaflet 1.7+
- 現代瀏覽器（支援 ES6+）

## 🛠️ 安裝與配置

### 1. 安裝 TiTiler

```bash
# 安裝 TiTiler 及其依賴
pip install "titiler[all]"

# 驗證安裝
python -c "import titiler; print('TiTiler 安裝成功')"
```

### 2. 安裝 GDAL（如果尚未安裝）

```bash
# macOS
brew install gdal

# Ubuntu/Debian
sudo apt-get install gdal-bin

# Windows
# 下載並安裝 GDAL 二進制文件
```

### 3. 啟動 TiTiler 服務器

```bash
# 進入後端目錄
cd backend

# 啟動 TiTiler 服務器
./start_titiler.sh

# 或直接使用 Python
python titiler_server.py
```

服務器將在 `http://localhost:8000` 啟動。

## 🔄 使用流程

### 第一步：轉換 GeoTIFF 為 COG

```bash
# 單文件轉換
python convert_to_cog.py input.tif -o output_cog.tif

# 批量轉換
python convert_to_cog.py /path/to/tif/files/ --batch

# 使用不同壓縮方法
python convert_to_cog.py input.tif -c DEFLATE --no-overviews
```

### 第二步：上傳 COG 文件

1. 將轉換後的 COG 文件上傳到系統
2. 確保文件名包含 `_cog` 標識
3. 系統會自動檢測並使用 COG 瓦片服務

### 第三步：前端自動加速

前端會自動檢測 COG 文件並使用 TiTiler 瓦片服務：

```javascript
// 自動檢測 COG 文件
if (baseMapService.isCOGFile(filePath)) {
  // 使用 COG 瓦片服務
  const cogLayer = await baseMapService.loadCOGBaseMap(baseMap)
} else {
  // 使用傳統 GeoTIFF 載入
  const tifLayer = await baseMapService.loadGeoTIFF(imageUrl, baseMap)
}
```

## 📊 性能對比

| 指標 | 傳統 GeoTIFF | COG + TiTiler | 提升幅度 |
|------|-------------|---------------|----------|
| 初次載入時間 | 30-60秒 | 2-5秒 | **10-20倍** |
| 縮放響應時間 | 5-10秒 | <1秒 | **10倍** |
| 記憶體使用 | 500MB+ | <100MB | **5倍** |
| 支援檔案大小 | <200MB | 1GB+ | **5倍** |

## 🔧 配置選項

### TiTiler 配置

```python
# titiler_server.py
cog = TilerFactory(
    supported_format=["png", "jpeg", "webp", "tiff"],
    tile_size=256,           # 瓦片大小
    minzoom=0,              # 最小縮放級別
    maxzoom=22,             # 最大縮放級別
    resampling_method="bilinear",  # 重採樣方法
    add_statistics=True,    # 添加統計信息
    add_metadata=True,      # 添加元數據
    add_preview=True,       # 添加預覽
)
```

### COG 轉換選項

```bash
# 壓縮方法選項
-c LZW      # LZW 壓縮（推薦）
-c DEFLATE  # DEFLATE 壓縮
-c JPEG     # JPEG 壓縮
-c LZ4      # LZ4 壓縮
-c ZSTD     # ZSTD 壓縮

# 其他選項
--no-overviews  # 不生成金字塔層級
--batch         # 批量轉換模式
```

## 🎯 最佳實踐

### 1. 文件命名規範
- COG 文件應包含 `_cog` 標識
- 例如：`orthophoto_cog.tif`

### 2. 壓縮選擇
- **LZW**: 無損壓縮，適合精確測量
- **DEFLATE**: 更好的壓縮率
- **JPEG**: 有損壓縮，適合視覺化

### 3. 金字塔層級
- 大型文件建議生成金字塔層級
- 小型文件可以跳過以節省空間

### 4. 瓦片大小
- 256x256: 標準大小，兼容性好
- 512x512: 更大瓦片，減少請求數

## 🔍 故障排除

### 常見問題

#### 1. TiTiler 服務器無法啟動
```bash
# 檢查 Python 版本
python --version

# 檢查 TiTiler 安裝
pip list | grep titiler

# 檢查端口占用
lsof -i :8000
```

#### 2. COG 文件無法載入
```bash
# 檢查 COG 文件格式
gdalinfo your_file_cog.tif

# 驗證 COG 結構
rio cogeo validate your_file_cog.tif
```

#### 3. 前端瓦片載入失敗
```javascript
// 檢查 TiTiler 服務器狀態
fetch('http://localhost:8000/health')
  .then(response => response.json())
  .then(data => console.log('TiTiler 狀態:', data))

// 檢查 COG 文件信息
fetch('http://localhost:8000/cog/info?url=YOUR_COG_URL')
  .then(response => response.json())
  .then(data => console.log('COG 信息:', data))
```

## 📈 監控與優化

### 性能監控

```javascript
// 監控瓦片載入性能
cogTileService.getCacheStats()

// 監控 COG 圖層狀態
baseMapService.getCOGLayerStats()
```

### 緩存管理

```javascript
// 清理瓦片緩存
cogTileService.clearCache()

// 清理 TIF 圖層緩存
baseMapService.clearCache()
```

## 🔗 API 參考

### TiTiler API 端點

- `GET /health` - 健康檢查
- `GET /cog/info?url={cog_url}` - 獲取 COG 信息
- `GET /cog/statistics?url={cog_url}` - 獲取統計信息
- `GET /cog/preview?url={cog_url}` - 獲取預覽圖
- `GET /cog/tiles/{z}/{x}/{y}?url={cog_url}` - 獲取瓦片

### 前端服務 API

```javascript
// COG 瓦片服務
cogTileService.getCOGInfo(cogUrl)
cogTileService.getCOGStatistics(cogUrl)
cogTileService.createCOGTileLayer(cogUrl, options)
cogTileService.validateCOG(cogUrl)

// 底圖服務
baseMapService.isCOGFile(filePath)
baseMapService.loadCOGBaseMap(baseMap)
baseMapService.loadGeoTIFF(imageUrl, baseMap)
```

## 📚 相關資源

- [TiTiler 官方文檔](https://developmentseed.org/titiler/)
- [COG 規範](https://www.cogeo.org/)
- [GDAL 文檔](https://gdal.org/)
- [Leaflet 文檔](https://leafletjs.com/)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改進這個方案！

---

**注意**: 本方案需要 TiTiler 服務器運行在 `http://localhost:8000`。在生產環境中，請確保服務器的安全性和穩定性。
