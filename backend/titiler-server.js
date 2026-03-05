import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8000;

// 啟用 CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
}));

// 中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TiTiler JavaScript Server',
    version: '1.0.0'
  });
});

// COG 瓦片服務端點
app.get('/cog/tiles/:tileMatrixSetId/:z/:x/:y', async (req, res) => {
  try {
    const { tileMatrixSetId, z, x, y } = req.params;
    const { url } = req.query;
    
    console.log(`瓦片請求: ${tileMatrixSetId}/${z}/${x}/${y}`, { url });
    
    if (!url) {
      return res.status(400).json({ error: '缺少 url 參數' });
    }
    
    // 解析 URL 參數
    const imageUrl = decodeURIComponent(url);
    console.log('圖片 URL:', imageUrl);
    
    // 檢查文件是否存在
    const filePath = imageUrl.replace('http://localhost:3001/', '');
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error('文件不存在:', fullPath);
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 使用 GDAL 生成瓦片
    const tileResult = await generateTile(fullPath, parseInt(z), parseInt(x), parseInt(y));
    
    if (tileResult.success) {
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      });
      res.send(tileResult.data);
    } else {
      res.status(500).json({ error: tileResult.error });
    }
    
  } catch (error) {
    console.error('瓦片生成錯誤:', error);
    res.status(500).json({ error: '瓦片生成失敗' });
  }
});

// 使用 GDAL 生成瓦片的函數
function generateTile(filePath, z, x, y) {
  return new Promise(async (resolve) => {
    // 計算瓦片邊界（Web Mercator 投影）
    const n = Math.pow(2, z);
    const lon_deg = x / n * 360.0 - 180.0;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat_deg = lat_rad * 180.0 / Math.PI;
    
    const lon_deg_next = (x + 1) / n * 360.0 - 180.0;
    const lat_rad_next = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
    const lat_deg_next = lat_rad_next * 180.0 / Math.PI;
    
    console.log(`瓦片邊界: ${lon_deg}, ${lat_deg_next}, ${lon_deg_next}, ${lat_deg}`);
    
    // 移除交集檢查，讓所有瓦片都正常生成
    // 這樣可以確保 COG 影像始終完整顯示，不受地圖視窗限制
    
    // 使用 gdalwarp 生成瓦片，確保完整顯示 COG 影像
    const gdal = spawn('gdalwarp', [
      '-of', 'PNG',
      '-s_srs', 'EPSG:3826',  // 源坐標系統為 TWD97 / TM2 zone 121
      '-t_srs', 'EPSG:4326',  // 目標坐標系統為 WGS84
      '-te', lon_deg.toString(), lat_deg_next.toString(), lon_deg_next.toString(), lat_deg.toString(),
      '-ts', '256', '256',
      '-r', 'bilinear',
      '-dstalpha',  // 添加 Alpha 通道
      '-dstnodata', '0',  // 設置無效數據值為 0
      '-srcnodata', '-10000',  // 源無效數據值（與 COG 文件匹配）
      '-co', 'WORLDFILE=NO',  // 不生成 worldfile
      '-co', 'TILED=YES',  // 啟用瓦片化
      '-co', 'COMPRESS=PNG',  // PNG 壓縮
      '-co', 'ZLEVEL=6',  // 壓縮級別
      '-wo', 'INIT_DEST=0',  // 初始化目標為 0
      '-wo', 'UNIFIED_SRC_NODATA=YES',  // 統一源無效數據處理
      '-wo', 'WRITE_FLUSH=YES',  // 立即寫入
      filePath,
      '/vsistdout/'
    ]);
    
    const chunks = [];
    
    gdal.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    let stderr = '';
    
    gdal.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    
    gdal.on('close', (code) => {
      if (code === 0) {
        const data = Buffer.concat(chunks);
        console.log(`瓦片生成成功: ${z}/${x}/${y}, 大小: ${data.length} bytes`);
        resolve({ success: true, data });
      } else {
        console.error(`GDAL 錯誤代碼: ${code}`);
        console.error(`GDAL 錯誤信息: ${stderr}`);
        resolve({ success: false, error: `GDAL 錯誤代碼: ${code}, 錯誤信息: ${stderr}` });
      }
    });
    
    gdal.on('error', (error) => {
      console.error('GDAL 執行錯誤:', error);
      resolve({ success: false, error: error.message });
    });
  });
}

// COG 信息端點
app.get('/cog/info', (req, res) => {
  res.json({
    message: 'COG 端點可用',
    endpoints: [
      '/cog/tiles/{tileMatrixSetId}/{z}/{x}/{y}',
      '/cog/info',
      '/cog/bounds',
      '/health'
    ],
    supportedTileMatrixSets: ['WebMercatorQuad']
  });
});

// COG 文件邊界信息端點
app.get('/cog/bounds', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: '缺少 url 參數' });
    }
    
    // 解析 URL 參數
    const imageUrl = decodeURIComponent(url);
    console.log('獲取 COG 文件邊界:', imageUrl);
    
    // 檢查文件是否存在
    const filePath = imageUrl.replace('http://localhost:3001/', '');
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error('文件不存在:', fullPath);
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 使用 GDAL 獲取文件邊界信息
    const bounds = await getCogBounds(fullPath);
    
    res.json({
      success: true,
      bounds: bounds
    });
    
  } catch (error) {
    console.error('獲取 COG 邊界錯誤:', error);
    res.status(500).json({ error: '獲取邊界失敗' });
  }
});

// 獲取 COG 文件邊界的函數
function getCogBounds(filePath) {
  return new Promise((resolve, reject) => {
    
    // 使用 gdalinfo 獲取文件信息
    const gdal = spawn('gdalinfo', [filePath]);
    
    let stdout = '';
    let stderr = '';
    
    gdal.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    
    gdal.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    
    gdal.on('close', (code) => {
      if (code === 0) {
        try {
          console.log('GDAL 輸出:', stdout);
          
          // 解析 gdalinfo 輸出，提取邊界坐標
          const lines = stdout.split('\n');
          let bounds = null;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('Corner Coordinates:')) {
              // 找到邊界坐標部分，讀取接下來的幾行
              const cornerLines = [];
              for (let j = i + 1; j < i + 6 && j < lines.length; j++) {
                if (lines[j].trim() && !lines[j].includes('Band')) {
                  cornerLines.push(lines[j].trim());
                }
              }
              
              console.log('邊界坐標行:', cornerLines);
              
              // 解析坐標
              const coords = [];
              for (const cornerLine of cornerLines) {
                // 匹配格式: Upper Left  (  290609.055, 2730414.349) (121d24' 4.59"E, 24d40'48.66"N)
                const match = cornerLine.match(/\(([^)]+)\) \(([^)]+)\)/);
                if (match) {
                  const [twd97X, twd97Y] = match[1].split(',').map(Number);
                  const [lonStr, latStr] = match[2].split(',');
                  
                  console.log('解析坐標:', { twd97X, twd97Y, lonStr, latStr });
                  
                  // 解析度分秒格式的坐標
                  const lonMatch = lonStr.match(/(\d+)d(\d+)'([\d.]+)"([EW])/);
                  const latMatch = latStr.match(/(\d+)d(\d+)'([\d.]+)"([NS])/);
                  
                  if (lonMatch && latMatch) {
                    let lon = parseFloat(lonMatch[1]) + parseFloat(lonMatch[2])/60 + parseFloat(lonMatch[3])/3600;
                    let lat = parseFloat(latMatch[1]) + parseFloat(latMatch[2])/60 + parseFloat(latMatch[3])/3600;
                    
                    // 處理東南西北方向
                    if (lonMatch[4] === 'W') lon = -lon;
                    if (latMatch[4] === 'S') lat = -lat;
                    
                    coords.push([lat, lon]);
                    console.log('轉換後坐標:', { lat, lon });
                  }
                }
              }
              
              if (coords.length >= 2) {
                // 計算邊界
                const lats = coords.map(c => c[0]);
                const lons = coords.map(c => c[1]);
                
                bounds = {
                  minLat: Math.min(...lats),
                  maxLat: Math.max(...lats),
                  minLon: Math.min(...lons),
                  maxLon: Math.max(...lons),
                  center: {
                    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                    lon: (Math.min(...lons) + Math.max(...lons)) / 2
                  }
                };
                break;
              }
            }
          }
          
          if (bounds) {
            console.log('COG 文件邊界:', bounds);
            resolve(bounds);
          } else {
            reject(new Error('無法解析 COG 文件邊界'));
          }
        } catch (error) {
          console.error('解析邊界錯誤:', error);
          reject(error);
        }
      } else {
        console.error(`GDAL 錯誤代碼: ${code}, 錯誤信息: ${stderr}`);
        reject(new Error(`GDAL 錯誤代碼: ${code}, 錯誤信息: ${stderr}`));
      }
    });
    
    gdal.on('error', (error) => {
      console.error('GDAL 執行錯誤:', error);
      reject(error);
    });
  });
}

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('服務器錯誤:', error);
  res.status(500).json({ error: '內部服務器錯誤' });
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TiTiler JavaScript 服務器運行在 http://0.0.0.0:${PORT}`);
  console.log('健康檢查: http://localhost:8000/health');
  console.log('COG 信息: http://localhost:8000/cog/info');
});

export default app;
