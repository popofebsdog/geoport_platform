import { pool } from '../config/database.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

/**
 * 時序資料解析和輸出控制器
 * 功能：
 * 1. 解析 CSV 檔案並提取 X/Y 軸資料
 * 2. 合併多個 X 軸欄位（如日期+時間）
 * 3. 轉換時間格式為 ISO8601
 * 4. 輸出適合作圖的 JSON 格式
 */

// 解析 CSV 檔案並提取指定欄位
const parseCSVForCharting = async (req, res) => {
  try {
    const { temporalId } = req.params;
    const { xAxisColumns, yAxisColumns, timeFormat = 'auto' } = req.body;

    // 驗證參數
    if (!xAxisColumns || !Array.isArray(xAxisColumns) || xAxisColumns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'X 軸欄位不能為空'
      });
    }

    if (!yAxisColumns || !Array.isArray(yAxisColumns) || yAxisColumns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Y 軸欄位不能為空'
      });
    }

    // 獲取時序資料資訊
    const temporalQuery = `
      SELECT 
        td.*,
        df.storage_path,
        df.original_name
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
    const filePath = temporalData.storage_path;

    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '找不到原始檔案'
      });
    }

    // 解析 CSV 檔案
    const parsedData = await parseCSVFile(filePath, xAxisColumns, yAxisColumns, timeFormat);

    // 生成圖表資料
    const chartData = generateChartData(parsedData, xAxisColumns, yAxisColumns);

    res.json({
      success: true,
      data: {
        temporalId,
        temporalName: temporalData.name,
        chartData,
        metadata: {
          totalRecords: parsedData.length,
          xAxisColumns,
          yAxisColumns,
          timeFormat,
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

// 獲取時序資料的可用欄位
const getAvailableColumns = async (req, res) => {
  try {
    const { temporalId } = req.params;

    // 獲取時序資料資訊
    const temporalQuery = `
      SELECT 
        td.*,
        df.storage_path
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
    const filePath = temporalData.storage_path;

    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '找不到原始檔案'
      });
    }

    // 讀取 CSV 標題行
    const columns = await getCSVColumns(filePath);

    res.json({
      success: true,
      data: {
        temporalId,
        columns,
        totalColumns: columns.length
      }
    });

  } catch (error) {
    console.error('獲取可用欄位失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取可用欄位失敗',
    });
  }
};

// 獲取 CSV 檔案的欄位名稱
const getCSVColumns = async (filePath) => {
  return new Promise((resolve, reject) => {
    const columns = [];
    let firstRow = true;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (firstRow) {
          // 從第一行資料中獲取欄位名稱
          columns.push(...Object.keys(row));
          firstRow = false;
        }
        // 只讀取第一行就停止
        resolve(columns);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

export {
  parseCSVForCharting,
  getAvailableColumns
};
