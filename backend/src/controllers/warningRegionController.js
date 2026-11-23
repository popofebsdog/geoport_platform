import { pool } from '../config/database.js';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';
import { validateUUID } from '../utils/validators.js';
import { resolveStoragePath, toStoragePath } from '../services/storageService.js';

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
function emptyExternalData(dataType, now) {
  const strongMotion = ['chart3', 'earthquake', 'strong_motion'].includes(dataType);
  const data = {
    dataType, timestamp: now.toISOString(), time_series: [], values: [], labels: [],
    updateInterval: strongMotion ? 120 : 600, dataDensity: 'none'
  };
  if (['chart1', 'microseismic'].includes(dataType)) {
    Object.assign(data, { warningFlags: { warnings: [], alerts: [] }, catalog: { records: [], count: 0 }, latest_value: null, average: null });
  } else if (['chart2', 'rainfall'].includes(dataType)) {
    Object.assign(data, { timeSeries: [], statistics: { total: null, accumulated: null, max: null, min: null, avg: null, average: null, count: 0 }, latest: null, hourly: null, accumulated: null, hourly_values: [] });
  } else if (strongMotion) {
    Object.assign(data, { parsed: { raw: [], count: 0, timeSeries: [], metadata: {} }, pga: null, max_acceleration: null, acceleration: null, latest_value: null });
  }
  return data;
}

function externalObservationTime(value, assumeUtc = false) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let date;
  if (/^\d{14}\.\d{2}$/.test(value)) {
    date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)), Number(value.slice(8, 10)), Number(value.slice(10, 12)), Number(value.slice(12, 14)), Number(value.slice(15)) * 10);
  } else {
    // The microseismic catalog explicitly labels its timestamps UTC+0.
    let normalized = value.replace(/^(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})-(\d{2})$/, '$1T$2:$3:$4Z');
    if (assumeUtc && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) normalized += 'Z';
    date = new Date(normalized);
  }
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getExternalApiData(regionCode, dataType, apiConfig, req, res) {
  const now = new Date();
  try {
    const { MicroseismicApiService, RainfallEarthquakeApiService } = await import('../services/externalApiService.js');
    
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
    
    // 根據數據類型確定要使用的 endpoint
    let hasConfiguredEndpoint = false;
    
    if (dataType === 'chart1' || dataType === 'microseismic') {
      hasConfiguredEndpoint = !!microseismicEndpoint && microseismicEndpoint.length > 0;
    } else if (dataType === 'chart2' || dataType === 'rainfall') {
      hasConfiguredEndpoint = !!rainfallEndpoint && rainfallEndpoint.length > 0;
    } else if (dataType === 'chart3' || dataType === 'earthquake' || dataType === 'strong_motion') {
      hasConfiguredEndpoint = !!earthquakeEndpoint && earthquakeEndpoint.length > 0;
    }
    
    // 如果不是台7線且沒有配置 endpoint，返回空數據
    if (!isTaiwan7 && !hasConfiguredEndpoint) {
      
      const message = `項目 ${regionCode} 未配置 ${dataType} 的API端點`;
      return res.json({
        success: false,
        source: 'external_api',
        dataStatus: 'not_configured', message,
        timestamp: now.toISOString(),
        data: { ...emptyExternalData(dataType, now), dataStatus: 'not_configured', message }
      });
    }
    
    // 確定最終使用的 endpoint（台7線使用默認值，其他項目使用配置值或默認值）
    const finalMicroseismicEndpoint = microseismicEndpoint || 'http://140.113.21.54';
    const finalRainfallEndpoint = rainfallEndpoint || 'http://140.113.16.140';
    const finalEarthquakeEndpoint = earthquakeEndpoint || 'http://140.113.16.140';
    
    // 創建帶有正確 baseUrl 的服務實例
    // Share a deadline across all probes and the optional legend, below the UI's 30s timeout.
    const requestOptions = { signal: AbortSignal.timeout(25000) };
    const microseismicService = new MicroseismicApiService(finalMicroseismicEndpoint, requestOptions);
    const rainfallService = new RainfallEarthquakeApiService(finalRainfallEndpoint, requestOptions);
    const earthquakeService = new RainfallEarthquakeApiService(finalEarthquakeEndpoint, requestOptions);
    
    
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
    let upstreamResults = [];
    let sourceDate = null;
    let hasData = false;
    let observationTime = null;
    let flagsObservedAt = null;
    let historicalCatalog = false;
    
    switch (dataType) {
      case 'chart1': // 微地動
      case 'microseismic': {
        // 獲取警示標籤
        const warningFlags = await microseismicService.getWarningFlags();
        
        // 獲取今日目錄
        const catalog = await microseismicService.getDailyCatalog(now);
        upstreamResults = [warningFlags, catalog];
        
        // 調試：輸出微地動API原始內容
        if (catalog.data && catalog.data.records && catalog.data.records.length > 0) {
        }
        
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
          return externalObservationTime(recordDate, true)?.slice(0, 10) === todayStr;
        });
        
        // 如果今天沒有數據，使用最近24條記錄（可能是跨日的情況）
        const recentRecords = todayRecords.length > 0 ? todayRecords : records.slice(-24);
        
        // 根據CSV格式提取數據
        // CSV格式：No, DateTime(UTC+0), Time(sec), Type
        const extractValue = (record) => {
          // 優先使用 Time(sec) 字段（微地動時間）
          // 格式可能是：+   81.0000000 或 -   81.0000000，需要去除加號和空格
          if (record['Time(sec)'] !== undefined && record['Time(sec)'] !== '') {
            const timeSec = String(record['Time(sec)']).trim().replace(/^[+\-]\s*/, ''); // 去除開頭的+/-和空格
            const value = parseFloat(timeSec);
            return Number.isFinite(value) ? value : null;
          }
          // 兼容其他可能的字段名
          const value = parseFloat(record.value ?? record.magnitude ?? record.data ?? record['Time'] ?? record['time']);
          return Number.isFinite(value) ? value : null;
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

        hasData = recentRecords.length > 0 && recentRecords.every(record => Number.isFinite(extractValue(record)))
          && warningFlags.data != null && typeof warningFlags.data === 'object' && Object.keys(warningFlags.data).length > 0;
        sourceDate = recentRecords.length ? extractTime(recentRecords[recentRecords.length - 1]) : null;
        observationTime = externalObservationTime(sourceDate, true);
        flagsObservedAt = externalObservationTime(warningFlags.observedAt, true);
        const catalogDay = String(catalogData.date || '').replace(/-/g, '');
        historicalCatalog = /^\d{8}$/.test(catalogDay) && catalogDay < todayStrCompact
          || Boolean(observationTime && observationTime.slice(0, 10) < todayStr);
        
        result = {
          dataType: 'microseismic',
          timestamp: now.toISOString(),
          warningFlags: warningFlags.data || { warnings: [], alerts: [] },
          catalog: catalogData,
          flagsObservedAt,
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
              timestamp: timeStr || null,
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
            : null,
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
        upstreamResults = [rainfallData];
        
        // 調試：輸出雨量API原始內容
        if (rainfallData.success && rainfallData.data) {
          if (rainfallData.data.timeSeries && rainfallData.data.timeSeries.length > 0) {
          }
          // 輸出原始TXT數據的前500字符
          if (rainfallData.data.raw) {
          }
        } else {
        }
        
        // 如果API調用失敗，返回空數據而不是拋出錯誤
        if (!rainfallData.success) {
          result = emptyExternalData('rainfall', now);
        } else {
          const data = rainfallData.data || {};
          const latest = data.timeSeries?.[data.timeSeries.length - 1];
          hasData = (data.timeSeries?.length || 0) > 0 && Number.isFinite(latest?.hourly ?? latest?.rain ?? latest?.value);
          sourceDate = latest?.datetime || latest?.time || data.latest?.time || null;
          observationTime = Number.isFinite(latest?.epoch)
            ? externalObservationTime(new Date(latest.epoch * 1000).toISOString())
            : externalObservationTime(latest?.observedAt || sourceDate, true);
          result = {
            ...emptyExternalData('rainfall', now),
            dataType: 'rainfall',
            timestamp: now.toISOString(),
            ...data,
            // 為了兼容前端組件
            time_series: data.timeSeries || [],
            accumulated: hasData ? (data.statistics?.accumulated ?? data.statistics?.total ?? null) : null,
            hourly: hasData ? (data.latest?.hourly ?? data.latest?.value ?? null) : null,
            labels: data.timeSeries?.map(item => item.datetime || item.time || item.timeHr) || [],
            values: data.timeSeries?.map(item => item.hourly ?? item.rain ?? item.value ?? null) || [],
            hourly_values: data.timeSeries?.map(item => item.hourly ?? item.rain ?? item.value ?? null) || [],
            // 數據更新頻率提示
            updateInterval: updateInterval,
            dataDensity: (data.timeSeries?.length || 0) > 24 ? 'high' : (data.timeSeries?.length || 0) > 12 ? 'medium' : 'low'
          };
          
        }
        break;
      }
      
      case 'chart3': // 強地動
      case 'earthquake':
      case 'strong_motion': {
        let strongMotionData = await earthquakeService.getStrongMotionData(now, 0, 'DH3A.cwa.txt');
        let eventTimestamp = null;

        // Probe only known event directories; guessing 198 timestamps can take hours.
        if (!strongMotionData.success && strongMotionData.statusCode === 404) {
          const dirList = await earthquakeService.getStrongMotionDirectoryList();
          if (!dirList.success) {
            strongMotionData = dirList;
          } else {
            const timestamps = [...new Set(dirList.timestamps || [])]
              .filter(value => /^\d{14}\.\d{2}$/.test(value)).sort().reverse().slice(0, 3);
            for (const timestamp of timestamps) {
              const observedAt = externalObservationTime(timestamp);
              if (!observedAt) continue;
              eventTimestamp = timestamp;
              strongMotionData = await earthquakeService.getStrongMotionData(new Date(observedAt), Number(timestamp.slice(15)), 'DH3A.cwa.txt');
              if (strongMotionData.success || strongMotionData.statusCode !== 404) break;
            }
          }
        }
        upstreamResults = [strongMotionData];
        
        // 如果API調用失敗，返回空數據而不是拋出錯誤
        if (!strongMotionData.success) {
          console.warn('強地動API調用失敗:', {
            error: strongMotionData.error,
            statusCode: strongMotionData.statusCode
          });
          result = {
            ...emptyExternalData('strong_motion', now),
            error: strongMotionData.error || 'API調用失敗'
          };
        } else {
          const parsed = strongMotionData.data?.parsed || {};
          const timeSeries = parsed.timeSeries || [];
          hasData = timeSeries.some(item => Number.isFinite(item.absAcceleration ?? item.acceleration));
          sourceDate = parsed.metadata?.startTime || strongMotionData.data?.timestamp || eventTimestamp;
          result = {
            dataType: 'strong_motion',
            timestamp: now.toISOString(),
            ...(strongMotionData.data || {}),
            // 為了兼容前端組件
            pga: strongMotionData.data?.pga ?? parsed.pga ?? null,
            max_acceleration: parsed.maxAcceleration ?? strongMotionData.data?.max_acceleration ?? null,
            acceleration: parsed.acceleration ?? strongMotionData.data?.acceleration ?? null,
            // 注意：強地動數據使用 absAcceleration（三個分量的最大絕對值）作為圖表值
            // 這是標準的PGA計算方式，比合成加速度更準確
            time_series: timeSeries,
            values: timeSeries.map(item => item.absAcceleration ?? item.acceleration ?? null),
            labels: timeSeries.map(item => item.time),
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
    
    const failure = upstreamResults.find(item => !item.success && item.statusCode !== 404)
      || upstreamResults.find(item => !item.success);
    const isMicroseismic = ['chart1', 'microseismic'].includes(dataType);
    const isRainfall = ['chart2', 'rainfall'].includes(dataType);
    const observedAt = isMicroseismic || isRainfall ? observationTime : externalObservationTime(sourceDate);
    // Event silence is not a heartbeat failure; catalog day and flags are checked separately.
    const freshnessTime = isMicroseismic ? flagsObservedAt : observedAt;
    const age = freshnessTime ? now.getTime() - new Date(freshnessTime).getTime() : null;
    const futureObservation = observedAt && new Date(observedAt).getTime() - now.getTime() > updateInterval * 2000;
    const dataStatus = failure ? (failure.statusCode === 404 ? 'empty' : 'error')
      : !hasData || !observedAt || futureObservation || age === null || age < -updateInterval * 2000 ? 'empty'
      : historicalCatalog || age > updateInterval * 2000 ? 'historical' : 'ok';
    const messages = {
      ok: '資料可用', empty: '無可用觀測資料或觀測時間', error: '外部API調用失敗',
      historical: '歷史觀測資料，非即時狀態'
    };
    Object.assign(result, { dataStatus, message: messages[dataStatus], updateInterval,
      ...(sourceDate ? { sourceDate } : {}), ...(observedAt ? { observedAt } : {}),
      ...(failure ? { error: failure.error, statusCode: failure.statusCode } : {}) });
    res.json({
      success: !failure,
      dataStatus, message: result.message,
      data: result,
      source: 'external_api',
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('從外部API獲取數據失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    
    const dataStatus = error.response?.status === 404 ? 'empty' : 'error';
    const message = dataStatus === 'empty' ? '無可用觀測資料' : '外部API調用失敗';
    res.json({
      success: false, dataStatus, message,
      data: { ...emptyExternalData(dataType, now), dataStatus, message },
      source: 'external_api',
      timestamp: now.toISOString(),
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
      SELECT region_id, region_code, api_config FROM warning_regions 
      WHERE region_id = $1 AND deleted_at IS NULL
    `;
    const checkResult = await pool.query(checkQuery, [regionId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的預警地區'
      });
    }

    const existingApiConfig = checkResult.rows[0].api_config || {};
    const hasApiConfigUpdate = Object.prototype.hasOwnProperty.call(req.body, 'apiConfig');

    // 解析API配置（如果是字符串则解析JSON）
    let parsedApiConfig = existingApiConfig;
    if (hasApiConfigUpdate) {
      if (typeof apiConfig === 'string') {
        try {
          parsedApiConfig = JSON.parse(apiConfig);
        } catch (e) {
          parsedApiConfig = {};
        }
      } else if (apiConfig) {
        parsedApiConfig = apiConfig;
      } else {
        parsedApiConfig = {};
      }
    }

    const defaultApiCategory = {
      endpoint: '',
      authType: 'none',
      authValue: '',
      updateInterval: 10
    };

    // 確保包含三個類別的配置；未由前端更新時保留既有設定
    const finalApiConfig = {
      microseismic: parsedApiConfig.microseismic || defaultApiCategory,
      earthquake: parsedApiConfig.earthquake || defaultApiCategory,
      rainfall: parsedApiConfig.rainfall || defaultApiCategory
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
    
    
    const result = await pool.query(upsertQuery, queryParams);
    
    
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

// ─── 監測圖資 (warning_region_layers) ────────────────────────────────────────

// GET /api/warning-regions/id/:regionId/layers
export async function getRegionLayersById(req, res) {
  const { regionId } = req.params;
  try {
    const result = await pool.query(
      `SELECT layer_id, region_id, region_code, layer_type, layer_name,
              storage_path, display_config, is_active, created_at
       FROM warning_region_layers
       WHERE region_id = $1 AND is_active = TRUE
       ORDER BY layer_type, created_at`,
      [regionId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('取得監測圖資失敗:', error);
    res.status(500).json({ success: false, message: '取得監測圖資失敗' });
  }
}

// GET /api/warning-regions/:regionCode/layers
export async function getRegionLayers(req, res) {
  const { regionCode } = req.params;
  try {
    const result = await pool.query(
      `SELECT layer_id, region_id, region_code, layer_type, layer_name,
              storage_path, display_config, is_active, created_at
       FROM warning_region_layers
       WHERE region_code = $1 AND is_active = TRUE
       ORDER BY layer_type, created_at`,
      [regionCode]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('取得監測圖資失敗:', error);
    res.status(500).json({ success: false, message: '取得監測圖資失敗' });
  }
}

// POST /api/warning-regions/:regionCode/layers
// PUT  /api/warning-regions/:regionCode/layers/:layerId
export async function upsertRegionLayer(req, res) {
  const { regionCode, layerId } = req.params;
  const { layer_type, layer_name, display_config } = req.body;

  if (!layer_type || !layer_name) {
    return res.status(400).json({ success: false, message: '缺少 layer_type 或 layer_name' });
  }

  if (!['insar', 'road', 'shapefile', 'hotspot'].includes(layer_type)) {
    return res.status(400).json({ success: false, message: '不支援的圖資類型' });
  }

  try {
    const { WarningRegion, WarningRegionLayer } = await import('../models/WarningRegionLayer.js');
    let regionId = req.body.region_id;
    if (regionId) {
      if (!validateUUID(regionId, res, '地區 ID')) return;
      const region = await WarningRegion.findOne({ where: { region_id: regionId, region_code: regionCode, deleted_at: null } });
      if (!region) return res.status(404).json({ success: false, message: '找不到指定的預警地區' });
    } else {
      const regions = await WarningRegion.findAll({ where: { region_code: regionCode, deleted_at: null }, attributes: ['region_id'], limit: 2 });
      if (regions.length !== 1) return res.status(400).json({ success: false, message: '請指定地區專案 ID' });
      regionId = regions[0].region_id;
    }
    let config = {};
    try {
      config = typeof display_config === 'string' ? JSON.parse(display_config) : display_config || {};
      if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('Invalid display config');
    } catch {
      return res.status(400).json({ success: false, message: '圖資顯示設定格式不正確' });
    }
    let storage_path;

    // 有上傳檔案的情況
    if (req.file) {
      storage_path = toStoragePath(req.file.path);
    } else if (req.body.storage_path) {
      storage_path = toStoragePath(req.body.storage_path);
    } else if (!layerId) {
      return res.status(400).json({ success: false, message: '新增圖資需要提供檔案或 storage_path' });
    }

    if (layerId) {
      const layer = await WarningRegionLayer.findOne({ where: { layer_id: layerId, region_id: regionId } });
      if (!layer) return res.status(404).json({ success: false, message: '圖資不存在' });
      await layer.update({ layer_type, layer_name, display_config: config, ...(storage_path ? { storage_path } : {}) });
      return res.json({ success: true, data: layer });
    }

    const layer = await WarningRegionLayer.create({ region_id: regionId, region_code: regionCode,
      layer_type, layer_name, storage_path, display_config: config });
    res.status(201).json({ success: true, data: layer });
  } catch (error) {
    console.error('儲存監測圖資失敗:', error);
    res.status(500).json({ success: false, message: '儲存監測圖資失敗' });
  }
}

// DELETE /api/warning-regions/layers/:layerId
export async function deleteRegionLayer(req, res) {
  const { layerId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE warning_region_layers SET is_active=FALSE, updated_at=NOW()
       WHERE layer_id=$1 RETURNING layer_id`,
      [layerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '圖資不存在' });
    res.json({ success: true, message: '圖資已停用' });
  } catch (error) {
    console.error('停用監測圖資失敗:', error);
    res.status(500).json({ success: false, message: '停用監測圖資失敗' });
  }
}

// GET /api/warning-regions/monitoring-file?path=uploads/monitoring/...
// 代理服務：前端透過此 API 取得監測圖資的實際內容
export async function serveMonitoringFile(req, res) {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ success: false, message: '缺少 path 參數' });

  // 安全性：只允許 uploads/monitoring/ 底下的路徑
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith('uploads/monitoring/')) {
    return res.status(403).json({ success: false, message: '不允許存取此路徑' });
  }

  const absPath = resolveStoragePath(normalized);
  if (!absPath) return res.status(403).json({ success: false, message: '不允許存取此路徑' });
  try {
    await fs.access(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const mime = ext === '.tif' || ext === '.tiff' ? 'image/tiff' : 'application/json';
    res.setHeader('Content-Type', mime);
    res.sendFile(absPath);
  } catch {
    res.status(404).json({ success: false, message: '監測圖資檔案不存在' });
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
