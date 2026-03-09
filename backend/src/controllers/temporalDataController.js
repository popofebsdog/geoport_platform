import { pool } from '../config/database.js';
import path from 'path';
import fs, { promises as fsPromises } from 'fs';
import multer from 'multer';
import csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// 在 ES6 模組中獲取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend root = backend/ directory (two levels up from controllers/)
const BACKEND_ROOT = path.resolve(path.join(__dirname, '../../'));

// Resolve a storage_path (relative or legacy absolute) to an absolute fs path
function resolveStoragePath(storagePath) {
  if (!storagePath) return null;
  if (path.isAbsolute(storagePath)) return storagePath; // backward-compat with old records
  return path.join(BACKEND_ROOT, storagePath);
}

// 配置 multer 用於檔案上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/temporal');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.shp', '.dbf', '.prj', '.shx', '.geojson', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支援的檔案格式。請上傳 CSV、Shapefile 或 GeoJSON 檔案。'), false);
    }
  }
});

// 獲取專案的時序資料列表
const getTemporalDataList = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const query = `
      SELECT 
        td.*,
        df.file_name as source_file_name,
        df.file_size as source_file_size,
        df.upload_date as source_upload_date
      FROM temporal_data td
      LEFT JOIN data_files df ON td.source_file_id = df.file_id
      WHERE td.project_id = $1 AND td.deleted_at IS NULL
      ORDER BY td.created_at DESC
    `;
    
    const result = await pool.query(query, [projectId]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('獲取時序資料列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取時序資料列表失敗',
    });
  }
};

// 獲取單個時序資料詳情
const getTemporalDataById = async (req, res) => {
  try {
    const { temporalId } = req.params;
    
    const query = `
      SELECT 
        td.*,
        df.file_name as source_file_name,
        df.file_size as source_file_size,
        df.upload_date as source_upload_date,
        df.storage_path as source_storage_path
      FROM temporal_data td
      LEFT JOIN data_files df ON td.source_file_id = df.file_id
      WHERE td.temporal_id = $1 AND td.deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [temporalId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('獲取時序資料詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取時序資料詳情失敗',
    });
  }
};

// 上傳時序資料
const uploadTemporalData = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { projectId } = req.params;
    const { name, description, dataType, longitude, latitude } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的檔案'
      });
    }
    
    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const dataFormat = dataType === 'csv' ? 'csv' : 'shapefile';
    
    // 1. 先將檔案記錄到 data_files 表
    const fileId = uuidv4();
    const fileQuery = `
      INSERT INTO data_files (
        file_id, project_id, file_name, original_name, file_extension,
        file_type, file_size, storage_path, storage_type,
        has_spatial_data, upload_date, status, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING file_id
    `;
    
    const fileType = dataType === 'csv' ? 'temporal_csv' : 'temporal_shapefile';
    const hasSpatialData = dataType === 'csv' ? true : true; // 兩種格式都有空間資料
    
    const fileResult = await client.query(fileQuery, [
      fileId,
      projectId,
      file.filename,
      file.originalname,
      fileExtension,
      fileType,
      file.size,
      path.relative(BACKEND_ROOT, file.path), // store as relative path
      'local',
      hasSpatialData,
      new Date(),
      'active',
      'processing'
    ]);
    
    // 2. 獲取專案的時間範圍
    const projectQuery = 'SELECT start_date, end_date FROM projects WHERE project_id = $1';
    const projectResult = await client.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      throw new Error('找不到指定的專案');
    }
    
    const project = projectResult.rows[0];
    const startTime = project.start_date;
    const endTime = project.end_date;
    
    // 3. 分析檔案內容（僅 CSV 需要）
    let dataSchema = {};
    let totalRecords = 0;
    let timeSeriesCount = 0;
    let timeColumn = null;
    let valueColumns = [];
    let minValue = null;
    let maxValue = null;
    let avgValue = null;
    
    if (dataType === 'csv') {
      try {
        const analysis = await analyzeCsvFile(file.path);
        dataSchema = analysis.schema;
        totalRecords = analysis.totalRecords;
        timeSeriesCount = analysis.timeSeriesCount;
        timeColumn = analysis.timeColumn;
        valueColumns = analysis.valueColumns;
        minValue = analysis.minValue;
        maxValue = analysis.maxValue;
        avgValue = analysis.avgValue;
      } catch (analysisError) {
        console.error('CSV 檔案分析失敗:', analysisError);
        // 繼續處理，但標記為分析失敗
      }
    } else {
      // Shapefile 不需要 CSV 分析
      totalRecords = 0;
      timeSeriesCount = 0;
    }
    
    // 4. 創建空間範圍
    let spatialExtent = null;
    let featureCount = 0;
    
    if (dataType === 'csv' && longitude && latitude) {
      // CSV 資料使用手動輸入的座標
      spatialExtent = `POINT(${longitude} ${latitude})`;
      featureCount = 1; // 單點資料
    } else if (dataType === 'shapefile') {
      // Shapefile 資料，空間範圍將從檔案分析中獲取
      // 暫時設為 null，後續從檔案分析中更新
      spatialExtent = null;
      featureCount = 0;
    }
    
    // 5. 創建時序資料記錄
    const temporalId = uuidv4();
    const temporalQuery = `
      INSERT INTO temporal_data (
        temporal_id, project_id, source_file_id, name, description, data_type,
        start_time, end_time, data_format, total_records,
        time_series_count, has_spatial_data, srid, feature_count,
        data_schema, time_column, value_columns, location_columns,
        min_value, max_value, avg_value, processing_status, processing_progress,
        longitude, latitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING temporal_id
    `;
    
    // 根據資料類型設定位置欄位
    let locationColumns = [];
    if ((dataType === 'gnss' || dataType === 'rainfall' || dataType === 'earthquake') && longitude && latitude) {
      locationColumns = ['longitude', 'latitude']; // GNSS、雨量資料、地震資料手動輸入的座標欄位
    } else if (dataType === 'insar') {
      locationColumns = []; // InSAR 不需要手動座標
    }
    
    const temporalResult = await client.query(temporalQuery, [
      temporalId,
      projectId,
      fileId,
      name,
      description,
      dataType,
      startTime,
      endTime,
      dataFormat,
      totalRecords,
      timeSeriesCount,
      hasSpatialData,
      4326, // WGS84
      featureCount,
      JSON.stringify(dataSchema),
      timeColumn,
      valueColumns,
      locationColumns,
      minValue,
      maxValue,
      avgValue,
      'completed',
      100,
      longitude || null, // 經度
      latitude || null   // 緯度
    ]);
    
    // 4. 更新檔案處理狀態
    await client.query(
      'UPDATE data_files SET processing_status = $1 WHERE file_id = $2',
      ['completed', fileId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '時序資料上傳成功',
      data: {
        temporalId: temporalResult.rows[0].temporal_id,
        fileId: fileId,
        name: name,
        dataFormat: dataFormat,
        totalRecords: totalRecords,
        timeSeriesCount: timeSeriesCount
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('上傳時序資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '上傳時序資料失敗',
    });
  } finally {
    client.release();
  }
};

// 分析 CSV 檔案
const analyzeCsvFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const schema = {};
    let timeColumn = null;
    let valueColumns = [];
    let locationColumns = [];
    let minValue = null;
    let maxValue = null;
    let sumValue = 0;
    let valueCount = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
        
        // 分析第一行來確定結構
        if (results.length === 1) {
          const headers = Object.keys(data);
          
          // 尋找時間欄位
          for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('time') || lowerHeader.includes('date') || 
                lowerHeader.includes('時間') || lowerHeader.includes('日期')) {
              timeColumn = header;
              break;
            }
          }
          
          // 尋找數值欄位
          for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (!lowerHeader.includes('time') && !lowerHeader.includes('date') &&
                !lowerHeader.includes('時間') && !lowerHeader.includes('日期') &&
                !lowerHeader.includes('lat') && !lowerHeader.includes('lng') &&
                !lowerHeader.includes('lon') && !lowerHeader.includes('經度') &&
                !lowerHeader.includes('緯度') && !lowerHeader.includes('id')) {
              valueColumns.push(header);
            }
          }
          
          // 尋找位置欄位
          for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('lat') || lowerHeader.includes('lng') ||
                lowerHeader.includes('lon') || lowerHeader.includes('經度') ||
                lowerHeader.includes('緯度')) {
              locationColumns.push(header);
            }
          }
          
          // 建立 schema
          headers.forEach(header => {
            const value = data[header];
            if (value !== undefined && value !== null && value !== '') {
              schema[header] = typeof value === 'number' ? 'number' : 'string';
            }
          });
        }
        
        // 計算統計值
        valueColumns.forEach(col => {
          const value = parseFloat(data[col]);
          if (!isNaN(value)) {
            if (minValue === null || value < minValue) minValue = value;
            if (maxValue === null || value > maxValue) maxValue = value;
            sumValue += value;
            valueCount++;
          }
        });
      })
      .on('end', () => {
        const avgValue = valueCount > 0 ? sumValue / valueCount : null;
        
        resolve({
          schema,
          totalRecords: results.length,
          timeSeriesCount: valueColumns.length,
          timeColumn,
          valueColumns,
          locationColumns,
          minValue,
          maxValue,
          avgValue
        });
      })
      .on('error', reject);
  });
};

// 分析 GeoJSON 檔案
const analyzeGeoJsonFile = async (filePath) => {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const geojson = JSON.parse(fileContent);
  
  const schema = {};
  let timeColumn = null;
  let valueColumns = [];
  let locationColumns = ['longitude', 'latitude'];
  let minValue = null;
  let maxValue = null;
  let sumValue = 0;
  let valueCount = 0;
  
  if (geojson.features && geojson.features.length > 0) {
    const firstFeature = geojson.features[0];
    const properties = firstFeature.properties || {};
    
    // 分析屬性結構
    Object.keys(properties).forEach(key => {
      const value = properties[key];
      if (value !== undefined && value !== null && value !== '') {
        schema[key] = typeof value === 'number' ? 'number' : 'string';
        
        // 尋找時間欄位
        const lowerKey = key.toLowerCase();
        if (!timeColumn && (lowerKey.includes('time') || lowerKey.includes('date') ||
            lowerKey.includes('時間') || lowerKey.includes('日期'))) {
          timeColumn = key;
        }
        
        // 尋找數值欄位
        if (typeof value === 'number' && !lowerKey.includes('lat') && 
            !lowerKey.includes('lng') && !lowerKey.includes('lon') &&
            !lowerKey.includes('經度') && !lowerKey.includes('緯度') &&
            !lowerKey.includes('id')) {
          valueColumns.push(key);
        }
      }
    });
    
    // 計算統計值
    geojson.features.forEach(feature => {
      const properties = feature.properties || {};
      valueColumns.forEach(col => {
        const value = parseFloat(properties[col]);
        if (!isNaN(value)) {
          if (minValue === null || value < minValue) minValue = value;
          if (maxValue === null || value > maxValue) maxValue = value;
          sumValue += value;
          valueCount++;
        }
      });
    });
  }
  
  const avgValue = valueCount > 0 ? sumValue / valueCount : null;
  
  // 計算空間範圍
  let spatialExtent = null;
  if (geojson.features && geojson.features.length > 0) {
    // 這裡可以添加空間範圍計算邏輯
    // 暫時設為 null，實際應用中需要計算 bounding box
  }
  
  return {
    schema,
    totalRecords: geojson.features ? geojson.features.length : 0,
    timeSeriesCount: valueColumns.length,
    featureCount: geojson.features ? geojson.features.length : 0,
    spatialExtent,
    timeColumn,
    valueColumns,
    locationColumns,
    minValue,
    maxValue,
    avgValue
  };
};

// 獲取時序資料的圖表數據
const getTemporalDataChart = async (req, res) => {
  try {
    const { temporalId } = req.params;
    const { startTime, endTime, columns } = req.query;
    
    // 獲取時序資料資訊
    const temporalQuery = `
      SELECT td.*, df.storage_path
      FROM temporal_data td
      LEFT JOIN data_files df ON td.source_file_id = df.file_id
      WHERE td.temporal_id = $1 AND td.deleted_at IS NULL
    `;
    
    const temporalResult = await pool.query(temporalQuery, [temporalId]);
    
    if (temporalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }
    
    const temporalData = temporalResult.rows[0];
    const filePath = resolveStoragePath(temporalData.storage_path);
    
    if (!filePath || !await fsPromises.access(filePath).then(() => true).catch(() => false)) {
      return res.status(404).json({
        success: false,
        message: '找不到資料檔案'
      });
    }
    
    // 根據檔案格式讀取數據
    let chartData = [];
    
    if (temporalData.data_format === 'csv') {
      chartData = await readCsvChartData(filePath, {
        timeColumn: temporalData.time_column,
        valueColumns: temporalData.value_columns,
        startTime,
        endTime,
        selectedColumns: columns ? columns.split(',') : null
      });
    } else if (temporalData.data_format === 'geojson') {
      chartData = await readGeoJsonChartData(filePath, {
        timeColumn: temporalData.time_column,
        valueColumns: temporalData.value_columns,
        startTime,
        endTime,
        selectedColumns: columns ? columns.split(',') : null
      });
    }
    
    res.json({
      success: true,
      data: {
        temporalId: temporalId,
        name: temporalData.name,
        dataType: temporalData.data_type,
        dataFormat: temporalData.data_format,
        chartData: chartData,
        timeColumn: temporalData.time_column,
        valueColumns: temporalData.value_columns,
        chartConfig: temporalData.chart_config
      }
    });
    
  } catch (error) {
    console.error('獲取時序資料圖表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取時序資料圖表失敗',
    });
  }
};

// 讀取 CSV 圖表數據
const readCsvChartData = async (filePath, options) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    console.log('開始讀取 CSV 圖表數據:', filePath);
    console.log('選項:', options);
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // 組合日期和時間
        let combinedTime;
        if (data['日期'] && data['時間']) {
          // 處理 "3/1/25" 格式的日期
          const dateStr = data['日期'];
          const timeStr = data['時間'];
          
          // 將 "3/1/25" 轉換為 "2025-03-01"
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
            const formattedDate = `${year}-${month}-${day}`;
            combinedTime = `${formattedDate}T${timeStr}`;
          } else {
            combinedTime = `${dateStr}T${timeStr}`;
          }
        } else if (data[options.timeColumn]) {
          combinedTime = data[options.timeColumn];
        } else {
          return; // 跳過沒有時間數據的行
        }
        
        // 時間過濾
        if (options.startTime && combinedTime < options.startTime) return;
        if (options.endTime && combinedTime > options.endTime) return;
        
        const row = {
          time: combinedTime,
          values: {}
        };
        
        // 處理數值列
        const columnsToProcess = options.selectedColumns || options.valueColumns || [];
        console.log('處理的列:', columnsToProcess);
        
        columnsToProcess.forEach(col => {
          if (data[col] !== undefined && data[col] !== null && data[col] !== '') {
            const value = parseFloat(data[col]);
            if (!isNaN(value)) {
              row.values[col] = value;
            }
          }
        });
        
        // 如果沒有指定列，處理所有數值列
        if (columnsToProcess.length === 0) {
          Object.keys(data).forEach(key => {
            if (key !== '日期' && key !== '時間' && data[key] !== undefined && data[key] !== null && data[key] !== '') {
              const value = parseFloat(data[key]);
              if (!isNaN(value)) {
                row.values[key] = value;
              }
            }
          });
        }
        
        results.push(row);
      })
      .on('end', () => {
        console.log('CSV 讀取完成，總行數:', results.length);
        console.log('前3行結果:', results.slice(0, 3));
        resolve(results);
      })
      .on('error', (error) => {
        console.error('CSV 讀取錯誤:', error);
        reject(error);
      });
  });
};

// 讀取 GeoJSON 圖表數據
const readGeoJsonChartData = async (filePath, options) => {
  const fileContent = await fsPromises.readFile(filePath, 'utf8');
  const geojson = JSON.parse(fileContent);
  
  const results = [];
  
  if (geojson.features) {
    geojson.features.forEach(feature => {
      const properties = feature.properties || {};
      
      // 時間過濾
      if (options.startTime && properties[options.timeColumn] < options.startTime) return;
      if (options.endTime && properties[options.timeColumn] > options.endTime) return;
      
      const row = {
        time: properties[options.timeColumn],
        values: {},
        geometry: feature.geometry
      };
      
      const columnsToProcess = options.selectedColumns || options.valueColumns;
      columnsToProcess.forEach(col => {
        const value = parseFloat(properties[col]);
        if (!isNaN(value)) {
          row.values[col] = value;
        }
      });
      
      results.push(row);
    });
  }
  
  return results;
};

// 更新時序資料
const updateTemporalData = async (req, res) => {
  try {
    const { temporalId } = req.params;
    const { name, description, chartConfig, visible } = req.body;
    
    const query = `
      UPDATE temporal_data 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        chart_config = COALESCE($3, chart_config),
        updated_at = CURRENT_TIMESTAMP
      WHERE temporal_id = $4 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name,
      description,
      chartConfig ? JSON.stringify(chartConfig) : null,
      temporalId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }
    
    res.json({
      success: true,
      message: '時序資料更新成功',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('更新時序資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新時序資料失敗',
    });
  }
};

// 刪除時序資料
const deleteTemporalData = async (req, res) => {
  try {
    const { temporalId } = req.params;
    
    const query = `
      UPDATE temporal_data 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE temporal_id = $1 AND deleted_at IS NULL
      RETURNING temporal_id
    `;
    
    const result = await pool.query(query, [temporalId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }
    
    res.json({
      success: true,
      message: '時序資料刪除成功'
    });
    
  } catch (error) {
    console.error('刪除時序資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除時序資料失敗',
    });
  }
};

export {
  upload,
  getTemporalDataList,
  getTemporalDataById,
  uploadTemporalData,
  getTemporalDataChart,
  updateTemporalData,
  deleteTemporalData
};
