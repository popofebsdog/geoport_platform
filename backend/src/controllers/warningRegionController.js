import { pool } from '../config/database.js';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { validateUUID } from '../utils/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 將里程數轉換為標準格式
 * 例如：22.5K -> 022K+500, 22.0K -> 022K+000, 17.07-17.2K -> 017K+070 (取起始值)
 * @param {string} mileage - 原始里程數
 * @returns {string} - 標準格式里程數
 */
function convertMileageToStandardFormat(mileage) {
  if (!mileage || typeof mileage !== 'string') {
    return mileage;
  }
  
  const trimmed = mileage.trim();
  
  // 如果已經是標準格式（例如：022K+500），直接返回
  if (trimmed.match(/^\d{3}K\+\d{3}$/)) {
    return trimmed;
  }
  
  // 處理範圍格式（例如：17.07-17.2K），取起始值
  const rangeMatch = trimmed.match(/(\d+\.?\d*)-(\d+\.?\d*)K/);
  if (rangeMatch) {
    const startValue = parseFloat(rangeMatch[1]);
    return convertDecimalToStandard(startValue);
  }
  
  // 處理小數格式（例如：22.5K, 17.3K）
  const decimalMatch = trimmed.match(/(\d+)\.(\d+)K/);
  if (decimalMatch) {
    const km = parseInt(decimalMatch[1]);
    const decimal = parseFloat('0.' + decimalMatch[2]);
    return convertDecimalToStandard(km + decimal);
  }
  
  // 處理整數格式（例如：22K, 17K）
  const intMatch = trimmed.match(/(\d+)K/);
  if (intMatch) {
    const km = parseInt(intMatch[1]);
    return convertDecimalToStandard(km);
  }
  
  // 如果無法解析，返回原始值
  return trimmed;
}

/**
 * 將小數公里數轉換為標準格式
 * 例如：22.5 -> 022K+500, 22.0 -> 022K+000
 * @param {number} value - 公里數（可以是小數）
 * @returns {string} - 標準格式（三位數K+三位數米）
 */
function convertDecimalToStandard(value) {
  const km = Math.floor(value);
  const decimal = value - km;
  const meter = Math.round(decimal * 1000);
  
  // 格式化為三位數公里數 + K + 三位數米數
  const kmStr = String(km).padStart(3, '0');
  const meterStr = String(meter).padStart(3, '0');
  
  return `${kmStr}K+${meterStr}`;
}

/**
 * 獲取所有預警地區列表
 */
async function getWarningRegions(req, res) {
  try {
    const query = `
      SELECT 
        region_id,
        region_name,
        region_code,
        description,
        ST_X(location_geometry) as longitude,
        ST_Y(location_geometry) as latitude,
        zoom_level,
        api_config,
        is_active,
        status,
        created_at,
        updated_at
      FROM warning_regions
      WHERE deleted_at IS NULL
      ORDER BY region_name ASC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取預警地區列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預警地區列表失敗',
    });
  }
}

/**
 * 根據地區代碼獲取地區資訊
 */
async function getWarningRegionByCode(req, res) {
  try {
    const { regionCode } = req.params;
    
    const query = `
      SELECT 
        region_id,
        region_name,
        region_code,
        description,
        ST_X(location_geometry) as longitude,
        ST_Y(location_geometry) as latitude,
        zoom_level,
        api_config,
        is_active,
        status,
        created_at,
        updated_at
      FROM warning_regions
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [regionCode]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('獲取預警地區資訊失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預警地區資訊失敗',
    });
  }
}

/**
 * 獲取指定地區的數據
 * 支持從外部API獲取實時數據（微地動、降雨、強地動）
 */
async function getWarningRegionData(req, res) {
  try {
    const { regionCode } = req.params;
    const { dataType, limit = 100, useExternalApi = 'false' } = req.query;
    
    // 先獲取地區資訊和API配置
    const regionQuery = `
      SELECT region_id, api_config FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    const apiConfig = regionResult.rows[0].api_config || {};
    
    // 如果請求使用外部API，則從外部API獲取數據
    if (useExternalApi === 'true' && dataType) {
      return await getExternalApiData(regionCode, dataType, apiConfig, req, res);
    }
    
    // 否則從數據庫獲取已儲存的數據
    let query = `
      SELECT 
        data_id,
        region_id,
        data_type,
        data_category,
        data_content,
        data_metadata,
        data_timestamp,
        collected_at,
        is_valid,
        status,
        created_at,
        updated_at
      FROM warning_region_data
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    
    const params = [regionId];
    let paramIndex = 2;
    
    if (dataType) {
      query += ` AND data_type = $${paramIndex}`;
      params.push(dataType);
      paramIndex++;
    }
    
    query += ` ORDER BY data_timestamp DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // 解析JSON數據
    const processedRows = result.rows.map(row => {
      if (row.data_content && typeof row.data_content === 'string') {
        try {
          row.data_content = JSON.parse(row.data_content);
        } catch (e) {
          console.warn('解析 data_content 失敗:', e);
        }
      }
      if (row.data_metadata && typeof row.data_metadata === 'string') {
        try {
          row.data_metadata = JSON.parse(row.data_metadata);
        } catch (e) {
          console.warn('解析 data_metadata 失敗:', e);
        }
      }
      return row;
    });
    
    res.json({
      success: true,
      data: processedRows
    });
  } catch (error) {
    console.error('獲取預警地區數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預警地區數據失敗',
    });
  }
}

/**
 * 從外部API獲取數據
 */
async function getExternalApiData(regionCode, dataType, apiConfig, req, res) {
  try {
    const { MicroseismicApiService, RainfallEarthquakeApiService } = await import('../services/externalApiService.js');
    const now = new Date();
    
    // 從 apiConfig 中提取各類型的 endpoint
    // 確保正確處理 null、undefined、空字符串的情況
    const microseismicEndpoint = (apiConfig?.microseismic?.endpoint && typeof apiConfig.microseismic.endpoint === 'string') 
      ? apiConfig.microseismic.endpoint.trim() 
      : '';
    const rainfallEndpoint = (apiConfig?.rainfall?.endpoint && typeof apiConfig.rainfall.endpoint === 'string')
      ? apiConfig.rainfall.endpoint.trim()
      : '';
    const earthquakeEndpoint = (apiConfig?.earthquake?.endpoint && typeof apiConfig.earthquake.endpoint === 'string')
      ? apiConfig.earthquake.endpoint.trim()
      : '';
    
    // 判斷是否為台7線項目（使用默認API）
    const isTaiwan7 = regionCode === '台7線' || regionCode === 'taiwan7';
    
    // 調試：輸出配置信息
    console.log(`[${regionCode}] API配置檢查:`, {
      isTaiwan7,
      microseismicEndpoint: microseismicEndpoint || '(空)',
      rainfallEndpoint: rainfallEndpoint || '(空)',
      earthquakeEndpoint: earthquakeEndpoint || '(空)',
      dataType
    });
    
    // 根據數據類型確定要使用的 endpoint
    let endpointToUse = null;
    let hasConfiguredEndpoint = false;
    
    if (dataType === 'chart1' || dataType === 'microseismic') {
      hasConfiguredEndpoint = !!microseismicEndpoint && microseismicEndpoint.length > 0;
      endpointToUse = microseismicEndpoint;
    } else if (dataType === 'chart2' || dataType === 'rainfall') {
      hasConfiguredEndpoint = !!rainfallEndpoint && rainfallEndpoint.length > 0;
      endpointToUse = rainfallEndpoint;
    } else if (dataType === 'chart3' || dataType === 'earthquake' || dataType === 'strong_motion') {
      hasConfiguredEndpoint = !!earthquakeEndpoint && earthquakeEndpoint.length > 0;
      endpointToUse = earthquakeEndpoint;
    }
    
    // 如果不是台7線且沒有配置 endpoint，返回空數據
    if (!isTaiwan7 && !hasConfiguredEndpoint) {
      console.log(`[${regionCode}] 非台7線項目且未配置 ${dataType} 的API端點，返回空數據`);
      
      // 根據數據類型返回空數據結構
      let emptyResult = {
        dataType: dataType,
        timestamp: now.toISOString(),
        time_series: [],
        values: [],
        updateInterval: 600,
        dataDensity: 'none'
      };
      
      if (dataType === 'chart1' || dataType === 'microseismic') {
        emptyResult.warningFlags = { warnings: [], alerts: [] };
        emptyResult.catalog = { records: [], count: 0 };
        emptyResult.latest_value = null;
        emptyResult.average = 0;
      } else if (dataType === 'chart2' || dataType === 'rainfall') {
        emptyResult.timeSeries = [];
        emptyResult.statistics = { max: 0, min: 0, average: 0, total: 0 };
        emptyResult.latest = { hourly: 0, accumulated: 0 };
        emptyResult.accumulated = 0;
        emptyResult.hourly = 0;
      } else if (dataType === 'chart3' || dataType === 'earthquake' || dataType === 'strong_motion') {
        emptyResult.parsed = { timeSeries: [], metadata: {} };
        emptyResult.pga = null;
        emptyResult.max_acceleration = null;
        emptyResult.acceleration = null;
        emptyResult.latest_value = null;
      }
      
      return res.json({
        success: true,
        source: 'external_api',
        data: emptyResult,
        message: `項目 ${regionCode} 未配置 ${dataType} 的API端點`
      });
    }
    
    // 確定最終使用的 endpoint（台7線使用默認值，其他項目使用配置值或默認值）
    const finalMicroseismicEndpoint = microseismicEndpoint || 'http://140.113.21.54';
    const finalRainfallEndpoint = rainfallEndpoint || 'http://140.113.16.140';
    const finalEarthquakeEndpoint = earthquakeEndpoint || 'http://140.113.16.140';
    
    // 創建帶有正確 baseUrl 的服務實例
    const microseismicService = new MicroseismicApiService(finalMicroseismicEndpoint);
    const rainfallService = new RainfallEarthquakeApiService(finalRainfallEndpoint);
    const earthquakeService = new RainfallEarthquakeApiService(finalEarthquakeEndpoint);
    
    console.log(`[${regionCode}] 使用API端點 - 微地動: ${finalMicroseismicEndpoint}, 雨量: ${finalRainfallEndpoint}, 強地動: ${finalEarthquakeEndpoint}${isTaiwan7 ? ' (台7線默認)' : ''}`);
    
    // 根據數據類型設置更新間隔（秒）
    // 微地動和雨量更新較慢，設置為10分鐘（600秒）
    // 強地動更新較快，設置為2分鐘（120秒）
    let updateInterval = 600; // 默認10分鐘
    if (dataType === 'chart3' || dataType === 'earthquake' || dataType === 'strong_motion') {
      updateInterval = 120; // 強地動2分鐘
    } else if (dataType === 'chart1' || dataType === 'microseismic') {
      updateInterval = 600; // 微地動10分鐘
    } else if (dataType === 'chart2' || dataType === 'rainfall') {
      updateInterval = 600; // 雨量10分鐘
    }
    
    let result = null;
    
    switch (dataType) {
      case 'chart1': // 微地動
      case 'microseismic': {
        // 獲取警示標籤
        const warningFlags = await microseismicService.getWarningFlags();
        
        // 獲取今日目錄
        const catalog = await microseismicService.getDailyCatalog(now);
        
        // 調試：輸出微地動API原始內容
        console.log('========== 微地動API原始內容 ==========');
        console.log('警告標籤響應:', JSON.stringify(warningFlags, null, 2));
        console.log('每日目錄響應:', JSON.stringify(catalog, null, 2));
        if (catalog.data && catalog.data.records && catalog.data.records.length > 0) {
          console.log('前3條記錄:', JSON.stringify(catalog.data.records.slice(0, 3), null, 2));
        }
        console.log('=====================================');
        
        // 構建返回數據（即使API失敗也返回空數據結構）
        const catalogData = catalog.data || { records: [], count: 0 };
        const records = catalogData.records || [];
        
        // 過濾出今天的數據（根據當前日期）
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const todayStrCompact = todayStr.replace(/-/g, ''); // YYYYMMDD
        const todayRecords = records.filter(record => {
          // 優先使用 DateTime(UTC+0) 字段
          const recordDate = record['DateTime(UTC+0)'] || record.date || record.timestamp || record.time || record['DateTime'] || '';
          // 檢查是否包含今天的日期（支持多種格式）
          return recordDate.includes(todayStr) || 
                 recordDate.includes(todayStrCompact) ||
                 recordDate.includes(now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')) ||
                 recordDate.startsWith(todayStr) ||
                 recordDate.startsWith(todayStrCompact);
        });
        
        // 如果今天沒有數據，使用最近24條記錄（可能是跨日的情況）
        const recentRecords = todayRecords.length > 0 ? todayRecords : records.slice(-24);
        
        // 根據CSV格式提取數據
        // CSV格式：No, DateTime(UTC+0), Time(sec), Type
        const extractValue = (record) => {
          // 優先使用 Time(sec) 字段（微地動時間）
          // 格式可能是：+   81.0000000 或 -   81.0000000，需要去除加號和空格
          if (record['Time(sec)'] !== undefined && record['Time(sec)'] !== '') {
            const timeSec = record['Time(sec)'].trim().replace(/^[+\-]\s*/, ''); // 去除開頭的+/-和空格
            const value = parseFloat(timeSec);
            return isNaN(value) ? 0 : value;
          }
          // 兼容其他可能的字段名
          return parseFloat(record.value || record.magnitude || record.data || record['Time'] || record['time'] || 0);
        };
        
        const extractTime = (record) => {
          // 優先使用 DateTime(UTC+0) 字段
          if (record['DateTime(UTC+0)'] !== undefined && record['DateTime(UTC+0)'] !== '') {
            return record['DateTime(UTC+0)'];
          }
          // 兼容其他可能的字段名
          return record.time || record.timestamp || record.date || record['DateTime'] || record['datetime'] || '';
        };
        
        const extractType = (record) => {
          return record.Type || record.type || record['Type'] || '';
        };
        
        result = {
          dataType: 'microseismic',
          timestamp: now.toISOString(),
          warningFlags: warningFlags.data || { warnings: [], alerts: [] },
          catalog: catalogData,
          // 為了兼容前端組件，提供標準化的數據格式
          values: recentRecords.map((record, index) => {
            return extractValue(record);
          }),
          time_series: recentRecords.map((record, index) => {
            const value = extractValue(record);
            const timeStr = extractTime(record);
            const type = extractType(record);
            return {
              time: timeStr || `T${index}`,
              value: value,
              timestamp: timeStr || now.toISOString(),
              type: type,
              // 保留原始記錄以便調試
              raw: record
            };
          }),
          latest_value: records.length > 0 
            ? extractValue(records[records.length - 1])
            : null,
          average: records.length > 0
            ? records.reduce((sum, r) => sum + extractValue(r), 0) / records.length
            : 0,
          // 數據更新頻率提示
          updateInterval: updateInterval,
          dataDensity: records.length > 24 ? 'high' : records.length > 12 ? 'medium' : 'low'
        };
        break;
      }
      
      case 'chart2': // 雨量
      case 'rainfall': {
        // 支持日期參數（如果提供）
        let targetDate = now;
        if (req.query.date) {
          // 日期格式：YYYY-MM-DD
          try {
            targetDate = new Date(req.query.date + 'T00:00:00');
            if (isNaN(targetDate.getTime())) {
              targetDate = now; // 如果日期無效，使用當前日期
            }
          } catch (e) {
            targetDate = now;
          }
        }
        
        // 獲取降雨數據（TXT格式，包含時間序列）
        const rainfallData = await rainfallService.getRainfallData(targetDate, 'txt');
        
        // 調試：輸出雨量API原始內容
        console.log('========== 雨量API原始內容 ==========');
        console.log('API響應狀態:', rainfallData.success);
        if (rainfallData.success && rainfallData.data) {
          console.log('時間序列數量:', rainfallData.data.timeSeries?.length || 0);
          if (rainfallData.data.timeSeries && rainfallData.data.timeSeries.length > 0) {
            console.log('前3條時間序列:', JSON.stringify(rainfallData.data.timeSeries.slice(0, 3), null, 2));
          }
          console.log('統計數據:', JSON.stringify(rainfallData.data.statistics, null, 2));
          console.log('最新數據:', JSON.stringify(rainfallData.data.latest, null, 2));
          // 輸出原始TXT數據的前500字符
          if (rainfallData.data.raw) {
            console.log('原始TXT數據前500字符:', rainfallData.data.raw.substring(0, 500));
          }
        } else {
          console.log('API錯誤:', rainfallData.error);
        }
        console.log('=====================================');
        
        // 如果API調用失敗，返回空數據而不是拋出錯誤
        if (!rainfallData.success) {
          result = {
            dataType: 'rainfall',
            timestamp: now.toISOString(),
            timeSeries: [],
            statistics: { total: 0, accumulated: 0, max: 0, avg: 0, count: 0 },
            latest: null,
            time_series: [],
            accumulated: 0,
            hourly: 0,
            labels: [],
            values: [],
            hourly_values: [] // 時雨量數組
          };
        } else {
          const data = rainfallData.data || {};
          result = {
            dataType: 'rainfall',
            timestamp: now.toISOString(),
            ...data,
            // 為了兼容前端組件
            time_series: data.timeSeries || [],
            accumulated: data.statistics?.accumulated || data.statistics?.total || 0, // 累積雨量
            hourly: data.latest?.hourly || data.latest?.value || 0, // 最新時雨量
            labels: data.timeSeries?.map(item => item.datetime || item.time || item.timeHr) || [],
            values: data.timeSeries?.map(item => item.hourly || item.rain || item.value || 0) || [], // 優先使用時雨量
            hourly_values: data.timeSeries?.map(item => item.hourly || item.rain || item.value || 0) || [], // 時雨量數組
            // 數據更新頻率提示
            updateInterval: updateInterval,
            dataDensity: (data.timeSeries?.length || 0) > 24 ? 'high' : (data.timeSeries?.length || 0) > 12 ? 'medium' : 'low'
          };
          
          console.log('雨量數據處理結果:', {
            timeSeriesCount: result.time_series.length,
            accumulated: result.accumulated,
            hourly: result.hourly,
            firstTimeSeries: result.time_series[0],
            labelsCount: result.labels.length,
            valuesCount: result.values.length
          });
        }
        break;
      }
      
      case 'chart3': // 強地動
      case 'earthquake':
      case 'strong_motion': {
        // 獲取強地動數據
        // 注意：強地動數據只在觸發事件時才生成，所以需要回溯尋找最近的數據
        console.log('========== 強地動API原始內容 ==========');
        console.log('開始獲取強地動數據，當前時間:', now.toISOString());
        
        // 先嘗試當前時間
        let strongMotionData = await earthquakeService.getStrongMotionData(now, 0, 'DH3A.cwa.txt');
        
        console.log('強地動API首次調用結果:', {
          success: strongMotionData.success,
          statusCode: strongMotionData.statusCode,
          hasData: !!strongMotionData.data,
          parsedTimeSeriesCount: strongMotionData.data?.parsed?.timeSeries?.length || 0
        });
        
        if (strongMotionData.success && strongMotionData.data) {
          console.log('原始數據長度:', strongMotionData.data.raw?.length || 0);
          if (strongMotionData.data.raw) {
            console.log('原始TXT數據前500字符:', strongMotionData.data.raw.substring(0, 500));
          }
          if (strongMotionData.data.lines && strongMotionData.data.lines.length > 0) {
            console.log('解析後行數:', strongMotionData.data.lines.length);
            console.log('前5行數據:', strongMotionData.data.lines.slice(0, 5));
          }
          if (strongMotionData.data.parsed) {
            console.log('解析結果:', JSON.stringify({
              timeSeriesCount: strongMotionData.data.parsed.timeSeries?.length || 0,
              pga: strongMotionData.data.parsed.pga,
              maxAcceleration: strongMotionData.data.parsed.maxAcceleration,
              acceleration: strongMotionData.data.parsed.acceleration,
              firstTimeSeries: strongMotionData.data.parsed.timeSeries?.[0] || null
            }, null, 2));
          }
        } else {
          console.log('API錯誤:', strongMotionData.error);
          console.log('狀態碼:', strongMotionData.statusCode);
        }
        console.log('=====================================');
        
        // 如果當前時間的數據不存在，先嘗試獲取目錄列表找到最新的可用數據
        if (!strongMotionData.success && strongMotionData.statusCode === 404) {
          console.log('當前時間數據不存在，嘗試獲取目錄列表...');
          
          // 嘗試獲取目錄列表
          const dirList = await earthquakeService.getStrongMotionDirectoryList();
          
          if (dirList.success && dirList.timestamps.length > 0) {
            console.log(`找到 ${dirList.timestamps.length} 個可用的強地動目錄，嘗試最新的幾個...`);
            
            // 嘗試最新的5個時間戳
            for (let i = 0; i < Math.min(5, dirList.timestamps.length); i++) {
              const timestampStr = dirList.timestamps[i];
              console.log(`嘗試時間戳: ${timestampStr}`);
              
              // 解析時間戳為Date對象
              // 格式：20250425015806.70 -> 2025-04-25 01:58:06.70
              const year = parseInt(timestampStr.substring(0, 4));
              const month = parseInt(timestampStr.substring(4, 6)) - 1; // 月份從0開始
              const day = parseInt(timestampStr.substring(6, 8));
              const hour = parseInt(timestampStr.substring(8, 10));
              const minute = parseInt(timestampStr.substring(10, 12));
              const second = parseInt(timestampStr.substring(12, 14));
              const ss = parseInt(timestampStr.substring(15, 17));
              
              const timestampDate = new Date(year, month, day, hour, minute, second, ss * 10);
              
              strongMotionData = await earthquakeService.getStrongMotionData(timestampDate, ss, 'DH3A.cwa.txt');
              if (strongMotionData.success) {
                console.log(`成功獲取數據，使用時間戳: ${timestampStr}`);
                break;
              }
            }
          }
          
          // 如果目錄列表方法失敗，嘗試回溯更長的時間（最多回溯7天）
          if (!strongMotionData.success) {
            console.log('目錄列表方法失敗，嘗試回溯更長的時間（最多7天）...');
            
            // 先嘗試前30分鐘（每次1分鐘）
            for (let i = 1; i <= 30; i++) {
              const pastTime = new Date(now.getTime() - i * 60 * 1000);
              strongMotionData = await earthquakeService.getStrongMotionData(pastTime, 0, 'DH3A.cwa.txt');
              if (strongMotionData.success) {
                console.log(`成功獲取 ${i} 分鐘前的數據`);
                break;
              }
              if (i % 10 === 0) {
                console.log(`已嘗試 ${i} 分鐘前的數據，繼續搜索...`);
              }
            }
            
            // 如果還是失敗，嘗試回溯到幾天前（每次1小時）
            if (!strongMotionData.success) {
              console.log('嘗試回溯到幾天前（每次1小時）...');
              for (let hour = 1; hour <= 168; hour++) { // 7天 = 168小時
                const pastTime = new Date(now.getTime() - hour * 60 * 60 * 1000);
                strongMotionData = await earthquakeService.getStrongMotionData(pastTime, 0, 'DH3A.cwa.txt');
                if (strongMotionData.success) {
                  console.log(`成功獲取 ${hour} 小時前的數據`);
                  break;
                }
                if (hour % 24 === 0) {
                  console.log(`已嘗試 ${hour} 小時（${hour / 24} 天）前的數據，繼續搜索...`);
                }
              }
            }
          }
        }
        
        // 如果API調用失敗，返回空數據而不是拋出錯誤
        if (!strongMotionData.success) {
          console.warn('強地動API調用失敗:', {
            error: strongMotionData.error,
            statusCode: strongMotionData.statusCode
          });
          result = {
            dataType: 'strong_motion',
            timestamp: now.toISOString(),
            pga: null,
            max_acceleration: null,
            acceleration: null,
            parsed: { raw: [], count: 0, timeSeries: [] },
            time_series: [],
            values: [],
            error: strongMotionData.error || 'API調用失敗'
          };
        } else {
          const parsed = strongMotionData.data?.parsed || {};
          const timeSeries = parsed.timeSeries || [];
          
          console.log('強地動數據處理結果:', {
            timeSeriesCount: timeSeries.length,
            pga: parsed.pga,
            maxAcceleration: parsed.maxAcceleration,
            acceleration: parsed.acceleration,
            hasRawData: !!strongMotionData.data?.raw,
            rawDataLength: strongMotionData.data?.raw?.length || 0,
            linesCount: strongMotionData.data?.lines?.length || 0
          });
          
          // 如果解析後沒有時間序列數據，但有PGA或加速度值，至少返回這些值
          if (timeSeries.length === 0 && (parsed.pga !== null || parsed.acceleration !== null)) {
            console.log('沒有時間序列數據，但存在PGA或加速度值，使用單一數值');
            // 創建一個單一數據點的時間序列
            const singleValue = parsed.pga || parsed.acceleration || parsed.maxAcceleration || 0;
            const currentHour = now.getHours();
            timeSeries.push({
              time: `${String(currentHour).padStart(2, '0')}:00:00`,
              acceleration: singleValue,
              index: 0
            });
          }
          
          result = {
            dataType: 'strong_motion',
            timestamp: now.toISOString(),
            ...(strongMotionData.data || {}),
            // 為了兼容前端組件
            pga: parsed.pga || strongMotionData.data?.pga || null,
            max_acceleration: parsed.maxAcceleration || strongMotionData.data?.max_acceleration || null,
            acceleration: parsed.acceleration || strongMotionData.data?.acceleration || null,
            // 時間序列數據（如果沒有，但有多值，至少返回一個）
            // 注意：強地動數據使用 absAcceleration（三個分量的最大絕對值）作為圖表值
            // 這是標準的PGA計算方式，比合成加速度更準確
            time_series: timeSeries,
            values: timeSeries.length > 0 ? timeSeries.map(item => item.absAcceleration || item.acceleration || 0) : (parsed.pga !== null ? [parsed.pga] : (parsed.maxAcceleration !== null ? [parsed.maxAcceleration] : (parsed.acceleration !== null ? [parsed.acceleration] : []))),
            labels: timeSeries.length > 0 ? timeSeries.map(item => item.time) : (parsed.pga !== null || parsed.acceleration !== null ? [`${String(now.getHours()).padStart(2, '0')}:00:00`] : []),
            // 數據更新頻率提示
            updateInterval: updateInterval,
            dataDensity: timeSeries.length > 100 ? 'high' : timeSeries.length > 50 ? 'medium' : 'low'
          };
        }
        break;
      }
      
      default:
        return res.status(400).json({
          success: false,
          message: `不支持的數據類型: ${dataType}`
        });
    }
    
    res.json({
      success: true,
      data: result,
      source: 'external_api',
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('從外部API獲取數據失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    
    // 即使出錯也返回空數據結構，避免前端崩潰
    const emptyResult = {
      dataType: dataType,
      timestamp: new Date().toISOString(),
    };
    
    // 根據數據類型返回對應的空結構
    if (dataType === 'chart1' || dataType === 'microseismic') {
      emptyResult.values = [];
      emptyResult.time_series = [];
      emptyResult.latest_value = null;
      emptyResult.average = 0;
      emptyResult.warningFlags = { warnings: [], alerts: [] };
      emptyResult.catalog = { records: [], count: 0 };
    } else if (dataType === 'chart2' || dataType === 'rainfall') {
      emptyResult.time_series = [];
      emptyResult.accumulated = 0;
      emptyResult.hourly = 0;
      emptyResult.labels = [];
      emptyResult.values = [];
    } else if (dataType === 'chart3' || dataType === 'earthquake' || dataType === 'strong_motion') {
      emptyResult.pga = null;
      emptyResult.max_acceleration = null;
      emptyResult.acceleration = null;
    }
    
    res.json({
      success: true, // 仍然返回success，但數據為空
      data: emptyResult,
      source: 'external_api',
      timestamp: new Date().toISOString(),
      warning: '外部API調用失敗，返回空數據'
    });
  }
}

/**
 * 創建或更新預警地區數據
 */
async function upsertWarningRegionData(req, res) {
  try {
    const { regionCode } = req.params;
    const { dataType, dataCategory, dataContent, dataMetadata, dataTimestamp } = req.body;
    
    // 先獲取地區ID
    const regionQuery = `
      SELECT region_id FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    
    // 插入數據
    const insertQuery = `
      INSERT INTO warning_region_data (
        region_id,
        data_type,
        data_category,
        data_content,
        data_metadata,
        data_timestamp,
        collected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      regionId,
      dataType,
      dataCategory || null,
      JSON.stringify(dataContent),
      dataMetadata ? JSON.stringify(dataMetadata) : null,
      dataTimestamp || new Date()
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '數據已成功儲存'
    });
  } catch (error) {
    console.error('儲存預警地區數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '儲存預警地區數據失敗',
    });
  }
}

/**
 * 建立地區專案（包含上傳檔案和API設定）
 */
async function createRegionProject(req, res) {
  try {
    // 調試：輸出請求信息
    console.log('建立地區專案請求:', {
      body: req.body,
      files: req.files ? req.files.length : 0,
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.headers['content-type']
    });
    
    // 從 req.body 中提取數據（multer 會將 FormData 的文本字段放在 req.body 中）
    const regionName = req.body.regionName;
    const regionCode = req.body.regionCode;
    const description = req.body.description;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const apiConfig = req.body.apiConfig;
    const workSection = req.body.workSection;
    
    // 驗證必填欄位
    if (!regionName || !regionCode) {
      console.error('缺少必填欄位:', { regionName, regionCode });
      return res.status(400).json({
        success: false,
        message: '地區名稱和地區代碼為必填欄位',
        received: {
          regionName: regionName || '(空)',
          regionCode: regionCode || '(空)'
        }
      });
    }

    // 解析API配置（如果是字符串则解析JSON）
    let parsedApiConfig = {};
    if (typeof apiConfig === 'string') {
      try {
        parsedApiConfig = JSON.parse(apiConfig);
      } catch (e) {
        parsedApiConfig = {};
      }
    } else if (apiConfig) {
      parsedApiConfig = apiConfig;
    }
    
    // 確保包含三個類別的配置
    const finalApiConfig = {
      microseismic: parsedApiConfig.microseismic || {
        endpoint: '',
        authType: 'none',
        authValue: '',
        updateInterval: 10
      },
      earthquake: parsedApiConfig.earthquake || {
        endpoint: '',
        authType: 'none',
        authValue: '',
        updateInterval: 10
      },
      rainfall: parsedApiConfig.rainfall || {
        endpoint: '',
        authType: 'none',
        authValue: '',
        updateInterval: 10
      }
    };

    // 始終創建新項目（允許重複的地區代碼和名稱）
    let insertRegionQuery;
    let insertParams;

    if (latitude && longitude) {
      insertRegionQuery = `
        INSERT INTO warning_regions (
          region_name,
          region_code,
          description,
          location_geometry,
          zoom_level,
          api_config,
          is_active,
          status
        ) VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5::numeric, $4::numeric), 4326), $6, $7, $8, $9)
        RETURNING *
      `;

      insertParams = [
        regionName,
        regionCode,
        description || null,
        parseFloat(latitude),
        parseFloat(longitude),
        12, // 預設縮放層級
        JSON.stringify(finalApiConfig),
        true,
        'active'
      ];
    } else {
      insertRegionQuery = `
        INSERT INTO warning_regions (
          region_name,
          region_code,
          description,
          location_geometry,
          zoom_level,
          api_config,
          is_active,
          status
        ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
        RETURNING *
      `;
      
      insertParams = [
        regionName,
        regionCode,
        description || null,
        12, // 預設縮放層級
        JSON.stringify(finalApiConfig),
        true,
        'active'
      ];
    }

    const regionResult = await pool.query(insertRegionQuery, insertParams);
    const regionId = regionResult.rows[0].region_id;
    console.log(`創建新地區專案: ${regionCode} (ID: ${regionId})`);

    // TODO: 處理上傳的檔案（風險判釋資料）
    // 這裡可以將檔案儲存到指定目錄，並在資料庫中記錄檔案資訊
    // 目前先返回成功，檔案處理邏輯可以後續補充

    res.json({
      success: true,
      data: {
        region: regionResult.rows[0],
        message: '地區專案建立成功'
      }
    });
  } catch (error) {
    console.error('建立地區專案失敗:', error);
    res.status(500).json({
      success: false,
      message: '建立地區專案失敗',
    });
  }
}

/**
 * 更新地區專案
 */
async function updateRegionProject(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    const { regionName, description, latitude, longitude, apiConfig } = req.body;
    
    // 驗證必填欄位
    if (!regionName) {
      return res.status(400).json({
        success: false,
        message: '地區名稱為必填欄位'
      });
    }

    // 檢查地區是否存在（使用 region_id）
    const checkQuery = `
      SELECT region_id, region_code FROM warning_regions 
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    const checkResult = await pool.query(checkQuery, [regionId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }

    // 解析API配置（如果是字符串则解析JSON）
    let parsedApiConfig = {};
    if (typeof apiConfig === 'string') {
      try {
        parsedApiConfig = JSON.parse(apiConfig);
      } catch (e) {
        parsedApiConfig = {};
      }
    } else if (apiConfig) {
      parsedApiConfig = apiConfig;
    }
    
    // 確保包含三個類別的配置
    const finalApiConfig = {
      microseismic: parsedApiConfig.microseismic || {
        endpoint: '',
        authType: 'none',
        authValue: '',
        updateInterval: 10
      },
      earthquake: parsedApiConfig.earthquake || {
        endpoint: '',
        authType: 'none',
        authValue: '',
        updateInterval: 10
      },
      rainfall: parsedApiConfig.rainfall || {
        endpoint: '',
        authType: 'none',
        authValue: '',
        updateInterval: 10
      }
    };

    // 更新地區記錄
    let updateRegionQuery;
    let regionParams;

    if (latitude && longitude) {
      updateRegionQuery = `
        UPDATE warning_regions
        SET 
          region_name = $1,
          description = $2,
          location_geometry = ST_SetSRID(ST_MakePoint($4::numeric, $3::numeric), 4326),
          api_config = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE region_id = $6
        RETURNING *
      `;

      regionParams = [
        regionName,
        description || null,
        parseFloat(latitude),
        parseFloat(longitude),
        JSON.stringify(finalApiConfig),
        regionId
      ];
    } else {
      updateRegionQuery = `
        UPDATE warning_regions
        SET 
          region_name = $1,
          description = $2,
          api_config = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE region_id = $4
        RETURNING *
      `;
      
      regionParams = [
        regionName,
        description || null,
        JSON.stringify(finalApiConfig),
        regionId
      ];
    }

    const regionResult = await pool.query(updateRegionQuery, regionParams);

    res.json({
      success: true,
      data: {
        region: regionResult.rows[0],
        message: '地區專案更新成功'
      }
    });
  } catch (error) {
    console.error('更新地區專案失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新地區專案失敗',
    });
  }
}

/**
 * 獲取地區點位顏色配置
 */
async function getPointColors(req, res) {
  try {
    const { regionCode } = req.params;
    
    // 先獲取地區ID
    const regionQuery = `
      SELECT region_id FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    
    // 獲取所有點位顏色配置
    const query = `
      SELECT 
        point_id,
        region_id,
        road_section,
        mileage,
        longitude,
        latitude,
        point_color,
        created_at,
        updated_at
      FROM warning_region_point_colors
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [regionId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取點位顏色配置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取點位顏色配置失敗',
    });
  }
}

/**
 * 更新或創建點位顏色配置
 */
async function upsertPointColor(req, res) {
  try {
    const { regionCode } = req.params;
    const { longitude, latitude, mileage, roadSection, pointColor } = req.body;
    
    // 驗證必填欄位
    if (!longitude || !latitude || !pointColor) {
      return res.status(400).json({
        success: false,
        message: '經度、緯度和顏色為必填欄位'
      });
    }
    
    // 驗證顏色值
    if (!['red', 'yellow', 'green'].includes(pointColor)) {
      return res.status(400).json({
        success: false,
        message: '顏色必須是 red, yellow 或 green'
      });
    }
    
    // 先獲取地區ID
    const regionQuery = `
      SELECT region_id FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    
    // 使用 UPSERT (INSERT ... ON CONFLICT ... DO UPDATE)
    const upsertQuery = `
      INSERT INTO warning_region_point_colors (
        region_id,
        road_section,
        mileage,
        longitude,
        latitude,
        point_color
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (region_id, longitude, latitude)
      DO UPDATE SET
        point_color = EXCLUDED.point_color,
        mileage = EXCLUDED.mileage,
        road_section = EXCLUDED.road_section,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await pool.query(upsertQuery, [
      regionId,
      roadSection || null,
      mileage || null,
      parseFloat(longitude),
      parseFloat(latitude),
      pointColor
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '點位顏色配置已更新'
    });
  } catch (error) {
    console.error('更新點位顏色配置失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新點位顏色配置失敗',
    });
  }
}

/**
 * 導入 Excel 巡查紀錄（僅導入第一筆數據作為測試）
 */
async function importInspectionRecordFromExcel(req, res) {
  try {
    const { regionCode } = req.params;
    
    // 使用伺服器端固定路徑，不接受 client 端指定路徑
    const excelPath = path.join(__dirname, '../../../data/projects/taiwan837/T8L37_17-22.5K_SlopeCondition_After0403.xlsx');
    
    // 讀取 Excel 文件
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 轉換為 JSON 格式（第一行作為表頭）
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    if (data.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel 文件沒有數據'
      });
    }
    
    // 獲取表頭
    const headers = data[0];
    const firstRow = data[1];
    
    // 調試：輸出表頭和第一行數據
    console.log('Excel 表頭:', headers);
    console.log('第一行數據:', firstRow);
    
    // 找到各欄位索引
    let boardIndex = -1;
    let mileageIndex = -1;
    const routineColumns = []; // 例行巡查欄位
    const specialColumns = []; // 特別巡查欄位
    
    headers.forEach((header, index) => {
      if (header !== null && header !== undefined) {
        const headerStr = String(header).trim();
        
        // 找到 Board 欄位
        if (headerStr.toLowerCase() === 'board') {
          boardIndex = index;
        }
        
        // 找到位置里程欄位
        if (headerStr.includes('位置里程') || headerStr.includes('里程')) {
          mileageIndex = index;
        }
        
        // 檢查月巡格式：例如 "4月月巡(113.5.7)"
        if (headerStr.includes('月月巡')) {
          // 提取月份（例如："4月月巡" -> 4）
          const monthMatch = headerStr.match(/(\d+)月月巡/);
          const month = monthMatch ? parseInt(monthMatch[1]) : null;
          
          // 提取日期（例如："(113.5.7)" -> 113年5月7日，轉換為2024年）
          const dateMatch = headerStr.match(/\((\d+)\.(\d+)\.(\d+)\)/);
          let year = null;
          let inspectionDate = null;
          
          if (dateMatch) {
            const eraYear = parseInt(dateMatch[1]); // 113年（民國年）
            const monthNum = parseInt(dateMatch[2]);
            const day = parseInt(dateMatch[3]);
            year = eraYear + 1911; // 轉換為西元年（113 + 1911 = 2024）
            inspectionDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
          
          if (month) {
            routineColumns.push({ 
              index, 
              header: headerStr, 
              month,
              year: year || new Date().getFullYear(),
              inspectionDate
            });
            console.log(`找到例行巡查欄位: ${headerStr}, 月份: ${month}, 年份: ${year || '未指定'}`);
          }
        }
        
        // 檢查特巡格式：例如 "0403特巡(113.4.17)"
        if (headerStr.includes('特巡') && !headerStr.includes('月')) {
          // 提取日期（例如："(113.4.17)" -> 113年4月17日）
          const dateMatch = headerStr.match(/\((\d+)\.(\d+)\.(\d+)\)/);
          let year = null;
          let month = null;
          let inspectionDate = null;
          
          if (dateMatch) {
            const eraYear = parseInt(dateMatch[1]); // 113年（民國年）
            month = parseInt(dateMatch[2]);
            const day = parseInt(dateMatch[3]);
            year = eraYear + 1911; // 轉換為西元年
            inspectionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          } else {
            // 如果沒有日期，嘗試從開頭提取（例如："0403特巡" -> 可能是4月3日）
            const prefixMatch = headerStr.match(/^(\d{2})(\d{2})特巡/);
            if (prefixMatch) {
              month = parseInt(prefixMatch[1]);
              const day = parseInt(prefixMatch[2]);
              year = new Date().getFullYear();
              inspectionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
          
          if (year) {
            specialColumns.push({ 
              index, 
              header: headerStr, 
              year,
              month,
              inspectionDate
            });
            console.log(`找到特別巡查欄位: ${headerStr}, 年份: ${year}, 日期: ${inspectionDate || '未指定'}`);
          }
        }
      }
    });
    
    // 獲取里程數
    const mileage = mileageIndex >= 0 ? firstRow[mileageIndex] : null;
    const board = boardIndex >= 0 ? firstRow[boardIndex] : null;
    
    if (!mileage) {
      return res.status(400).json({
        success: false,
        message: '找不到里程數欄位或第一筆數據沒有里程數'
      });
    }
    
    console.log(`找到 ${routineColumns.length} 個例行巡查欄位, ${specialColumns.length} 個特別巡查欄位`);
    console.log(`Excel 共有 ${data.length - 1} 筆數據行`);
    
    // 獲取地區 ID
    const regionQuery = `
      SELECT region_id FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    
    // 導入所有數據
    const insertedRecords = [];
    const skippedRecords = [];
    
    // 遍歷所有數據行（跳過表頭）
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      // 獲取該行的里程數和 Board
      const rowMileage = mileageIndex >= 0 ? row[mileageIndex] : null;
      const rowBoard = boardIndex >= 0 ? row[boardIndex] : null;
      
      // 跳過沒有里程數的行
      if (!rowMileage || rowMileage === '' || rowMileage === null) {
        console.log(`跳過第 ${rowIndex} 行：沒有里程數`);
        continue;
      }
      
      // 清理里程數（移除換行符等）
      let cleanMileage = String(rowMileage).trim().replace(/\r\n/g, ' ').trim();
      
      // 檢查是否為空行（所有欄位都為空）
      const isEmptyRow = row.every(cell => cell === null || cell === undefined || cell === '');
      if (isEmptyRow) {
        console.log(`跳過第 ${rowIndex} 行：空行`);
        continue;
      }
      
      // 將里程數轉換為標準格式（例如：22.5K -> 022K+500, 22.0K -> 022K+000）
      cleanMileage = convertMileageToStandardFormat(cleanMileage);
      
      console.log(`處理第 ${rowIndex} 行，原始里程數: ${rowMileage}, 轉換後: ${cleanMileage}, Board: ${rowBoard}`);
    
      // 處理該行的例行巡查（月巡）
      for (const col of routineColumns) {
        const value = row[col.index];
        // 檢查值是否有效
        if (value !== null && value !== undefined && value !== '') {
          // 檢查是否已存在
          const checkQuery = `
            SELECT record_id FROM inspection_records
            WHERE region_code = $1 AND mileage = $2 
              AND inspection_type = 'routine' 
              AND inspection_year = $3 
              AND inspection_month = $4
              AND deleted_at IS NULL
          `;
          const checkResult = await pool.query(checkQuery, [regionCode, cleanMileage, col.year, col.month]);
          
          if (checkResult.rows.length === 0) {
            try {
              const insertQuery = `
                INSERT INTO inspection_records (
                  region_id, region_code, mileage, inspection_type,
                  inspection_year, inspection_month, inspection_date, inspection_data,
                  source_file_name
                ) VALUES ($1, $2, $3, 'routine', $4, $5, $6, $7, $8)
                RETURNING record_id
              `;
              
              const result = await pool.query(insertQuery, [
                regionId,
                regionCode,
                cleanMileage,
                col.year,
                col.month,
                col.inspectionDate || null,
                JSON.stringify({ 
                  value, 
                  header: col.header,
                  board: rowBoard || null
                }),
                path.basename(excelPath)
              ]);
              
              insertedRecords.push({
                row: rowIndex,
                mileage: cleanMileage,
                type: 'routine',
                month: col.month,
                year: col.year,
                recordId: result.rows[0].record_id
              });
            } catch (error) {
              console.error(`插入例行巡查記錄失敗 (行 ${rowIndex}, 里程 ${cleanMileage}):`, error);
              skippedRecords.push({
                row: rowIndex,
                mileage: cleanMileage,
                type: 'routine',
              });
            }
          }
        }
      }
      
      // 處理該行的特別巡查（特巡）
      for (const col of specialColumns) {
        const value = row[col.index];
        // 檢查值是否有效
        if (value !== null && value !== undefined && value !== '') {
          // 檢查是否已存在（根據年份和日期）
          const checkQuery = `
            SELECT record_id FROM inspection_records
            WHERE region_code = $1 AND mileage = $2 
              AND inspection_type = 'special' 
              AND inspection_year = $3
              AND inspection_date = $4
              AND deleted_at IS NULL
          `;
          const checkResult = await pool.query(checkQuery, [regionCode, cleanMileage, col.year, col.inspectionDate || null]);
          
          if (checkResult.rows.length === 0) {
            try {
              const insertQuery = `
                INSERT INTO inspection_records (
                  region_id, region_code, mileage, inspection_type,
                  inspection_year, inspection_month, inspection_date, inspection_data,
                  source_file_name
                ) VALUES ($1, $2, $3, 'special', $4, $5, $6, $7, $8)
                RETURNING record_id
              `;
              
              const result = await pool.query(insertQuery, [
                regionId,
                regionCode,
                cleanMileage,
                col.year,
                col.month || null,
                col.inspectionDate || null,
                JSON.stringify({ 
                  value, 
                  header: col.header,
                  board: rowBoard || null
                }),
                path.basename(excelPath)
              ]);
              
              insertedRecords.push({
                row: rowIndex,
                mileage: cleanMileage,
                type: 'special',
                year: col.year,
                date: col.inspectionDate,
                recordId: result.rows[0].record_id
              });
            } catch (error) {
              console.error(`插入特別巡查記錄失敗 (行 ${rowIndex}, 里程 ${cleanMileage}):`, error);
              skippedRecords.push({
                row: rowIndex,
                mileage: cleanMileage,
                type: 'special',
              });
            }
          }
        }
      }
    }
    
    // 統計實際處理的行數（排除空行）
    const processedRows = data.length - 1 - (data.length - 1 - insertedRecords.length - skippedRecords.length);
    
    res.json({
      success: true,
      message: `成功導入巡查紀錄，共處理 ${data.length - 1} 筆數據行，成功插入 ${insertedRecords.length} 筆記錄`,
      data: {
        totalRows: data.length - 1,
        processedRows: processedRows,
        insertedRecords,
        totalInserted: insertedRecords.length,
        skippedRecords,
        totalSkipped: skippedRecords.length,
        routineColumnsCount: routineColumns.length,
        specialColumnsCount: specialColumns.length,
        // 顯示最後處理的里程數範圍
        lastMileage: insertedRecords.length > 0 ? insertedRecords[insertedRecords.length - 1].mileage : null
      }
    });
    
  } catch (error) {
    console.error('導入巡查紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '導入巡查紀錄失敗',
    });
  }
}

/**
 * 獲取指定地區的巡查紀錄
 */
async function getInspectionRecords(req, res) {
  try {
    const { regionCode } = req.params;
    
    const query = `
      SELECT 
        record_id,
        region_code,
        mileage,
        inspection_type,
        inspection_year,
        inspection_month,
        inspection_date,
        inspection_data,
        is_disaster,
        source_file_name,
        created_at,
        updated_at
      FROM inspection_records
      WHERE region_code = $1 AND deleted_at IS NULL
      ORDER BY mileage, inspection_year DESC, inspection_month DESC, inspection_date DESC
    `;
    
    const result = await pool.query(query, [regionCode]);
    
    // 確保 inspection_data 是解析後的 JSON 對象
    const processedRows = result.rows.map(row => {
      if (row.inspection_data && typeof row.inspection_data === 'string') {
        try {
          row.inspection_data = JSON.parse(row.inspection_data);
        } catch (e) {
          console.warn('解析 inspection_data 失敗:', e);
          row.inspection_data = {};
        }
      }
      // 確保 is_disaster 有默認值
      if (row.is_disaster === null || row.is_disaster === undefined) {
        row.is_disaster = false;
      }
      return row;
    });
    
    res.json({
      success: true,
      data: processedRows
    });
  } catch (error) {
    console.error('獲取巡查紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取巡查紀錄失敗',
    });
  }
}

/**
 * 創建巡查紀錄
 */
async function createInspectionRecord(req, res) {
  try {
    const { regionCode } = req.params;
    const { mileage, inspectionType, inspectionYear, inspectionMonth, inspectionDate, inspectionData, isDisaster } = req.body;
    
    // 驗證必填欄位
    if (!mileage || !inspectionType || !inspectionYear) {
      return res.status(400).json({
        success: false,
        message: '里程數、巡查類型和年份為必填欄位'
      });
    }
    
    // 獲取地區 ID
    const regionQuery = `
      SELECT region_id FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    
    // 檢查是否已存在（根據類型不同檢查條件）
    let checkQuery;
    let checkParams;
    
    if (inspectionType === 'routine') {
      checkQuery = `
        SELECT record_id FROM inspection_records
        WHERE region_code = $1 AND mileage = $2 
          AND inspection_type = 'routine' 
          AND inspection_year = $3 
          AND inspection_month = $4
          AND deleted_at IS NULL
      `;
      checkParams = [regionCode, mileage, inspectionYear, inspectionMonth];
    } else {
      checkQuery = `
        SELECT record_id FROM inspection_records
        WHERE region_code = $1 AND mileage = $2 
          AND inspection_type = 'special' 
          AND inspection_year = $3
          AND inspection_date = $4
          AND deleted_at IS NULL
      `;
      checkParams = [regionCode, mileage, inspectionYear, inspectionDate || null];
    }
    
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '該巡查紀錄已存在'
      });
    }
    
    // 插入新記錄
    const insertQuery = `
      INSERT INTO inspection_records (
        region_id, region_code, mileage, inspection_type,
        inspection_year, inspection_month, inspection_date, inspection_data, is_disaster
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      regionId,
      regionCode,
      mileage,
      inspectionType,
      inspectionYear,
      inspectionMonth || null,
      inspectionDate || null,
      JSON.stringify(inspectionData || {}),
      isDisaster || false
    ]);
    
    res.json({
      success: true,
      message: '巡查紀錄已成功創建',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('創建巡查紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建巡查紀錄失敗',
    });
  }
}

/**
 * 更新巡查紀錄
 */
async function updateInspectionRecord(req, res) {
  try {
    const { regionCode, recordId } = req.params;
    const { mileage, inspectionType, inspectionYear, inspectionMonth, inspectionDate, inspectionData, isDisaster } = req.body;
    
    // 驗證必填欄位
    if (!mileage || !inspectionType || !inspectionYear) {
      return res.status(400).json({
        success: false,
        message: '里程數、巡查類型和年份為必填欄位'
      });
    }
    
    // 檢查記錄是否存在
    const checkQuery = `
      SELECT record_id, region_id FROM inspection_records
      WHERE record_id = $1 AND region_code = $2 AND deleted_at IS NULL
    `;
    const checkResult = await pool.query(checkQuery, [recordId, regionCode]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的巡查紀錄'
      });
    }
    
    // 更新記錄
    const updateQuery = `
      UPDATE inspection_records
      SET mileage = $1,
          inspection_type = $2,
          inspection_year = $3,
          inspection_month = $4,
          inspection_date = $5,
          inspection_data = $6,
          is_disaster = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE record_id = $8
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      mileage,
      inspectionType,
      inspectionYear,
      inspectionMonth || null,
      inspectionDate || null,
      JSON.stringify(inspectionData || {}),
      isDisaster || false,
      recordId
    ]);
    
    res.json({
      success: true,
      message: '巡查紀錄已成功更新',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('更新巡查紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新巡查紀錄失敗',
    });
  }
}

/**
 * 刪除監測地區專案（軟刪除）
 */
async function deleteRegionProject(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    
    // 檢查地區是否存在（使用 region_id）
    const checkQuery = `
      SELECT region_id, region_name, region_code
      FROM warning_regions 
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    const checkResult = await pool.query(checkQuery, [regionId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    // 執行軟刪除（使用 region_id）
    const deleteQuery = `
      UPDATE warning_regions
      SET deleted_at = CURRENT_TIMESTAMP,
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE region_id = $1
      RETURNING region_id, region_name, region_code
    `;
    
    const deleteResult = await pool.query(deleteQuery, [regionId]);
    
    res.json({
      success: true,
      message: '監測地區專案已成功刪除',
      data: deleteResult.rows[0]
    });
    
  } catch (error) {
    console.error('刪除監測地區專案失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除監測地區專案失敗',
    });
  }
}

/**
 * 獲取指定地區的里程點災害數量統計
 */
async function getDisasterCountsByMileage(req, res) {
  try {
    const { regionCode } = req.params;
    
    // 統計每個里程點的災害數量（例行巡查和特別巡查中 is_disaster = true 的記錄）
    const query = `
      SELECT 
        mileage,
        COUNT(*) as disaster_count
      FROM inspection_records
      WHERE region_code = $1 
        AND is_disaster = true
        AND deleted_at IS NULL
      GROUP BY mileage
      ORDER BY mileage
    `;
    
    const result = await pool.query(query, [regionCode]);
    
    // 轉換為對象格式，方便前端查找
    const disasterCountMap = {};
    result.rows.forEach(row => {
      disasterCountMap[row.mileage] = parseInt(row.disaster_count) || 0;
    });
    
    res.json({
      success: true,
      data: disasterCountMap
    });
  } catch (error) {
    console.error('獲取災害數量統計失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取災害數量統計失敗',
    });
  }
}

/**
 * 獲取指定地區的告警燈號位置列表
 */
async function getAlertLights(req, res) {
  try {
    const { regionCode } = req.params;
    
    const query = `
      SELECT 
        light_id,
        region_id,
        region_code,
        road_section,
        mileage,
        longitude,
        latitude,
        current_level,
        is_red_light_on,
        show_special_alert,
        special_alert_countdown,
        metadata,
        created_at,
        updated_at
      FROM warning_region_alert_lights
      WHERE region_code = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [regionCode]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取告警燈號位置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取告警燈號位置失敗',
    });
  }
}

/**
 * 創建告警燈號位置
 */
async function createAlertLight(req, res) {
  try {
    const { regionCode } = req.params;
    const { longitude, latitude, roadSection, mileage } = req.body;
    
    // 驗證必填欄位
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '經度和緯度為必填欄位'
      });
    }
    
    // 先獲取地區ID
    const regionQuery = `
      SELECT region_id FROM warning_regions 
      WHERE region_code = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionCode]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionId = regionResult.rows[0].region_id;
    
    // 檢查該位置是否已經有告警燈號
    const checkQuery = `
      SELECT light_id FROM warning_region_alert_lights
      WHERE region_code = $1 
        AND longitude = $2 
        AND latitude = $3 
        AND deleted_at IS NULL
    `;
    const checkResult = await pool.query(checkQuery, [
      regionCode,
      parseFloat(longitude),
      parseFloat(latitude)
    ]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '該位置已經設置了告警燈號'
      });
    }
    
    // 插入新記錄
    const insertQuery = `
      INSERT INTO warning_region_alert_lights (
        region_id,
        region_code,
        road_section,
        mileage,
        longitude,
        latitude,
        current_level,
        is_red_light_on,
        show_special_alert,
        special_alert_countdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      regionId,
      regionCode,
      roadSection || null,
      mileage || null,
      parseFloat(longitude),
      parseFloat(latitude),
      'green', // 默認綠色
      false,
      false,
      0
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '告警燈號位置已成功設置'
    });
  } catch (error) {
    console.error('創建告警燈號位置失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建告警燈號位置失敗',
    });
  }
}

/**
 * 刪除告警燈號位置（軟刪除）
 */
async function deleteAlertLight(req, res) {
  try {
    const { regionCode, lightId } = req.params;
    
    const query = `
      UPDATE warning_region_alert_lights
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE light_id = $1 AND region_code = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await pool.query(query, [lightId, regionCode]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的告警燈號位置'
      });
    }
    
    res.json({
      success: true,
      message: '告警燈號位置已刪除',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('刪除告警燈號位置失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除告警燈號位置失敗',
    });
  }
}

/**
 * 刪除告警燈號位置（使用 region_id）
 */
async function deleteAlertLightById(req, res) {
  try {
    const { regionId, lightId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    if (!validateUUID(lightId, res, '燈號 ID')) return;

    const query = `
      UPDATE warning_region_alert_lights
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE light_id = $1 AND region_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [lightId, regionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的告警燈號位置'
      });
    }

    res.json({
      success: true,
      message: '告警燈號位置已刪除',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('刪除告警燈號位置失敗 (by region_id):', error);
    res.status(500).json({
      success: false,
      message: '刪除告警燈號位置失敗',
    });
  }
}

/**
 * 獲取指定地區的數據（使用 region_id）
 */
async function getWarningRegionDataById(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    const { dataType, limit = 100, useExternalApi = 'false' } = req.query;
    
    console.log(`[getWarningRegionDataById] 查詢 region_id=${regionId}`);
    
    // 先獲取地區資訊和API配置（使用 region_id）
    const regionQuery = `
      SELECT region_id, region_code, api_config FROM warning_regions 
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionId]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionCode = regionResult.rows[0].region_code;
    const apiConfig = regionResult.rows[0].api_config || {};
    
    // 如果請求使用外部API，則從外部API獲取數據
    if (useExternalApi === 'true' && dataType) {
      return await getExternalApiData(regionCode, dataType, apiConfig, req, res);
    }
    
    // 否則從數據庫獲取已儲存的數據（使用 region_id）
    let query = `
      SELECT 
        data_id,
        region_id,
        data_type,
        data_category,
        data_content,
        data_metadata,
        data_timestamp,
        collected_at,
        is_valid,
        status,
        created_at,
        updated_at
      FROM warning_region_data
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    
    const params = [regionId];
    let paramIndex = 2;
    
    if (dataType) {
      query += ` AND data_type = $${paramIndex}`;
      params.push(dataType);
      paramIndex++;
    }
    
    query += ` ORDER BY data_timestamp DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // 解析JSON數據
    const processedRows = result.rows.map(row => {
      if (row.data_content && typeof row.data_content === 'string') {
        try {
          row.data_content = JSON.parse(row.data_content);
        } catch (e) {
          console.warn('解析 data_content 失敗:', e);
        }
      }
      if (row.data_metadata && typeof row.data_metadata === 'string') {
        try {
          row.data_metadata = JSON.parse(row.data_metadata);
        } catch (e) {
          console.warn('解析 data_metadata 失敗:', e);
        }
      }
      return row;
    });
    
    res.json({
      success: true,
      data: processedRows
    });
  } catch (error) {
    console.error('獲取預警地區數據失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取預警地區數據失敗',
    });
  }
}

/**
 * 獲取地區點位顏色配置（使用 region_id）
 */
async function getPointColorsById(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    
    console.log(`[getPointColorsById] 查詢 region_id=${regionId} 的點位顏色配置`);
    
    // 獲取所有點位顏色配置（直接使用 region_id）
    const query = `
      SELECT 
        point_id,
        region_id,
        road_section,
        mileage,
        longitude,
        latitude,
        point_color,
        created_at,
        updated_at
      FROM warning_region_point_colors
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [regionId]);
    
    console.log(`[getPointColorsById] 查詢結果: ${result.rows.length} 個點位顏色配置`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取點位顏色配置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取點位顏色配置失敗',
    });
  }
}

/**
 * 更新或創建點位顏色配置（使用 region_id）
 */
async function upsertPointColorById(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    const { longitude, latitude, mileage, roadSection, pointColor } = req.body;
    
    console.log(`[upsertPointColorById] 開始更新點位顏色`, {
      regionId,
      regionIdType: typeof regionId,
      longitude,
      latitude,
      mileage,
      roadSection,
      pointColor
    });
    
    // region_id 是 UUID 類型，直接使用字符串
    
    // 驗證必填欄位
    if (!longitude || !latitude || !pointColor) {
      console.warn('[upsertPointColorById] 缺少必填欄位');
      return res.status(400).json({
        success: false,
        message: '經度、緯度和顏色為必填欄位'
      });
    }
    
    // 驗證顏色值
    if (!['red', 'yellow', 'green'].includes(pointColor)) {
      console.warn('[upsertPointColorById] 顏色值無效:', pointColor);
      return res.status(400).json({
        success: false,
        message: '顏色必須是 red, yellow 或 green'
      });
    }
    
    // 使用 region_id 直接查詢或插入
    const upsertQuery = `
      INSERT INTO warning_region_point_colors (
        region_id,
        road_section,
        mileage,
        longitude,
        latitude,
        point_color
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (region_id, longitude, latitude)
      DO UPDATE SET
        point_color = EXCLUDED.point_color,
        mileage = EXCLUDED.mileage,
        road_section = EXCLUDED.road_section,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const queryParams = [
      regionId,
      roadSection || null,
      mileage || null,
      parseFloat(longitude),
      parseFloat(latitude),
      pointColor
    ];
    
    console.log('[upsertPointColorById] 執行查詢:', {
      params: queryParams
    });
    
    const result = await pool.query(upsertQuery, queryParams);
    
    console.log('[upsertPointColorById] 更新成功:', result.rows[0]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '點位顏色配置已更新'
    });
  } catch (error) {
    console.error('[upsertPointColorById] 更新點位顏色配置失敗:', {
      stack: error.stack,
      regionId: req.params.regionId,
      body: req.body
    });
    res.status(500).json({
      success: false,
      message: '更新點位顏色配置失敗',
    });
  }
}

/**
 * 獲取指定地區的巡查紀錄（使用 region_id）
 */
async function getInspectionRecordsById(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    
    // 先獲取 region_code（用於查詢）
    const regionQuery = `
      SELECT region_code FROM warning_regions 
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionId]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    const regionCode = regionResult.rows[0].region_code;
    
    // 使用 region_id 查詢巡查紀錄
    const query = `
      SELECT 
        record_id,
        region_id,
        region_code,
        mileage,
        inspection_type,
        inspection_year,
        inspection_month,
        inspection_date,
        inspection_data,
        is_disaster,
        source_file_name,
        created_at,
        updated_at
      FROM inspection_records
      WHERE region_id = $1 AND deleted_at IS NULL
      ORDER BY mileage, inspection_year DESC, inspection_month DESC, inspection_date DESC
    `;
    
    const result = await pool.query(query, [regionId]);
    
    // 確保 inspection_data 是解析後的 JSON 對象
    const processedRows = result.rows.map(row => {
      if (row.inspection_data && typeof row.inspection_data === 'string') {
        try {
          row.inspection_data = JSON.parse(row.inspection_data);
        } catch (e) {
          console.warn('解析 inspection_data 失敗:', e);
          row.inspection_data = {};
        }
      }
      // 確保 is_disaster 有默認值
      if (row.is_disaster === null || row.is_disaster === undefined) {
        row.is_disaster = false;
      }
      return row;
    });
    
    res.json({
      success: true,
      data: processedRows
    });
  } catch (error) {
    console.error('獲取巡查紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取巡查紀錄失敗',
    });
  }
}

/**
 * 獲取指定地區的告警燈號位置列表（使用 region_id）
 */
async function getAlertLightsById(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    
    // 先獲取 region_code（用於查詢）
    const regionQuery = `
      SELECT region_code FROM warning_regions 
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    const regionResult = await pool.query(regionQuery, [regionId]);
    
    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }
    
    // 使用 region_id 查詢告警燈號
    const query = `
      SELECT 
        light_id,
        region_id,
        region_code,
        road_section,
        mileage,
        longitude,
        latitude,
        current_level,
        is_red_light_on,
        show_special_alert,
        special_alert_countdown,
        metadata,
        created_at,
        updated_at
      FROM warning_region_alert_lights
      WHERE region_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [regionId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取告警燈號位置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取告警燈號位置失敗',
    });
  }
}

/**
 * 獲取指定地區的里程點災害數量統計（使用 region_id）
 */
async function getDisasterCountsByMileageById(req, res) {
  try {
    const { regionId } = req.params;
    if (!validateUUID(regionId, res, '地區 ID')) return;
    
    console.log(`[getDisasterCountsByMileageById] 查詢 region_id=${regionId} 的災害統計`);
    
    // 統計每個里程點的災害數量（使用 region_id）
    const query = `
      SELECT 
        mileage,
        COUNT(*) as disaster_count
      FROM inspection_records
      WHERE region_id = $1 
        AND is_disaster = true
        AND deleted_at IS NULL
      GROUP BY mileage
      ORDER BY mileage
    `;
    
    const result = await pool.query(query, [regionId]);
    
    console.log(`[getDisasterCountsByMileageById] 查詢結果: ${result.rows.length} 個里程點有災害記錄`);
    
    // 轉換為對象格式，方便前端查找
    const disasterCountMap = {};
    result.rows.forEach(row => {
      disasterCountMap[row.mileage] = parseInt(row.disaster_count) || 0;
    });
    
    res.json({
      success: true,
      data: disasterCountMap
    });
  } catch (error) {
    console.error('獲取災害數量統計失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取災害數量統計失敗',
    });
  }
}

async function deleteInspectionRecord(req, res) {
  try {
    const { regionCode, recordId } = req.params;

    const checkResult = await pool.query(
      `SELECT record_id FROM inspection_records
       WHERE record_id = $1 AND region_code = $2 AND deleted_at IS NULL`,
      [recordId, regionCode]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到指定的巡查紀錄' });
    }

    await pool.query(
      `UPDATE inspection_records SET deleted_at = CURRENT_TIMESTAMP WHERE record_id = $1`,
      [recordId]
    );

    res.json({ success: true, message: '巡查紀錄已刪除' });
  } catch (error) {
    console.error('刪除巡查紀錄失敗:', error);
    res.status(500).json({ success: false, message: '刪除巡查紀錄失敗' });
  }
}

export {
  getWarningRegions,
  getWarningRegionByCode,
  getWarningRegionData,
  getWarningRegionDataById,
  upsertWarningRegionData,
  createRegionProject,
  updateRegionProject,
  getPointColors,
  getPointColorsById,
  upsertPointColor,
  upsertPointColorById,
  importInspectionRecordFromExcel,
  getInspectionRecords,
  getInspectionRecordsById,
  createInspectionRecord,
  updateInspectionRecord,
  deleteInspectionRecord,
  deleteRegionProject,
  getAlertLights,
  getAlertLightsById,
  createAlertLight,
  deleteAlertLight,
  deleteAlertLightById,
  getDisasterCountsByMileage,
  getDisasterCountsByMileageById
};
