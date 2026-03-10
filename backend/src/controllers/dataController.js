import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import proj4 from 'proj4';
import { pool } from '../config/database.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateUUID } from '../utils/validators.js';

const execAsync = promisify(exec);

// 配置 multer 用於檔案上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/data/others';
    
    // 根據文件類型選擇存儲路徑
    if (file.mimetype === 'application/geo+json') {
      uploadPath = 'uploads/data/geojson';
    } else if (file.mimetype === 'application/vnd.google-earth.kml+xml') {
      uploadPath = 'uploads/data/kml';
    } else if (file.mimetype.startsWith('image/') || file.mimetype === 'image/tiff' || file.mimetype === 'image/tif') {
      if (req.body.data_type === 'basemap') {
        uploadPath = 'uploads/data/basemaps';
        console.log('底圖檔案存儲到:', uploadPath);
      }
    }
    
    // 額外檢查：如果是底圖類型，強制使用 basemaps 目錄
    if (req.body.data_type === 'basemap') {
      uploadPath = 'uploads/data/basemaps';
      console.log('強制底圖檔案存儲到:', uploadPath);
    }
    
    // 確保目錄存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 配置 multer 用於關聯上傳（feature uploads）
const featureUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/features/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB — GIS data files (TIF, GeoJSON, shapefiles) can be large
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter - 文件信息:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // 允許的檔案類型
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/json',
      'application/geo+json',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff',           // 添加 TIF/TIFF 支援
      'image/tif',            // 添加 TIF 支援
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    // 允許的副檔名
    const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.json', '.geojson', '.txt', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.zip'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    console.log('Multer fileFilter - 檢查結果:', {
      mimetype: file.mimetype,
      extension: fileExtension,
      mimetypeAllowed: allowedTypes.includes(file.mimetype),
      extensionAllowed: allowedExtensions.includes(fileExtension)
    });
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log('Multer fileFilter - 文件被接受');
      cb(null, true);
    } else {
      console.log('Multer fileFilter - 文件被拒絕');
      cb(new Error('不支援的檔案類型'), false);
    }
  }
});

// 關聯上傳的 multer 配置（主要用於圖片）
const featureUpload = multer({
  storage: featureUploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB — feature uploads are primarily images/PDFs
  },
  fileFilter: (req, file, cb) => {
    // 關聯上傳主要支援圖片類型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain'
    ];
    
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('關聯上傳不支援此檔案類型'), false);
    }
  }
});

// 檔案類型識別函數
const detectFileType = (mimeType, extension) => {
  const typeMap = {
    'application/pdf': 'document',
    'application/vnd.ms-excel': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
    'text/csv': 'csv',
    'application/json': 'other',
    'application/geo+json': 'vector',
    'text/plain': 'other',
    'image/jpeg': 'image',
    'image/png': 'image',
    'application/zip': 'other',
    'application/x-zip-compressed': 'other'
  };
  
  // 如果副檔名是 .geojson，識別為 vector 類型
  if (extension === '.geojson') {
    return 'vector';
  }
  
  return typeMap[mimeType] || 'other';
};

// 計算檔案雜湊值
const calculateFileHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// TIF 轉 COG 函數
const convertTifToCog = async (inputPath) => {
  try {
    const inputDir = path.dirname(inputPath);
    const inputName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(inputDir, `${inputName}_cog.tif`);
    
    console.log(`開始轉換 TIF 為 COG: ${inputPath} -> ${outputPath}`);
    
    // 使用 gdal_translate 轉換為 COG，嚴格控制透明度和無效數據
    // 添加 Alpha 通道和無效數據處理，避免雜訊生成
    const command = `gdal_translate -of COG -a_nodata 0 -co COMPRESS=LZW -co TILED=YES -co BLOCKSIZE=512 -co OVERVIEW_RESAMPLING=AVERAGE -co OVERVIEWS=AUTO -co BIGTIFF=IF_SAFER -co PREDICTOR=2 -co ALPHA=YES -co PHOTOMETRIC=RGB "${inputPath}" "${outputPath}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('GDAL 轉換警告:', stderr);
    }
    
    // 檢查輸出文件是否存在
    if (fs.existsSync(outputPath)) {
      console.log(`COG 轉換成功: ${outputPath}`);
      
      // 刪除原始 TIF 文件
      try {
        fs.unlinkSync(inputPath);
        console.log(`已刪除原始 TIF 文件: ${inputPath}`);
      } catch (error) {
        console.warn('刪除原始文件失敗:', error);
      }
      
      return outputPath;
    } else {
      throw new Error('COG 文件未生成');
    }
  } catch (error) {
    console.error('TIF 轉 COG 失敗:', error);
    throw error;
  }
};

// 上傳資料
export const uploadData = async (req, res) => {
  try {
    console.log('=== 上傳請求調試信息 ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Content-Length:', req.get('Content-Length'));
    console.log('req.file:', req.file);
    console.log('req.files:', req.files);
    console.log('req.body keys:', Object.keys(req.body));
    console.log('req.body values:', req.body);
    
    const { project_id, data_name, data_description, data_date, data_type, analysis_data, layer_color } = req.body;
    console.log('上傳請求參數:', { project_id, data_name, data_description, data_date, data_type, layer_color });
    
    if (!req.file) {
      console.log('錯誤：req.file 為空');
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的檔案'
      });
    }

    if (!project_id || !data_name || !data_date) {
      return res.status(400).json({
        success: false,
        message: '缺少必要欄位：project_id, data_name, data_date'
      });
    }

    // 檢查專案是否存在
    const projectCheck = await pool.query(
      'SELECT project_id FROM projects WHERE project_id = $1 AND deleted_at IS NULL',
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '專案不存在'
      });
    }

    // 處理檔案資訊
    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    let fileType = detectFileType(file.mimetype, fileExtension);
    
    // 根據 data_type 覆蓋 file_type
    if (data_type === 'potential_analysis') {
      fileType = 'potential_analysis';
    } else if (data_type === 'profile_observation') {
      fileType = 'profile_observation';
    } else if (data_type === 'general') {
      fileType = 'vector'; // 一般圖層使用 vector 類型
    } else if (data_type === 'basemap') {
      fileType = 'raster'; // 底圖使用 raster 類型
    }
    
    // 如果是底圖且為 TIF 文件，自動轉換為 COG
    let finalFilePath = file.path;
    let finalFileName = file.originalname;
    let finalFileSize = file.size;
    
    if (data_type === 'basemap' && (fileExtension === '.tif' || fileExtension === '.tiff')) {
      console.log('檢測到底圖 TIF 文件，開始轉換為 COG...');
      try {
        const cogPath = await convertTifToCog(file.path);
        if (cogPath) {
          finalFilePath = cogPath;
          finalFileName = file.originalname.replace(/\.(tif|tiff)$/i, '_cog.tif');
          finalFileSize = fs.statSync(cogPath).size;
          console.log(`TIF 轉 COG 成功: ${file.originalname} -> ${finalFileName}`);
          console.log(`文件大小: ${file.size} -> ${finalFileSize} bytes`);
        }
      } catch (error) {
        console.error('TIF 轉 COG 失敗:', error);
        // 如果轉換失敗，繼續使用原始文件
      }
    }
    
    const fileHash = calculateFileHash(finalFilePath);

    // 開始資料庫事務
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');

      // 插入資料到 data_files 表
      const dataFileResult = await client.query(`
        INSERT INTO data_files (
          project_id, file_name, original_name, file_extension, file_type, mime_type,
          file_size, storage_path, file_hash, upload_date, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        project_id,
        data_name, // 使用 data_name 作為 file_name
        finalFileName, // 使用轉換後的文件名稱
        fileExtension,
        fileType,
        file.mimetype,
        finalFileSize, // 使用轉換後的文件大小
        finalFilePath, // 使用轉換後的文件路徑
        fileHash,
        data_date, // 使用 data_date 作為 upload_date
        JSON.stringify({ 
          data_date: data_date,
          data_description: data_description || null,
          data_name: data_name,
          data_type: data_type || 'general',
          analysis_data: analysis_data ? JSON.parse(analysis_data) : null,
          layer_color: layer_color || '#3388ff'
        }) // 將所有資料存到 metadata 中
      ]);

      const dataFile = dataFileResult.rows[0];

      // 如果是空間資料檔案，創建對應的 spatial_layers 記錄
      if ((fileExtension === '.geojson' || fileExtension === '.kml')) {
        console.log('創建 spatial_layers 記錄...');
        
        // 讀取 GeoJSON 檔案來獲取空間資訊
        let spatialInfo = null;
        let detectedSRID = 4326; // 默認 WGS84
        try {
          const fileContent = fs.readFileSync(file.path, 'utf8');
          const geojson = JSON.parse(fileContent);
          
          // 檢測坐標系統
          console.log('GeoJSON CRS 信息:', geojson.crs);
          if (geojson.crs && geojson.crs.properties && geojson.crs.properties.name) {
            const crsName = geojson.crs.properties.name;
            console.log('CRS 名稱:', crsName);
            
            // 支持多種 CRS 格式
            if (crsName.includes('EPSG:3826') || crsName.includes('TWD97') || 
                crsName.includes('urn:ogc:def:crs:EPSG::3826') || 
                crsName.includes('urn:ogc:def:crs:EPSG:3826')) {
              detectedSRID = 3826; // TWD97/TM2 zone 121
              console.log('檢測到 TWD97 坐標系統 (EPSG:3826)');
            } else if (crsName.includes('EPSG:4326') || crsName.includes('WGS84') ||
                       crsName.includes('urn:ogc:def:crs:EPSG::4326') ||
                       crsName.includes('urn:ogc:def:crs:EPSG:4326')) {
              detectedSRID = 4326; // WGS84
              console.log('檢測到 WGS84 坐標系統 (EPSG:4326)');
            } else {
              console.log('未知的 CRS 格式:', crsName);
            }
          } else {
            console.log('沒有 CRS 信息，將根據坐標值範圍判斷');
          }
          
          // 如果沒有 CRS 信息，根據坐標值範圍判斷
          if (detectedSRID === 4326 && geojson.features && geojson.features.length > 0) {
            const firstFeature = geojson.features[0];
            if (firstFeature.geometry && firstFeature.geometry.coordinates) {
              const coords = firstFeature.geometry.coordinates;
              let sampleX, sampleY;
              
              if (firstFeature.geometry.type === 'Point') {
                [sampleX, sampleY] = coords;
              } else if (firstFeature.geometry.type === 'LineString') {
                [sampleX, sampleY] = coords[0];
              } else if (firstFeature.geometry.type === 'Polygon') {
                [sampleX, sampleY] = coords[0][0];
              }
              
              // TWD97 坐標範圍判斷：X: 200000-300000, Y: 2500000-2800000
              console.log('樣本坐標:', { sampleX, sampleY });
              
              // 更精確的 TWD97 坐標範圍判斷
              if (sampleX > 150000 && sampleX < 400000 && sampleY > 2400000 && sampleY < 2900000) {
                detectedSRID = 3826; // TWD97
                console.log('根據坐標值範圍檢測到 TWD97 坐標系統');
                console.log('坐標範圍符合 TWD97: X在150000-400000, Y在2400000-2900000');
              } else if (sampleX >= -180 && sampleX <= 180 && sampleY >= -90 && sampleY <= 90) {
                console.log('坐標值範圍符合 WGS84 (經緯度)');
              } else {
                console.log('坐標值範圍不符合已知坐標系統，保持默認 WGS84');
                console.log('坐標值:', { sampleX, sampleY });
              }
            }
          }
          
          // 強制檢查：如果坐標值明顯是 TWD97 格式，強制設置為 3826
          if (detectedSRID === 4326 && geojson.features && geojson.features.length > 0) {
            const firstFeature = geojson.features[0];
            if (firstFeature.geometry && firstFeature.geometry.coordinates) {
              const coords = firstFeature.geometry.coordinates;
              let sampleX, sampleY;
              
              if (firstFeature.geometry.type === 'Point') {
                [sampleX, sampleY] = coords;
              } else if (firstFeature.geometry.type === 'LineString') {
                [sampleX, sampleY] = coords[0];
              } else if (firstFeature.geometry.type === 'Polygon') {
                [sampleX, sampleY] = coords[0][0];
              } else if (firstFeature.geometry.type === 'MultiLineString') {
                [sampleX, sampleY] = coords[0][0];
              }
              
              // 強制檢查：如果坐標值在 TWD97 範圍內，強制設置
              if (sampleX && sampleY && sampleX > 100000 && sampleX < 500000 && sampleY > 2000000 && sampleY < 3000000) {
                detectedSRID = 3826;
                console.log('強制檢測：坐標值明顯是 TWD97 格式，強制設置 SRID 為 3826');
              }
            }
          }
          
          console.log('最終檢測到的坐標系統 SRID:', detectedSRID);
          
          if (geojson.features && geojson.features.length > 0) {
            // 計算邊界框
            let minX = null, minY = null, maxX = null, maxY = null;
            let featureCount = geojson.features.length;
            let geometryType = 'Point'; // 默認值，避免使用 "Unknown"
            let hasValidCoordinates = false;
            
            geojson.features.forEach(feature => {
              if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                geometryType = feature.geometry.type;
                
                // 簡化的邊界框計算（適用於 Point, LineString, Polygon）
                if (feature.geometry.type === 'Point') {
                  const [x, y] = coords;
                  if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                    if (!hasValidCoordinates) {
                      minX = maxX = x;
                      minY = maxY = y;
                      hasValidCoordinates = true;
                    } else {
                      minX = Math.min(minX, x);
                      minY = Math.min(minY, y);
                      maxX = Math.max(maxX, x);
                      maxY = Math.max(maxY, y);
                    }
                  }
                } else if (feature.geometry.type === 'LineString') {
                  coords.forEach(([x, y]) => {
                    if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                      if (!hasValidCoordinates) {
                        minX = maxX = x;
                        minY = maxY = y;
                        hasValidCoordinates = true;
                      } else {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                      }
                    }
                  });
                } else if (feature.geometry.type === 'Polygon') {
                  coords[0].forEach(([x, y]) => {
                    if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                      if (!hasValidCoordinates) {
                        minX = maxX = x;
                        minY = maxY = y;
                        hasValidCoordinates = true;
                      } else {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                      }
                    }
                  });
                } else if (feature.geometry.type === 'MultiLineString') {
                  // 處理 MultiLineString：每個元素是一個 LineString
                  coords.forEach(lineString => {
                    lineString.forEach(([x, y]) => {
                      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                        if (!hasValidCoordinates) {
                          minX = maxX = x;
                          minY = maxY = y;
                          hasValidCoordinates = true;
                        } else {
                          minX = Math.min(minX, x);
                          minY = Math.min(minY, y);
                          maxX = Math.max(maxX, x);
                          maxY = Math.max(maxY, y);
                        }
                      }
                    });
                  });
                } else if (feature.geometry.type === 'MultiPolygon') {
                  // 處理 MultiPolygon：每個元素是一個 Polygon
                  coords.forEach(polygon => {
                    polygon[0].forEach(([x, y]) => {
                      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                        if (!hasValidCoordinates) {
                          minX = maxX = x;
                          minY = maxY = y;
                          hasValidCoordinates = true;
                        } else {
                          minX = Math.min(minX, x);
                          minY = Math.min(minY, y);
                          maxX = Math.max(maxX, x);
                          maxY = Math.max(maxY, y);
                        }
                      }
                    });
                  });
                }
              }
            });
            
            // 只有在有有效坐標時才設置邊界框
            if (hasValidCoordinates) {
              spatialInfo = {
                geometryType,
                featureCount,
                bounds: { minX, minY, maxX, maxY }
              };
            } else {
              spatialInfo = {
                geometryType,
                featureCount,
                bounds: null
              };
            }
          }
        } catch (error) {
          console.error('讀取 GeoJSON 檔案失敗:', error);
        }

        // 創建 spatial_layers 記錄
        const spatialLayerResult = await client.query(`
          INSERT INTO spatial_layers (
            project_id, source_file_id, layer_name, display_name, description,
            geometry_type, srid, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y,
            feature_count, processing_status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `, [
          project_id,
          dataFile.file_id,
          data_name, // layer_name
          data_name, // display_name
          data_description || null,
          spatialInfo ? spatialInfo.geometryType : 'Point',
          detectedSRID, // 自動檢測的坐標系統 (WGS84: 4326, TWD97: 3826)
          spatialInfo && spatialInfo.bounds ? spatialInfo.bounds.minX : null,
          spatialInfo && spatialInfo.bounds ? spatialInfo.bounds.minY : null,
          spatialInfo && spatialInfo.bounds ? spatialInfo.bounds.maxX : null,
          spatialInfo && spatialInfo.bounds ? spatialInfo.bounds.maxY : null,
          spatialInfo ? spatialInfo.featureCount : 0,
          'completed', // 直接標記為完成
          JSON.stringify({
            source_file: dataFile.file_name,
            created_from: 'upload',
            analysis_data: analysis_data ? JSON.parse(analysis_data) : null
          })
        ]);

        console.log('spatial_layers 記錄創建成功:', spatialLayerResult.rows[0].layer_id);
      }

      await client.query('COMMIT');
      
      // 返回 data_files 記錄
      result = { rows: [dataFile] };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // 潛勢評估的區間設定已經存儲在 metadata 的 analysis_data 中
    // 不需要額外的表，因為設定是作為一個整體存儲的

    // 暫時停用快照生成，直接顯示原始 GeoJSON
    console.log('已停用快照生成，將顯示原始 GeoJSON 文件')
    // if (data_type === 'potential_analysis' && analysis_data) {
    //   try {
    //     console.log('開始創建潛勢分析快照...')
    //     await createPotentialAnalysisSnapshot(result.rows[0].file_id, project_id, data_name, data_date, data_description, JSON.parse(analysis_data))
    //     console.log('潛勢分析快照創建成功')
    //   } catch (error) {
    //     console.error('創建潛勢分析快照失敗:', error)
    //     // 不影響主要上傳流程，只記錄錯誤
    //   }
    // }

    res.status(201).json({
      success: true,
      message: '資料上傳成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('上傳資料錯誤:', error);
    console.error('錯誤堆棧:', error.stack);
    
    // 如果上傳失敗，刪除已上傳的檔案
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: '上傳失敗',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 獲取專案的資料列表（排除底圖和時序資料）
export const getProjectData = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    
    const result = await pool.query(`
      SELECT 
        file_id, file_name, original_name, upload_date,
        file_extension, file_type, mime_type, file_size, 
        created_at, updated_at, metadata
      FROM data_files 
      WHERE project_id = $1 
        AND deleted_at IS NULL
        AND file_type::text NOT LIKE 'temporal_%'
        AND (metadata->>'data_type' IS NULL OR metadata->>'data_type' != 'basemap')
      ORDER BY created_at DESC
    `, [projectId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('獲取專案資料錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '獲取資料失敗',
    });
  }
};

// 獲取單一資料
export const getDataById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    
    const result = await pool.query(`
      SELECT 
        df.*, p.name as project_name
      FROM data_files df
      JOIN projects p ON df.project_id = p.project_id
      WHERE df.file_id = $1 AND df.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('獲取資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取資料失敗',
    });
  }
};

// 更新資料
export const updateData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    const { data_name, data_description, data_date, layer_color } = req.body;
    
    // 首先獲取現有的 metadata
    const existingResult = await pool.query(`
      SELECT metadata FROM data_files WHERE file_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    // 更新 metadata 中的描述信息（保持與前端一致的結構）
    const existingMetadata = existingResult.rows[0].metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      data_description: data_description || existingMetadata.data_description || '',
      data_date: data_date || existingMetadata.data_date || '',
      layer_color: layer_color || existingMetadata.layer_color || '#3388ff',
      // 同時保持 data_info 結構以向後兼容
      data_info: {
        ...existingMetadata.data_info,
        name: data_name || existingMetadata.data_info?.name || '',
        description: data_description || existingMetadata.data_info?.description || '',
        date: data_date || existingMetadata.data_info?.date || ''
      }
    };

    const result = await pool.query(`
      UPDATE data_files 
      SET 
        file_name = COALESCE($1, file_name),
        upload_date = COALESCE($2, upload_date),
        metadata = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE file_id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [data_name, data_date, JSON.stringify(updatedMetadata), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    res.json({
      success: true,
      message: '資料更新成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('更新資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新資料失敗',
    });
  }
};

// 獲取專案的底圖列表
export const getProjectBaseMaps = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    
    const result = await pool.query(`
      SELECT 
        file_id,
        file_name,
        original_name,
        file_type,
        file_size,
        storage_path,
        upload_date,
        metadata
      FROM data_files 
      WHERE project_id = $1 
        AND file_type IN ('raster', 'image')
        AND (metadata->>'data_type' = 'basemap' OR metadata->>'data_type' IS NULL)
        AND deleted_at IS NULL
      ORDER BY upload_date DESC
    `, [projectId]);

    const baseMaps = result.rows.map(row => ({
      id: row.file_id,
      name: row.metadata?.data_info?.name || row.file_name,
      description: row.metadata?.data_info?.description || '',
      originalName: row.original_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      storagePath: row.storage_path,
      uploadDate: row.upload_date,
      metadata: row.metadata
    }));

    res.json({
      success: true,
      data: baseMaps
    });

  } catch (error) {
    console.error('獲取底圖列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取底圖列表失敗',
    });
  }
};

// 軟刪除資料
export const deleteData = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    
    await client.query('BEGIN');

    // 檢查資料是否存在
    const dataFileResult = await client.query(`
      SELECT file_id, file_name, file_type, project_id
      FROM data_files 
      WHERE file_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (dataFileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    const dataFile = dataFileResult.rows[0];

    // 如果是空間資料檔案，同時刪除對應的 spatial_layers 記錄
    if (dataFile.file_type === 'potential_analysis') {
      console.log('刪除對應的 spatial_layers 記錄...');
      
      const spatialLayerResult = await client.query(`
        UPDATE spatial_layers 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE source_file_id = $1 AND deleted_at IS NULL
        RETURNING layer_id, layer_name
      `, [id]);

      if (spatialLayerResult.rows.length > 0) {
        console.log(`已刪除 ${spatialLayerResult.rows.length} 個 spatial_layers 記錄:`, 
          spatialLayerResult.rows.map(row => row.layer_name));
      }
    }

    // 刪除相關的 feature_uploads 記錄（關聯上傳的圖片等）
    console.log('刪除相關的 feature_uploads 記錄...');
    
    const featureUploadsResult = await client.query(`
      UPDATE feature_uploads 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE data_files_id = $1 AND deleted_at IS NULL
      RETURNING upload_id, upload_name, upload_type
    `, [id]);

    if (featureUploadsResult.rows.length > 0) {
      console.log(`已刪除 ${featureUploadsResult.rows.length} 個 feature_uploads 記錄:`, 
        featureUploadsResult.rows.map(row => `${row.upload_name} (${row.upload_type})`));
    }

    // 刪除 data_files 記錄
    const result = await client.query(`
      UPDATE data_files 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE file_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '資料已刪除',
      data: {
        file_id: result.rows[0].file_id,
        file_name: result.rows[0].file_name,
        deleted_at: result.rows[0].deleted_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('刪除資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除資料失敗',
    });
  } finally {
    client.release();
  }
};

// 下載檔案
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT file_name, storage_path, mime_type
      FROM data_files 
      WHERE file_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '檔案不存在'
      });
    }

    const { file_name, storage_path, mime_type } = result.rows[0];

    if (!fs.existsSync(storage_path)) {
      return res.status(404).json({
        success: false,
        message: '檔案已遺失'
      });
    }

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    
    const fileStream = fs.createReadStream(storage_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('下載檔案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '下載檔案失敗',
    });
  }
};

// 獲取專案的所有 GeoJSON 資料列表
export const getProjectGeoJSONList = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    
    // 透過 spatial_layers 表查詢，關聯到 data_files 表
    const result = await pool.query(`
      SELECT 
        sl.layer_id,
        sl.layer_name,
        sl.display_name,
        sl.geometry_type,
        sl.spatial_extent,
        sl.bbox_min_x,
        sl.bbox_min_y,
        sl.bbox_max_x,
        sl.bbox_max_y,
        sl.feature_count,
        sl.layer_style,
        sl.opacity,
        sl.visible,
        sl.z_index,
        sl.processing_status,
        sl.metadata as layer_metadata,
        df.file_id,
        df.file_name,
        df.storage_path,
        df.metadata as file_metadata,
        df.file_type,
        df.file_extension,
        df.created_at
      FROM spatial_layers sl
      JOIN data_files df ON sl.source_file_id = df.file_id
      WHERE sl.project_id = $1 
        AND sl.deleted_at IS NULL
        AND df.deleted_at IS NULL
        AND (df.file_extension = '.geojson' OR df.file_extension = '.kml')
        AND df.file_type = 'potential_analysis'
        AND sl.processing_status = 'completed'
      ORDER BY sl.created_at DESC
    `, [projectId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: '沒有找到 GeoJSON 資料'
      });
    }

    const layers = result.rows.map(row => ({
      file_id: row.file_id,
      file_name: row.file_name,
      storage_path: row.storage_path,
      metadata: row.file_metadata,
      file_type: row.file_type,
      file_extension: row.file_extension,
      created_at: row.created_at,
      // 圖層相關資訊
      layer_id: row.layer_id,
      layer_name: row.layer_name,
      display_name: row.display_name,
      geometry_type: row.geometry_type,
      spatial_extent: row.spatial_extent,
      bounds: row.bbox_min_x && row.bbox_min_y && row.bbox_max_x && row.bbox_max_y ? 
        [[row.bbox_min_y, row.bbox_min_x], [row.bbox_max_y, row.bbox_max_x]] : null,
      feature_count: row.feature_count,
      layer_style: row.layer_style,
      opacity: row.opacity,
      visible: row.visible,
      z_index: row.z_index,
      processing_status: row.processing_status,
      layer_metadata: row.layer_metadata
    }));

    res.json({
      success: true,
      data: layers
    });
  } catch (error) {
    console.error('獲取 GeoJSON 列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取 GeoJSON 列表失敗'
    });
  }
};

// 獲取專案的特定 GeoJSON 資料
export const getProjectGeoJSON = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    const { fileId } = req.query; // 支持指定特定的文件 ID
    
    let query, params;
    
    if (fileId) {
      // 獲取特定的 GeoJSON 或 KML 文件，包含 SRID 信息
      query = `
        SELECT 
          df.file_id, 
          df.file_name, 
          df.storage_path, 
          df.metadata, 
          df.file_extension,
          sl.srid,
          sl.geometry_type,
          sl.bbox_min_x,
          sl.bbox_min_y,
          sl.bbox_max_x,
          sl.bbox_max_y
        FROM data_files df
        LEFT JOIN spatial_layers sl ON df.file_id = sl.source_file_id
        WHERE df.project_id = $1 
          AND df.file_id = $2
          AND (df.file_extension = '.geojson' OR df.file_extension = '.kml')
          AND df.deleted_at IS NULL
      `;
      params = [projectId, fileId];
    } else {
      // 獲取最新的 GeoJSON 或 KML 文件，包含 SRID 信息
      query = `
        SELECT 
          df.file_id, 
          df.file_name, 
          df.storage_path, 
          df.metadata, 
          df.file_extension,
          sl.srid,
          sl.geometry_type,
          sl.bbox_min_x,
          sl.bbox_min_y,
          sl.bbox_max_x,
          sl.bbox_max_y
        FROM data_files df
        LEFT JOIN spatial_layers sl ON df.file_id = sl.source_file_id
        WHERE df.project_id = $1 
          AND (df.file_extension = '.geojson' OR df.file_extension = '.kml')
          AND df.deleted_at IS NULL
        ORDER BY df.created_at DESC
        LIMIT 1
      `;
      params = [projectId];
    }
    
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: '沒有找到 GeoJSON 資料'
      });
    }

    // 讀取第一個 GeoJSON 檔案
    const { 
      file_id, 
      file_name, 
      storage_path, 
      metadata, 
      file_extension,
      srid,
      geometry_type,
      bbox_min_x,
      bbox_min_y,
      bbox_max_x,
      bbox_max_y
    } = result.rows[0];
    
    if (!fs.existsSync(storage_path)) {
      return res.status(404).json({
        success: false,
        message: 'GeoJSON 檔案已遺失'
      });
    }

    let responseData;
    if (file_extension === '.kml') {
      // 對於 KML 檔案，直接返回內容
      const fileContent = fs.readFileSync(storage_path, 'utf8');
      responseData = {
        file_id,
        file_name,
        metadata,
        kml: fileContent,
        storage_path: storage_path,
        file_type: 'kml',
        srid: srid || 4326,
        geometry_type: geometry_type,
        bbox: {
          minX: bbox_min_x,
          minY: bbox_min_y,
          maxX: bbox_max_x,
          maxY: bbox_max_y
        }
      };
    } else {
      // 對於 GeoJSON 檔案，解析 JSON
      const fileContent = fs.readFileSync(storage_path, 'utf8');
      const geojsonData = JSON.parse(fileContent);
      
      // 處理邊界框坐標轉換
      // 將資料庫的字串轉換為數字
      const minX = parseFloat(bbox_min_x);
      const minY = parseFloat(bbox_min_y);
      const maxX = parseFloat(bbox_max_x);
      const maxY = parseFloat(bbox_max_y);
      
      let bbox = {
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY
      };
      
      // 如果是 TWD97 坐標系統，將邊界框轉換為 WGS84
      if (srid === 3826 && !isNaN(minX) && !isNaN(minY) && !isNaN(maxX) && !isNaN(maxY)) {
        console.log('開始轉換 TWD97 邊界框為 WGS84');
        console.log('原始 TWD97 邊界框:', { minX, minY, maxX, maxY });
        
        try {
          // 定義 TWD97 坐標系統
          proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
          proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
          
          // 轉換邊界框的四個角點
          const minPoint = proj4('EPSG:3826', 'EPSG:4326', [minX, minY]);
          const maxPoint = proj4('EPSG:3826', 'EPSG:4326', [maxX, maxY]);
          
          console.log('轉換結果:', { minPoint, maxPoint });
          
          // 更新邊界框為 WGS84 坐標
          bbox = {
            minX: Math.min(minPoint[0], maxPoint[0]), // minLng
            minY: Math.min(minPoint[1], maxPoint[1]), // minLat
            maxX: Math.max(minPoint[0], maxPoint[0]), // maxLng
            maxY: Math.max(minPoint[1], maxPoint[1])  // maxLat
          };
          
          console.log('TWD97 邊界框轉換為 WGS84:', {
            original: { minX, minY, maxX, maxY },
            converted: bbox
          });
        } catch (error) {
          console.error('邊界框坐標轉換失敗:', error);
          console.error('錯誤詳情:', error.message);
          // 如果轉換失敗，保持原始邊界框
        }
      }
      
      responseData = {
        file_id,
        file_name,
        metadata,
        geojson: geojsonData,
        file_type: 'geojson',
        srid: srid || 4326,
        geometry_type: geometry_type,
        bbox: bbox
      };
    }
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('獲取 GeoJSON 資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取 GeoJSON 資料失敗',
    });
  }
};

// 關聯上傳到 GeoJSON feature
export const uploadToFeature = async (req, res) => {
  try {
    const { data_files_id, feature_id, upload_name, upload_description, feature_properties } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '沒有選擇檔案'
      });
    }

    // 驗證必要參數
    if (!data_files_id || !feature_id || !upload_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數：data_files_id, feature_id, upload_name'
      });
    }

    // 檢查 data_files 是否存在
    const dataFileCheck = await pool.query(
      'SELECT file_id FROM data_files WHERE file_id = $1 AND deleted_at IS NULL',
      [data_files_id]
    );

    if (dataFileCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到對應的資料檔案'
      });
    }

    // 檢測檔案類型
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uploadType = detectFeatureUploadType(file.mimetype, fileExtension);
    
    // 計算檔案雜湊值
    const fileHash = calculateFileHash(file.path);

    // 插入關聯上傳記錄
    const result = await pool.query(`
      INSERT INTO feature_uploads (
        data_files_id, feature_id, upload_name, upload_description, upload_type,
        file_name, original_name, file_extension, mime_type, file_size,
        storage_path, file_hash, feature_properties, upload_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      data_files_id,
      feature_id,
      upload_name,
      upload_description || null,
      uploadType,
      file.filename,
      file.originalname,
      fileExtension,
      file.mimetype,
      file.size,
      file.path,
      fileHash,
      feature_properties ? JSON.stringify(feature_properties) : null,
      JSON.stringify({
        uploaded_at: new Date().toISOString(),
        upload_source: 'feature_upload'
      })
    ]);

    res.json({
      success: true,
      message: '關聯上傳成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('關聯上傳錯誤:', error);
    res.status(500).json({
      success: false,
      message: '關聯上傳失敗',
    });
  }
};

// 獲取 feature 的關聯上傳資料
export const getFeatureUploads = async (req, res) => {
  try {
    const { dataFilesId, featureId } = req.params;

    const result = await pool.query(`
      SELECT 
        upload_id, upload_name, upload_description, upload_type,
        file_name, original_name, file_extension, mime_type, file_size,
        storage_path, feature_properties, upload_metadata, created_at
      FROM feature_uploads 
      WHERE data_files_id = $1 
        AND feature_id = $2 
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [dataFilesId, featureId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('獲取關聯上傳資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取關聯上傳資料失敗',
    });
  }
};

// 刪除關聯上傳資料
export const deleteFeatureUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;

    // 軟刪除
    const result = await pool.query(`
      UPDATE feature_uploads 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE upload_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [uploadId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到要刪除的關聯上傳資料'
      });
    }

    // 刪除實體檔案
    const uploadRecord = result.rows[0];
    if (fs.existsSync(uploadRecord.storage_path)) {
      fs.unlinkSync(uploadRecord.storage_path);
    }

    res.json({
      success: true,
      message: '關聯上傳資料已刪除'
    });

  } catch (error) {
    console.error('刪除關聯上傳資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除關聯上傳資料失敗',
    });
  }
};

// 檢測關聯上傳檔案類型
const detectFeatureUploadType = (mimeType, extension) => {
  const typeMap = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'application/pdf': 'document',
    'text/plain': 'document'
  };
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
    return 'image';
  }
  
  return typeMap[mimeType] || 'other';
};

// 獲取潛勢評估的區間設定
export const getPotentialAnalysisIntervals = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // 獲取檔案信息和區間設定
    const result = await pool.query(`
      SELECT file_id, file_name, file_type, metadata
      FROM data_files 
      WHERE file_id = $1 AND file_type = 'potential_analysis' AND deleted_at IS NULL
    `, [fileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '潛勢評估檔案不存在'
      });
    }

    const fileData = result.rows[0];
    const metadata = fileData.metadata || {};
    const analysisData = metadata.analysis_data || {};

    res.json({
      success: true,
      data: {
        file_id: fileId,
        file_name: fileData.file_name,
        intervals: analysisData.intervals || {},
        numericFields: analysisData.numericFields || [],
        fieldStats: analysisData.fieldStats || {}
      }
    });
  } catch (error) {
    console.error('獲取潛勢評估區間設定錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取區間設定失敗'
    });
  }
};

// 創建潛勢分析快照圖層
const createPotentialAnalysisSnapshot = async (originalFileId, projectId, dataName, dataDate, dataDescription, analysisData) => {
  try {
    console.log('開始創建潛勢分析快照:', originalFileId)
    
    // 讀取原始 GeoJSON 檔案
    const originalFileResult = await pool.query(`
      SELECT storage_path, metadata
      FROM data_files 
      WHERE file_id = $1
    `, [originalFileId])
    
    if (originalFileResult.rows.length === 0) {
      throw new Error('找不到原始檔案')
    }
    
    const originalFile = originalFileResult.rows[0]
    const fs = await import('fs')
    const path = await import('path')
    
    // 讀取原始 GeoJSON 內容
    const geojsonContent = fs.readFileSync(originalFile.storage_path, 'utf8')
    const geojsonData = JSON.parse(geojsonContent)
    
    // 計算邊界（用於 metadata）
    const bounds = calculateBounds(geojsonData.features)
    if (!bounds) {
      throw new Error('無法計算數據邊界')
    }
    
    // 創建 GeoJSON 快照（合併所有 features）
    const mergedGeojson = {
      type: 'FeatureCollection',
      features: geojsonData.features
    }
    
    // 保存 GeoJSON 快照檔案
    const snapshotFileName = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.geojson`
    const snapshotFilePath = path.join(process.cwd(), 'uploads', 'data', 'snapshots', 'geojson', snapshotFileName)
    
    // 確保目錄存在
    const uploadDir = path.dirname(snapshotFilePath)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    fs.writeFileSync(snapshotFilePath, JSON.stringify(mergedGeojson, null, 2))
    
    // 計算檔案雜湊
    const crypto = await import('crypto')
    const fileHash = crypto.createHash('sha256').update(JSON.stringify(mergedGeojson)).digest('hex')
    
    // 將快照圖層存儲到資料庫
    const snapshotResult = await pool.query(`
      INSERT INTO data_files (
        project_id, file_name, original_name, file_extension, file_type, mime_type,
        file_size, storage_path, file_hash, upload_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      projectId,
      `${dataName}_快照`,
      snapshotFileName,
      '.geojson',
      'potential_analysis_snapshot',
      'application/geo+json',
      fs.statSync(snapshotFilePath).size,
      snapshotFilePath,
      fileHash,
      dataDate,
      JSON.stringify({
        data_date: dataDate,
        data_description: `${dataDescription} - 快照圖層`,
        data_name: `${dataName}_快照`,
        data_type: 'potential_analysis_snapshot',
        original_file_id: originalFileId,
        analysis_data: analysisData,
        bounds: {
          minLat: bounds.minLat,
          maxLat: bounds.maxLat,
          minLng: bounds.minLng,
          maxLng: bounds.maxLng
        }
      })
    ])
    
    console.log('潛勢分析快照創建成功:', snapshotResult.rows[0].file_id)
    return snapshotResult.rows[0]
    
  } catch (error) {
    console.error('創建潛勢分析快照錯誤:', error)
    throw error
  }
}

// 計算 features 的邊界框
const calculateBounds = (features) => {
  if (features.length === 0) return null
  
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  
  features.forEach(feature => {
    const coords = extractCoordinates(feature.geometry)
    coords.forEach(coord => {
      const [lng, lat] = coord
      minLng = Math.min(minLng, lng)
      minLat = Math.min(minLat, lat)
      maxLng = Math.max(maxLng, lng)
      maxLat = Math.max(maxLat, lat)
    })
  })
  
  return {
    minLng, minLat, maxLng, maxLat,
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
    width: maxLng - minLng,
    height: maxLat - minLat
  }
}

// 從幾何形狀中提取所有座標
const extractCoordinates = (geometry) => {
  const coords = []
  
  switch (geometry.type) {
    case 'Point':
      coords.push(geometry.coordinates)
      break
    case 'LineString':
      coords.push(...geometry.coordinates)
      break
    case 'Polygon':
      geometry.coordinates.forEach(ring => coords.push(...ring))
      break
    case 'MultiPolygon':
      geometry.coordinates.forEach(polygon => 
        polygon.forEach(ring => coords.push(...ring))
      )
      break
  }
  
  return coords
}

// 創建簡化的矩形區域
const createSimplifiedRectangle = (bounds, index, totalIntervals) => {
  if (!bounds) return null
  
  // 添加一些偏移，讓多個區間不會完全重疊
  const offset = (bounds.width + bounds.height) * 0.02 // 2% 的偏移
  const offsetX = (index - (totalIntervals - 1) / 2) * offset
  const offsetY = (index - (totalIntervals - 1) / 2) * offset
  
  const minLng = bounds.minLng + offsetX
  const minLat = bounds.minLat + offsetY
  const maxLng = bounds.maxLng + offsetX
  const maxLat = bounds.maxLat + offsetY
  
  return {
    type: 'Polygon',
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]]
  }
}

// 合併多個 features 的幾何形狀（保留用於向後兼容）

// 創建優化的 GeoJSON 快照
const createOptimizedGeoJSON = (geojsonData, analysisData) => {
  const numericField = Object.keys(analysisData.intervals)[0]
  const intervals = analysisData.intervals[numericField]
  
  const optimizedFeatures = []
  
  // 為每個區間創建一個合併的 feature
  intervals.forEach((interval, index) => {
    const featuresInInterval = geojsonData.features.filter(feature => {
      const value = feature.properties[numericField]
      return typeof value === 'number' && value >= interval.min && value <= interval.max
    })
    
    if (featuresInInterval.length > 0) {
      // 合併所有 features 的幾何形狀
      const mergedGeometry = mergeFeatures(featuresInInterval)
      
      if (mergedGeometry) {
        optimizedFeatures.push({
          type: 'Feature',
          properties: {
            interval_index: index,
            min_value: interval.min,
            max_value: interval.max,
            color: interval.color,
            feature_count: featuresInInterval.length,
            numeric_field: numericField
          },
          geometry: mergedGeometry
        })
      }
    }
  })
  
  return {
    type: 'FeatureCollection',
    name: `${geojsonData.name || '潛勢分析快照'}`,
    description: '由潛勢分析生成的優化快照圖層',
    features: optimizedFeatures
  }
}


// 將 GeoJSON 轉換為 KML
const convertToKML = (geojsonData, analysisData) => {
  const numericField = Object.keys(analysisData.intervals)[0]
  const intervals = analysisData.intervals[numericField]
  
  // KML 文件頭
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${geojsonData.name || '潛勢分析快照'}</name>
    <description>由潛勢分析生成的快照圖層</description>
    
    <!-- 定義顏色樣式 -->
`
  
  // 為每個區間創建樣式
  intervals.forEach((interval, index) => {
    const color = interval.color.replace('#', '')
    // KML 使用 aabbggrr 格式的顏色（alpha, blue, green, red）
    const kmlColor = 'ff' + color.substring(4, 6) + color.substring(2, 4) + color.substring(0, 2)
    
    kml += `    <Style id="style${index}">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlColor}88</color>  <!-- 添加50%透明度 -->
      </PolyStyle>
    </Style>
`
  })
  
  // 添加 features（優化：合併同區間的所有 features）
  intervals.forEach((interval, index) => {
    const featuresInInterval = geojsonData.features.filter(feature => {
      const value = feature.properties[numericField]
      return typeof value === 'number' && value >= interval.min && value <= interval.max
    })
    
    if (featuresInInterval.length > 0) {
      // 合併所有 features 的座標
      const allCoordinates = []
      featuresInInterval.forEach(feature => {
        const coordinates = extractCoordinatesForKML(feature.geometry)
        if (coordinates) {
          allCoordinates.push(coordinates)
        }
      })
      
      if (allCoordinates.length > 0) {
        kml += `    <Placemark>
      <styleUrl>#style${index}</styleUrl>
      <name>區間 ${interval.min} - ${interval.max}</name>
      <description>包含 ${featuresInInterval.length} 個物件</description>
      <MultiGeometry>
`
        
        // 為每個 feature 創建一個 Polygon
        allCoordinates.forEach(coordinates => {
          kml += `        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordinates}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
`
        })
        
        kml += `      </MultiGeometry>
    </Placemark>
`
      }
    }
  })
  
  // 關閉 KML 文件
  kml += '  </Document>\n</kml>'
  
  return kml
}

// 從 GeoJSON 幾何形狀提取座標用於 KML
const extractCoordinatesForKML = (geometry) => {
  if (!geometry) return null
  
  let coordinates = []
  
  switch (geometry.type) {
    case 'Polygon':
      // 使用外環
      coordinates = geometry.coordinates[0]
      break
    case 'MultiPolygon':
      // 使用第一個多邊形的外環
      coordinates = geometry.coordinates[0][0]
      break
    case 'LineString':
      coordinates = geometry.coordinates
      break
    case 'Point':
      coordinates = [geometry.coordinates]
      break
  }
  
  // KML 格式：經度,緯度,高度（可選）
  return coordinates.map(coord => `${coord[0]},${coord[1]},0`).join(' ')
}

const mergeFeatures = (features) => {
  try {
    if (features.length === 0) return null
    
    // 如果是單個 feature，直接返回其幾何形狀
    if (features.length === 1) {
      return features[0].geometry
    }
    
    // 對於多個 features，創建一個包含所有幾何形狀的 MultiPolygon
    const coordinates = []
    
    features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        coordinates.push(feature.geometry.coordinates)
      } else if (feature.geometry.type === 'MultiPolygon') {
        coordinates.push(...feature.geometry.coordinates)
      } else if (feature.geometry.type === 'LineString') {
        // 將 LineString 轉換為 Polygon（添加起始點作為結束點）
        const coords = feature.geometry.coordinates
        if (coords.length > 2) {
          coords.push(coords[0]) // 閉合線條
          coordinates.push([coords])
        }
      }
    })
    
    if (coordinates.length === 0) return null
    
    return {
      type: coordinates.length === 1 ? 'Polygon' : 'MultiPolygon',
      coordinates: coordinates.length === 1 ? coordinates[0] : coordinates
    }
    
  } catch (error) {
    console.error('合併 features 錯誤:', error)
    return null
  }
}


export { upload, featureUpload, createPotentialAnalysisSnapshot };
