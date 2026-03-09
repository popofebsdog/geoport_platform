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

const BACKEND_ROOT = path.resolve(path.join(__dirname, '../../'));

function resolveStoragePath(storagePath) {
  if (!storagePath) return null;
  if (path.isAbsolute(storagePath)) return storagePath;
  return path.join(BACKEND_ROOT, storagePath);
}

/**
 * 增強版時序資料控制器
 * 功能：
 * 1. 上傳 CSV 檔案並記錄座標
 * 2. 解析 CSV 並配置 X/Y 軸
 * 3. 生成圖表配置
 * 4. 管理時序資料生命週期
 */

// 配置 multer 用於檔案上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/temporal');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 獲取檔案副檔名
    const ext = path.extname(file.originalname).toLowerCase();
    // 生成安全的檔案名：時間戳-隨機數.csv
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.shp', '.dbf', '.prj', '.shx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('僅支援 CSV 和 Shapefile 格式檔案。'), false);
    }
  }
});

// 上傳時序資料
const uploadTemporalData = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { projectId } = req.params;
    const { name, description, longitude, latitude, xAxisColumns = [], yAxisColumns = [], timeFormat = 'auto', chartType = 'line' } = req.body;
    
    // 解析 X 軸和 Y 軸欄位（可能是 JSON 字符串）
    const parsedXAxisColumns = Array.isArray(xAxisColumns) ? xAxisColumns : 
      (typeof xAxisColumns === 'string' ? JSON.parse(xAxisColumns || '[]') : []);
    const parsedYAxisColumns = Array.isArray(yAxisColumns) ? yAxisColumns : 
      (typeof yAxisColumns === 'string' ? JSON.parse(yAxisColumns || '[]') : []);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的 CSV 檔案'
      });
    }
    
    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
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
    
    const fileType = 'temporal_csv_enhanced';
    const hasSpatialData = true; // CSV 資料有手動輸入的座標
    
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
    
    // 2. 解析 CSV 檔案獲取可用欄位
    const availableColumns = await getCSVColumns(file.path); // use absolute path for immediate read
    
    // 3. 創建空間點
    const spatialExtent = `POINT(${longitude} ${latitude})`;
    
    // 4. 創建時序資料記錄
    const temporalId = uuidv4();
    
    // 構建圖表配置
    const chartConfig = {
      chartType: chartType || 'line',
      xAxisColumns: parsedXAxisColumns,
      yAxisColumns: parsedYAxisColumns,
      timeFormat: timeFormat || 'auto'
    };
    
    const temporalQuery = `
      INSERT INTO temporal_data_enhanced (
        temporal_id, project_id, source_file_id, name, description,
        data_type, longitude, latitude, spatial_extent,
        data_format, x_axis_columns, y_axis_columns, time_format,
        available_columns, chart_config, processing_status, processing_progress
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING temporal_id
    `;
    
    const temporalResult = await client.query(temporalQuery, [
      temporalId,
      projectId,
      fileId,
      name,
      description,
      'csv',
      longitude,
      latitude,
      spatialExtent,
      'csv',
      parsedXAxisColumns,
      parsedYAxisColumns,
      timeFormat,
      availableColumns,
      JSON.stringify(chartConfig),
      'completed',
      100
    ]);
    
    // 5. 解析 CSV 資料並生成圖表用的 JSON 資料
    const chartData = await parseCSVForCharting(file.path, parsedXAxisColumns, parsedYAxisColumns, timeFormat);
    
    // 6. 生成完整的資料解析 JSON
    const jsonData = {
      temporalId,
      projectId,
      name,
      description,
      dataType: 'csv',
      coordinates: { longitude, latitude },
      availableColumns,
      xAxisColumns: parsedXAxisColumns,
      yAxisColumns: parsedYAxisColumns,
      timeFormat,
      processingStatus: 'completed',
      uploadDate: new Date().toISOString(),
      sourceFile: {
        fileId,
        fileName: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        filePath: file.path
      },
      chartData // 包含解析後的圖表資料
    };
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        temporalId,
        fileId,
        name,
        description,
        coordinates: { longitude, latitude },
        availableColumns,
        xAxisColumns: parsedXAxisColumns,
        yAxisColumns: parsedYAxisColumns,
        timeFormat,
        processingStatus: 'completed',
        chartData // 包含解析後的圖表資料
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

// 獲取專案的時序資料列表
const getTemporalDataList = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const query = `
      SELECT 
        tde.*,
        df.file_name as source_file_name,
        df.original_name as original_file_name,
        df.file_size,
        df.upload_date
      FROM temporal_data_enhanced tde
      LEFT JOIN data_files df ON tde.source_file_id = df.file_id
      WHERE tde.project_id = $1 AND tde.deleted_at IS NULL
      ORDER BY tde.created_at DESC
    `;
    
    const result = await pool.query(query, [projectId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('獲取時序資料列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取時序資料列表失敗',
    });
  }
};

// 獲取時序資料詳情
const getTemporalDataById = async (req, res) => {
  try {
    const { temporalId } = req.params;
    
    const query = `
      SELECT 
        tde.*,
        df.file_name as source_file_name,
        df.original_name as original_file_name,
        df.file_size,
        df.upload_date,
        p.name as project_name
      FROM temporal_data_enhanced tde
      LEFT JOIN data_files df ON tde.source_file_id = df.file_id
      LEFT JOIN projects p ON tde.project_id = p.project_id
      WHERE tde.temporal_id = $1 AND tde.deleted_at IS NULL
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

// 更新時序資料
const updateTemporalData = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { temporalId } = req.params;
    const { name, description, xAxisColumns, yAxisColumns, timeFormat } = req.body;
    
    const updateQuery = `
      UPDATE temporal_data_enhanced 
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        x_axis_columns = COALESCE($4, x_axis_columns),
        y_axis_columns = COALESCE($5, y_axis_columns),
        time_format = COALESCE($6, time_format),
        updated_at = CURRENT_TIMESTAMP
      WHERE temporal_id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      temporalId,
      name,
      description,
      xAxisColumns,
      yAxisColumns,
      timeFormat
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新時序資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新時序資料失敗',
    });
  } finally {
    client.release();
  }
};

// 刪除時序資料
const deleteTemporalData = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { temporalId } = req.params;
    
    // 軟刪除時序資料
    const deleteQuery = `
      UPDATE temporal_data_enhanced 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE temporal_id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await client.query(deleteQuery, [temporalId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '時序資料已刪除'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('刪除時序資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除時序資料失敗',
    });
  } finally {
    client.release();
  }
};

// 解析 CSV 並生成圖表資料
const parseAndGenerateChart = async (req, res) => {
  try {
    const { temporalId } = req.params;
    
    // 獲取時序資料資訊
    const temporalQuery = `
      SELECT 
        tde.*,
        df.storage_path
      FROM temporal_data_enhanced tde
      LEFT JOIN data_files df ON tde.source_file_id = df.file_id
      WHERE tde.temporal_id = $1 AND tde.deleted_at IS NULL
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

    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '找不到原始檔案'
      });
    }

    // 解析 CSV 檔案
    const parsedData = await parseCSVFile(filePath, temporalData.x_axis_columns, temporalData.y_axis_columns, temporalData.time_format);

    // 生成圖表資料
    const chartData = generateChartData(parsedData, temporalData.x_axis_columns, temporalData.y_axis_columns);

    // 更新時序資料的圖表配置
    const updateQuery = `
      UPDATE temporal_data_enhanced 
      SET 
        chart_config = $2,
        total_records = $3,
        processing_status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE temporal_id = $1
      RETURNING *
    `;

    await pool.query(updateQuery, [
      temporalId,
      JSON.stringify(chartData),
      parsedData.length
    ]);

    res.json({
      success: true,
      data: {
        temporalId,
        temporalName: temporalData.name,
        coordinates: {
          longitude: temporalData.longitude,
          latitude: temporalData.latitude
        },
        chartData,
        metadata: {
          totalRecords: parsedData.length,
          xAxisColumns: temporalData.x_axis_columns,
          yAxisColumns: temporalData.y_axis_columns,
          timeFormat: temporalData.time_format,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('解析時序資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '解析時序資料失敗',
    });
  }
};

// 獲取 CSV 檔案的欄位名稱
const getCSVColumns = async (filePath) => {
  return new Promise((resolve, reject) => {
    const columns = [];
    let firstRow = true;
    let streamEnded = false;
    
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (firstRow && !streamEnded) {
          // 從第一行資料中獲取欄位名稱
          columns.push(...Object.keys(row));
          firstRow = false;
          streamEnded = true;
          // 停止讀取流
          stream.destroy();
          resolve(columns);
        }
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        if (!streamEnded) {
          resolve(columns);
        }
      });
  });
};

// 解析 CSV 檔案
const parseCSVFile = async (filePath, xAxisColumns, yAxisColumns, timeFormat) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const allColumns = [...new Set([...xAxisColumns, ...yAxisColumns])];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // 只提取需要的欄位
        const filteredRow = {};
        allColumns.forEach(column => {
          if (row[column] !== undefined) {
            filteredRow[column] = row[column];
          }
        });
        results.push(filteredRow);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// 生成圖表資料
const generateChartData = (parsedData, xAxisColumns, yAxisColumns) => {
  const chartData = {
    datasets: []
  };

  // 處理 X 軸資料
  const xAxisData = processXAxisData(parsedData, xAxisColumns);

  // 為每個 Y 軸欄位創建一個資料集
  yAxisColumns.forEach((yColumn, index) => {
    const yAxisData = parsedData.map(row => {
      const value = parseFloat(row[yColumn]);
      return isNaN(value) ? null : value;
    });

    // 過濾掉無效的資料點
    const validDataPoints = xAxisData.map((x, i) => ({
      x: x,
      y: yAxisData[i]
    })).filter(point => point.x !== null && point.y !== null);

    // 創建資料集
    const dataset = {
      label: yColumn,
      data: validDataPoints,
      borderColor: getColorByIndex(index),
      backgroundColor: getColorByIndex(index, 0.1),
      borderWidth: 2,
      fill: false,
      tension: 0.1
    };

    chartData.datasets.push(dataset);
  });

  return chartData;
};

// 處理 X 軸資料
const processXAxisData = (parsedData, xAxisColumns) => {
  if (xAxisColumns.length === 1) {
    // 單一 X 軸欄位
    return parsedData.map(row => {
      const value = row[xAxisColumns[0]];
      return processXAxisValue(value, xAxisColumns[0]);
    });
  } else {
    // 多個 X 軸欄位合併
    return parsedData.map(row => {
      const combinedValues = xAxisColumns.map(column => row[column]).filter(val => val !== undefined && val !== '');
      return combineXAxisValues(combinedValues, xAxisColumns);
    });
  }
};

// 處理單一 X 軸值
const processXAxisValue = (value, columnName) => {
  if (!value) return null;

  // 檢查是否為時間相關欄位
  if (isTimeColumn(columnName) || isDateColumn(columnName)) {
    return convertToISO8601(value);
  }

  // 嘗試轉換為數字
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    return numValue;
  }

  // 保持原始字串
  return value;
};

// 合併多個 X 軸值
const combineXAxisValues = (values, columnNames) => {
  if (values.length === 0) return null;

  // 檢查是否包含時間相關欄位
  const hasTimeColumns = columnNames.some(name => isTimeColumn(name) || isDateColumn(name));
  
  if (hasTimeColumns) {
    // 合併日期和時間
    return combineDateTime(values, columnNames);
  } else {
    // 合併其他類型的值
    return values.join(' ');
  }
};

// 合併日期和時間
const combineDateTime = (values, columnNames) => {
  let dateValue = '';
  let timeValue = '';

  columnNames.forEach((name, index) => {
    if (isDateColumn(name)) {
      dateValue = values[index] || '';
    } else if (isTimeColumn(name)) {
      timeValue = values[index] || '';
    }
  });

  // 合併日期和時間
  const combinedDateTime = `${dateValue} ${timeValue}`.trim();
  return convertToISO8601(combinedDateTime);
};

// 轉換為 ISO8601 格式
const convertToISO8601 = (dateTimeString) => {
  if (!dateTimeString) return null;

  try {
    // 嘗試多種日期格式
    const formats = [
      // 標準格式
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
      // 只有日期
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{4})\/(\d{2})\/(\d{2})$/,
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      // 只有時間
      /^(\d{2}):(\d{2}):(\d{2})$/
    ];

    for (const format of formats) {
      const match = dateTimeString.match(format);
      if (match) {
        let year, month, day, hour = '00', minute = '00', second = '00';

        if (format.source.includes('\\d{4}') && format.source.includes('\\d{2}')) {
          // 包含年份的格式
          if (match[1].length === 4) {
            year = match[1];
            month = match[2];
            day = match[3];
            if (match[4]) {
              hour = match[4];
              minute = match[5];
              second = match[6];
            }
          } else {
            // 美式日期格式 MM/DD/YYYY
            month = match[1];
            day = match[2];
            year = match[3];
            if (match[4]) {
              hour = match[4];
              minute = match[5];
              second = match[6];
            }
          }
        } else if (format.source.includes('\\d{2}:\\d{2}:\\d{2}')) {
          // 只有時間
          hour = match[1];
          minute = match[2];
          second = match[3];
          // 使用當前日期
          const now = new Date();
          year = now.getFullYear().toString();
          month = (now.getMonth() + 1).toString().padStart(2, '0');
          day = now.getDate().toString().padStart(2, '0');
        }

        // 確保月份和日期是兩位數
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');
        hour = hour.padStart(2, '0');
        minute = minute.padStart(2, '0');
        second = second.padStart(2, '0');

        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      }
    }

    // 如果都不匹配，嘗試使用 JavaScript Date 解析
    const date = new Date(dateTimeString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19); // 移除毫秒和時區
    }

    return dateTimeString; // 返回原始值
  } catch (error) {
    console.error('日期轉換失敗:', error);
    return dateTimeString;
  }
};

// 檢查是否為時間欄位
const isTimeColumn = (columnName) => {
  const timeKeywords = ['time', '時間', 'hour', '小時', 'minute', '分鐘', 'second', '秒'];
  const lowerName = columnName.toLowerCase();
  return timeKeywords.some(keyword => lowerName.includes(keyword));
};

// 檢查是否為日期欄位
const isDateColumn = (columnName) => {
  const dateKeywords = ['date', '日期', 'day', '天', 'year', '年', 'month', '月'];
  const lowerName = columnName.toLowerCase();
  return dateKeywords.some(keyword => lowerName.includes(keyword));
};

// 根據索引獲取顏色
const getColorByIndex = (index, alpha = 1) => {
  const colors = [
    `rgba(54, 162, 235, ${alpha})`,   // 藍色
    `rgba(255, 99, 132, ${alpha})`,   // 紅色
    `rgba(255, 205, 86, ${alpha})`,   // 黃色
    `rgba(75, 192, 192, ${alpha})`,   // 綠色
    `rgba(153, 102, 255, ${alpha})`,  // 紫色
    `rgba(255, 159, 64, ${alpha})`,   // 橙色
    `rgba(199, 199, 199, ${alpha})`,  // 灰色
    `rgba(83, 102, 255, ${alpha})`    // 靛藍色
  ];
  return colors[index % colors.length];
};

// 解析 CSV 資料用於圖表生成
const parseCSVForCharting = async (filePath, xAxisColumns, yAxisColumns, timeFormat) => {
  return new Promise((resolve, reject) => {
    const data = [];
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        data.push(row);
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        try {
          // 處理 X 軸資料
          let xAxisData = [];
          if (xAxisColumns.length === 1) {
            // 單一 X 軸欄位
            xAxisData = data.map(row => row[xAxisColumns[0]]);
          } else if (xAxisColumns.length > 1) {
            // 多個 X 軸欄位合併（如日期+時間）
            xAxisData = data.map(row => {
              const combinedValue = xAxisColumns.map(col => row[col]).join(' ');
              return convertToISO8601(combinedValue);
            });
          }
          
          // 處理 Y 軸資料
          const yAxisData = {};
          let nullCount = 0;
          let validCount = 0;
          let zeroCount = 0;
          
          yAxisColumns.forEach(yCol => {
            yAxisData[yCol] = data.map(row => {
              const rawValue = row[yCol];
              // 檢查是否為空值或無效值
              if (rawValue === undefined || rawValue === null || rawValue === '' || 
                  (typeof rawValue === 'string' && rawValue.trim() === '')) {
                nullCount++;
                return null;
              }
              const value = parseFloat(rawValue);
              // 返回有效的數值或 null
              if (isNaN(value) || !isFinite(value)) {
                nullCount++;
                return null;
              }
              if (value === 0) {
                zeroCount++;
              }
              validCount++;
              return value;
            });
          });
          
          console.log(`Y 軸數據統計 - 總數: ${data.length}, 有效值: ${validCount}, 0 值: ${zeroCount}, 空值: ${nullCount}`);
          
          // 生成圖表資料集
          const datasets = yAxisColumns.map((yCol, index) => ({
            name: yCol,
            data: yAxisData[yCol].map((value, i) => ({
              x: xAxisData[i],
              y: value
            })).filter(point => {
              // 過濾掉無效的資料點：
              // 1. X 軸必須存在
              // 2. Y 軸必須存在且不為 null
              // 3. Y 軸不為 0（過濾掉 0 值）
              return point.x && point.y !== null && point.y !== 0;
            })
          }));
          
          resolve({
            xAxis: {
              type: 'datetime',
              data: xAxisData.filter(x => x)
            },
            yAxis: yAxisColumns,
            datasets: datasets,
            totalRecords: data.length,
            processedRecords: datasets[0]?.data.length || 0
          });
        } catch (error) {
          reject(error);
        }
      });
  });
};

// 下載時序資料 JSON 檔案
const downloadTemporalDataJson = async (req, res) => {
  try {
    const { temporalId } = req.params;
    
    // 檢查 JSON 檔案是否存在
    const jsonFileName = `temporal_data_${temporalId}.json`;
    const jsonFilePath = path.join(__dirname, '../../uploads/temporal', jsonFileName);
    
    // 檢查檔案是否存在
    try {
      await fs.promises.access(jsonFilePath, fs.constants.F_OK);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'JSON 檔案不存在'
      });
    }
    
    // 設置響應頭
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${jsonFileName}"`);
    
    // 發送檔案
    res.sendFile(jsonFilePath);
    
  } catch (error) {
    console.error('下載 JSON 檔案失敗:', error);
    res.status(500).json({
      success: false,
      message: '下載 JSON 檔案失敗',
    });
  }
};

/**
 * 獲取圖表數據
 */
const getChartData = async (req, res) => {
  const { temporalId } = req.params;

  try {
    console.log('獲取圖表數據 - temporalId:', temporalId);

    // 獲取時序資料，並 JOIN data_files 表以獲取 storage_path
    const result = await pool.query(
      `SELECT 
        tde.*,
        df.storage_path,
        df.file_name as source_file_name
      FROM temporal_data_enhanced tde
      LEFT JOIN data_files df ON tde.source_file_id = df.file_id
      WHERE tde.temporal_id = $1 AND tde.deleted_at IS NULL`,
      [temporalId]
    );

    if (result.rows.length === 0) {
      console.log('時序資料不存在:', temporalId);
      return res.status(404).json({
        success: false,
        message: '時序資料不存在'
      });
    }

    const temporalData = result.rows[0];
    const resolvedFilePath = resolveStoragePath(temporalData.storage_path);
    console.log('時序資料:', {
      temporal_id: temporalData.temporal_id,
      name: temporalData.name,
      storage_path: temporalData.storage_path,
      x_axis_columns: temporalData.x_axis_columns,
      y_axis_columns: temporalData.y_axis_columns,
      chart_config: temporalData.chart_config,
      chart_config_type: typeof temporalData.chart_config
    });

    // 檢查是否配置了軸線
    if (!temporalData.x_axis_columns || temporalData.x_axis_columns.length === 0) {
      console.log('X 軸欄位未配置');
      return res.status(400).json({
        success: false,
        message: '此時序資料尚未配置 X 軸欄位，請先編輯資料並選擇 X 軸欄位'
      });
    }

    if (!temporalData.y_axis_columns || temporalData.y_axis_columns.length === 0) {
      console.log('Y 軸欄位未配置');
      return res.status(400).json({
        success: false,
        message: '此時序資料尚未配置 Y 軸欄位，請先編輯資料並選擇 Y 軸欄位'
      });
    }

    // 檢查是否有 CSV 文件
    if (!temporalData.storage_path) {
      console.log('storage_path 為空');
      return res.status(404).json({
        success: false,
        message: 'CSV 文件路徑不存在'
      });
    }

    if (!fs.existsSync(resolvedFilePath)) {
      console.log('CSV 文件不存在於文件系統:', resolvedFilePath);
      return res.status(404).json({
        success: false,
        message: `CSV 文件不存在: ${temporalData.storage_path}`
      });
    }

    console.log('開始解析 CSV 文件...');
    const csvData = await parseCSVForCharting(
      resolvedFilePath,
      temporalData.x_axis_columns,
      temporalData.y_axis_columns,
      temporalData.time_format || 'auto'
    );

    console.log('CSV 解析完成:', {
      totalRecords: csvData.totalRecords,
      processedRecords: csvData.processedRecords,
      datasetsCount: csvData.datasets?.length
    });

    res.json({
      success: true,
      data: {
        chartData: csvData,
        apexConfig: {
          xAxisColumns: temporalData.x_axis_columns,
          yAxisColumns: temporalData.y_axis_columns
        }
      }
    });

  } catch (error) {
    console.error('獲取圖表數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取圖表數據失敗',
    });
  }
};

export {
  upload,
  uploadTemporalData,
  getTemporalDataList,
  getTemporalDataById,
  updateTemporalData,
  deleteTemporalData,
  parseAndGenerateChart,
  downloadTemporalDataJson,
  getChartData
};
