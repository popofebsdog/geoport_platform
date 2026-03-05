import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 在 ES6 模組中獲取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 時序資料圖表生成控制器
 * 功能：
 * 1. 根據解析的資料生成 ApexCharts 配置
 * 2. 自動調整 X/Y 軸區間
 * 3. 支援多個 Y 軸資料集
 * 4. 輸出美觀的 ApexCharts 配置 JSON
 */

// 生成 ApexCharts 配置
const generateApexChartConfig = async (req, res) => {
  try {
    const { temporalId } = req.params;
    const { 
      chartType = 'line',
      title = '',
      xAxisLabel = '',
      yAxisLabel = '',
      showLegend = true,
      showGrid = true,
      theme = 'light'
    } = req.body;

    // 獲取時序資料的圖表資料
    const chartData = await getTemporalChartData(temporalId);
    
    if (!chartData) {
      return res.status(404).json({
        success: false,
        message: '找不到圖表資料'
      });
    }

    // 生成 ApexCharts 配置
    const apexConfig = generateApexConfig({
      data: chartData,
      chartType,
      title,
      xAxisLabel,
      yAxisLabel,
      showLegend,
      showGrid,
      theme
    });

    res.json({
      success: true,
      data: {
        temporalId,
        apexConfig,
        metadata: {
          chartType,
          datasetsCount: chartData.datasets.length,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('生成 ApexCharts 配置失敗:', error);
    res.status(500).json({
      success: false,
      message: '生成 ApexCharts 配置失敗',
      error: error.message
    });
  }
};


// 獲取時序資料的圖表資料
const getTemporalChartData = async (temporalId) => {
  try {
    // 從資料庫獲取時序資料的圖表配置
    const query = `
      SELECT 
        td.name,
        td.chart_config,
        td.data_schema,
        td.value_columns as x_axis_columns,
        td.value_columns as y_axis_columns
      FROM temporal_data td
      WHERE td.temporal_id = $1 AND td.deleted_at IS NULL
    `;

    const result = await pool.query(query, [temporalId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const temporalData = result.rows[0];
    
    // 如果沒有圖表配置，返回 null
    if (!temporalData.chart_config) {
      return null;
    }

    return temporalData.chart_config;
  } catch (error) {
    console.error('獲取圖表資料失敗:', error);
    return null;
  }
};

// 生成 ApexCharts 配置對象
const generateApexConfig = ({ data, chartType, title, xAxisLabel, yAxisLabel, showLegend, showGrid, theme }) => {
  // 計算資料範圍
  const dataRange = calculateDataRange(data);
  
  // 轉換資料格式為 ApexCharts 格式
  const series = data.datasets.map(dataset => ({
    name: dataset.label,
    data: dataset.data.map(point => ({
      x: point.x,
      y: point.y
    })),
    type: chartType === 'line' ? 'line' : 'column'
  }));

  const config = {
    chart: {
      type: chartType === 'line' ? 'line' : 'bar',
      height: 400,
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    series: series,
    xaxis: {
      type: dataRange.x.isTime ? 'datetime' : 'category',
      title: {
        text: xAxisLabel,
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          color: theme === 'dark' ? '#ffffff' : '#374151'
        }
      },
      labels: {
        style: {
          colors: theme === 'dark' ? '#ffffff' : '#374151'
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM yyyy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      },
      grid: {
        show: showGrid,
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
      }
    },
    yaxis: {
      title: {
        text: yAxisLabel,
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          color: theme === 'dark' ? '#ffffff' : '#374151'
        }
      },
      labels: {
        style: {
          colors: theme === 'dark' ? '#ffffff' : '#374151'
        }
      },
      grid: {
        show: showGrid,
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
      }
    },
    title: {
      text: title,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: theme === 'dark' ? '#ffffff' : '#111827'
      }
    },
    legend: {
      show: showLegend,
      position: 'top',
      horizontalAlign: 'center',
      labels: {
        colors: theme === 'dark' ? '#ffffff' : '#374151'
      }
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      x: {
        format: dataRange.x.isTime ? 'dd MMM yyyy HH:mm' : undefined
      },
      style: {
        fontSize: '12px'
      }
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: chartType === 'line' ? 'gradient' : 'solid',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.25,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    colors: [
      '#3b82f6', // 藍色
      '#ef4444', // 紅色
      '#10b981', // 綠色
      '#f59e0b', // 黃色
      '#8b5cf6', // 紫色
      '#06b6d4', // 青色
      '#84cc16', // 青綠色
      '#f97316'  // 橙色
    ],
    grid: {
      show: showGrid,
      borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
      strokeDashArray: 4
    },
    theme: {
      mode: theme
    }
  };

  return config;
};

// 計算資料範圍
const calculateDataRange = (data) => {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let isTimeData = false;

  data.datasets.forEach(dataset => {
    dataset.data.forEach(point => {
      // X 軸範圍
      if (point.x !== null && point.x !== undefined) {
        if (typeof point.x === 'string' && point.x.includes('T')) {
          // 時間資料
          const timeValue = new Date(point.x).getTime();
          if (!isNaN(timeValue)) {
            xMin = Math.min(xMin, timeValue);
            xMax = Math.max(xMax, timeValue);
            isTimeData = true;
          }
        } else if (typeof point.x === 'number') {
          // 數值資料
          xMin = Math.min(xMin, point.x);
          xMax = Math.max(xMax, point.x);
        }
      }

      // Y 軸範圍
      if (point.y !== null && point.y !== undefined && typeof point.y === 'number') {
        yMin = Math.min(yMin, point.y);
        yMax = Math.max(yMax, point.y);
      }
    });
  });

  // 添加邊距
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const xMargin = xRange * 0.05; // 5% 邊距
  const yMargin = yRange * 0.1;  // 10% 邊距

  return {
    x: {
      min: xMin === Infinity ? 0 : xMin - xMargin,
      max: xMax === -Infinity ? 100 : xMax + xMargin,
      isTime: isTimeData
    },
    y: {
      min: yMin === Infinity ? 0 : yMin - yMargin,
      max: yMax === -Infinity ? 100 : yMax + yMargin
    }
  };
};


// 獲取圖表預覽資訊
const getChartPreview = async (req, res) => {
  try {
    const { temporalId } = req.params;

    // 獲取時序資料資訊
    const query = `
      SELECT 
        td.name,
        td.description,
        td.chart_config,
        td.data_schema,
        td.value_columns as x_axis_columns,
        td.value_columns as y_axis_columns,
        td.total_records,
        td.created_at
      FROM temporal_data td
      WHERE td.temporal_id = $1 AND td.deleted_at IS NULL
    `;

    const result = await pool.query(query, [temporalId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的時序資料'
      });
    }

    const temporalData = result.rows[0];
    
    // 計算資料範圍
    let dataRange = null;
    if (temporalData.chart_config) {
      dataRange = calculateDataRange(temporalData.chart_config);
    }

    res.json({
      success: true,
      data: {
        temporalId,
        name: temporalData.name,
        description: temporalData.description,
        hasChartConfig: !!temporalData.chart_config,
        datasetsCount: temporalData.chart_config?.datasets?.length || 0,
        totalRecords: temporalData.total_records,
        dataRange,
        xAxisColumns: temporalData.x_axis_columns,
        yAxisColumns: temporalData.y_axis_columns,
        createdAt: temporalData.created_at
      }
    });

  } catch (error) {
    console.error('獲取圖表預覽失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取圖表預覽失敗',
      error: error.message
    });
  }
};

export {
  generateApexChartConfig,
  getChartPreview
};
