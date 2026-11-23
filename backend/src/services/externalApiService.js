/**
 * 外部API服務
 * 整合微地動和降雨&地震Web API
 */

import axios from 'axios';
import https from 'https';
import { createLogger } from '../utils/logger.js';

const log = createLogger('external-api');

function sensorObservationTime(value, epoch) {
  let date;
  if (Number.isFinite(epoch)) {
    date = new Date(epoch * 1000);
  } else {
    if (typeof value !== 'string') return null;
    let timestamp = value.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
    if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(timestamp)) return null;
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp)) timestamp += 'Z';
    date = new Date(timestamp);
  }
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// 創建自定義axios實例，允許自簽名證書（如果需要）
const apiClient = axios.create({
  timeout: 30000, // 30秒超時
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // 允許自簽名證書（僅用於開發環境）
  })
});

/**
 * 微地動API服務
 * Base URL: http://140.113.21.54 (默認)
 */
class MicroseismicApiService {
  constructor(baseUrl = 'http://140.113.21.54', { signal } = {}) {
    this.baseUrl = baseUrl;
    this.signal = signal;
  }

  /**
   * 獲取觸發事件圖像資料
   * @param {Date|string} timestamp - 時間戳記
   * @returns {Promise<Buffer>} 圖像資料
   */
  async getTriggerEvent(timestamp) {
    try {
      const dateStr = this.formatTimestampForTrigger(timestamp);
      const url = `${this.baseUrl}/GeoSlop/${dateStr}`;
      
      const response = await apiClient.get(url, {
        signal: this.signal,
        responseType: 'arraybuffer'
      });
      
      return {
        success: true,
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'image/png',
        timestamp: dateStr
      };
    } catch (error) {
      log.warn('Failed to fetch trigger event', {
        action: 'getTriggerEvent',
        error,
        statusCode: error.response?.status
      });
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * 獲取每日觸發事件目錄
   * @param {Date|string} date - 日期
   * @returns {Promise<Object>} CSV數據
   */
  async getDailyCatalog(date) {
    try {
      const dateStr = this.formatDateForCatalog(date);
      const url = `${this.baseUrl}/GeoSlop/catalog/${dateStr}.csv`;
      
      const response = await apiClient.get(url, {
        signal: this.signal,
        responseType: 'text'
      });
      
      // 解析CSV數據
      // 注意：CSV格式可能有空格，如：'           1 ,2025-11-17-00-05-02,+   81.0000000     ,TYPE NOISE'
      const lines = response.data.split('\n').filter(line => line.trim());
      
      // 找到標題行（包含 "No" 或 "DateTime" 的行）
      let headerLineIndex = -1;
      let headers = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('No') && lines[i].includes('DateTime')) {
          headerLineIndex = i;
          headers = lines[i].split(',').map(h => h.trim());
          break;
        }
      }
      
      
      // 解析數據行（跳過標題行）
      const records = [];
      for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 使用正則表達式解析CSV行，處理可能包含空格的字段
        // 格式：'           1 ,2025-11-17-00-05-02,+   81.0000000     ,TYPE NOISE'
        const csvPattern = /^\s*(\d+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*(.+)$/;
        const match = line.match(csvPattern);
        
        if (match) {
          const record = {
            No: match[1].trim(),
            'DateTime(UTC+0)': match[2].trim(),
            'Time(sec)': match[3].trim(),
            Type: match[4].trim(),
            _lineNumber: i + 1
          };
          records.push(record);
        } else {
          // 如果正則匹配失敗，嘗試簡單的split方法
          const values = line.split(',').map(v => v.trim());
          if (values.length >= 4) {
            const record = {};
            headers.forEach((header, index) => {
              record[header] = values[index] || '';
            });
            record._lineNumber = i + 1;
            records.push(record);
          }
        }
      }
      
      if (records.length > 0) {
      }
      
      return {
        success: true,
        data: {
          date: dateStr,
          headers,
          records,
          count: records.length
        }
      };
    } catch (error) {
      log.warn('Failed to fetch daily catalog', {
        action: 'getDailyCatalog',
        error,
        statusCode: error.response?.status
      });
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        data: { date: this.formatDateForCatalog(date), headers: [], records: [], count: 0 }
      };
    }
  }

  /**
   * 獲取警示標籤
   * @returns {Promise<Object>} 警示標籤數據
   */
  async getWarningFlags() {
    try {
      const url = `${this.baseUrl}/GeoSlop/a_flag.json`;
      
      const response = await apiClient.get(url, { signal: this.signal });
      let data = response.data ?? null;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          // The FLAG feed emits unquoted zero-padded zeros; keep all other JSON syntax strict.
          data = JSON.parse(data.replace(/("Value"\s*:\s*)0{2,}(?=\s*[,}])/g, '$10'));
        }
      }
      if (data !== null && typeof data !== 'object') throw new Error('Invalid warning flag payload');
      let observedAt = null;
      if (Array.isArray(data)) {
        const stationsValid = data.length > 0 && data.every(station => Array.isArray(station?.Measurements) && station.Measurements.length > 0);
        const measurements = stationsValid ? data.flatMap(station => station.Measurements) : [];
        const times = measurements.map(item => Number.isFinite(item?.Value) ? sensorObservationTime(item.TimeStamp) : null);
        if (times.length > 0 && times.every(Boolean)) observedAt = times.sort()[0];
      } else if (data && (Array.isArray(data.warnings) || Array.isArray(data.alerts))) {
        observedAt = sensorObservationTime(data.timestamp);
      }
      return {
        success: true,
        data,
        observedAt
      };
    } catch (error) {
      log.warn('Failed to fetch alert label', {
        action: 'getAlertLabel',
        error,
        statusCode: error.response?.status
      });
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        data: null,
        observedAt: null
      };
    }
  }

  /**
   * 格式化時間戳記為觸發事件格式: YYYY-MM-DD-HH-MN-SS
   */
  formatTimestampForTrigger(timestamp) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
  }

  /**
   * 格式化日期為目錄格式: YYYYMMDD
   */
  formatDateForCatalog(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

/**
 * 降雨&地震API服務
 * Base URL: http://140.113.16.140 (默認)
 */
class RainfallEarthquakeApiService {
  constructor(baseUrl = 'http://140.113.16.140', { signal } = {}) {
    this.baseUrl = baseUrl;
    this.signal = signal;
  }

  /**
   * 獲取降雨時間序列資料
   * @param {Date|string} date - 日期
   * @param {string} format - 'png' 或 'txt'
   * @returns {Promise<Object>} 降雨數據
   */
  async getRainfallData(date, format = 'txt') {
    try {
      const dateStr = this.formatDateForRain(date);
      const url = `${this.baseUrl}/rain/${dateStr}.${format}`;
      
      if (format === 'png') {
        const response = await apiClient.get(url, {
          signal: this.signal,
          responseType: 'arraybuffer'
        });
        
        return {
          success: true,
          data: Buffer.from(response.data),
          contentType: 'image/png',
          date: dateStr,
          format: 'image'
        };
      } else {
        const response = await apiClient.get(url, {
          signal: this.signal,
          responseType: 'text'
        });
        
        // 調試：輸出原始響應
        
        // 解析TXT數據
        // 格式：time[hr],volt[mV],RSSI[dBm],rain[mm],crain[mm],JulianDay,datetime,epoch,flag
        // 數據行：0.000000  10942    -63   0.00   0.00  321.000000 2025-11-17T00:00:00  1763337600 1
        const lines = response.data.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
        }
        
        // 跳過標題行（包含 "time[hr]" 的行）
        const dataLines = lines.filter(line => !line.includes('time[hr]') && line.trim());
        
        const timeSeries = dataLines.map((line, index) => {
          const parts = line.trim().split(/\s+/).filter(p => p.trim());
          
          // 根據格式：time[hr] volt[mV] RSSI[dBm] rain[mm] crain[mm] JulianDay datetime epoch flag
          // 索引：     0          1         2         3        4          5         6       7     8
          if (parts.length >= 9) {
            const timeHr = parts[0]; // 小時（如 0.000000）
            const volt = parseFloat(parts[1]); // 電壓
            const rssi = parseFloat(parts[2]); // 信號強度
            const rain = parseFloat(parts[3]); // 時雨量 (rain[mm])
            const crain = parseFloat(parts[4]); // 累積雨量 (crain[mm])
            const datetime = parts[6]; // ISO格式時間
            
            return {
              time: datetime || timeHr || `T${index}`,
              timeHr: timeHr,
              volt: volt,
              rssi: rssi,
              accumulated: !isNaN(crain) ? crain : null,
              hourly: Number.isFinite(rain) ? rain : null,
              value: Number.isFinite(rain) ? rain : null,
              datetime: datetime,
              epoch: /^\d+(?:\.\d+)?$/.test(parts[7]) ? Number(parts[7]) : null,
              index
            };
          } else if (parts.length >= 3) {
            // 兼容舊格式：時間 累積雨量 時雨量
            const time = parts[0] || `T${index}`;
            const accumulated = parts.length >= 2 ? parseFloat(parts[1]) : null;
            const hourly = parts.length >= 3 ? parseFloat(parts[2]) : (parts.length >= 2 ? parseFloat(parts[1]) : 0);
            
            return {
              time: time,
              accumulated: accumulated !== null && !isNaN(accumulated) ? accumulated : null,
              hourly: Number.isFinite(hourly) ? hourly : null,
              value: Number.isFinite(hourly) ? hourly : null,
              index
            };
          } else {
            // 單一數值
            return {
              time: parts[0] || `T${index}`,
              accumulated: null,
              hourly: parts.length >= 2 ? parseFloat(parts[1]) : null,
              value: parts.length >= 2 ? parseFloat(parts[1]) : null,
              index
            };
          }
        }).filter(item => Number.isFinite(item.hourly))
          .map(item => ({ ...item, observedAt: sensorObservationTime(item.datetime || item.time, item.epoch) }));
        
        // 計算統計數據
        const hourlyValues = timeSeries.map(item => item.hourly).filter(v => !isNaN(v));
        const accumulatedValues = timeSeries.map(item => item.accumulated).filter(v => v !== null && !isNaN(v));
        
        // 累積雨量：取最後一個累積值，如果沒有則計算總和
        const totalAccumulated = accumulatedValues.length > 0 
          ? accumulatedValues[accumulatedValues.length - 1] 
          : (hourlyValues.length > 0 ? hourlyValues.reduce((sum, val) => sum + val, 0) : 0);
        
        // 時雨量統計
        const maxHourly = hourlyValues.length > 0 ? Math.max(...hourlyValues) : 0;
        const avgHourly = hourlyValues.length > 0 ? hourlyValues.reduce((sum, val) => sum + val, 0) / hourlyValues.length : 0;
        
        return {
          success: true,
          data: {
            date: dateStr,
            timeSeries,
            statistics: {
              total: totalAccumulated, // 累積雨量
              accumulated: totalAccumulated, // 累積雨量（明確命名）
              max: maxHourly, // 最大時雨量
              avg: avgHourly, // 平均時雨量
              count: timeSeries.length
            },
            latest: timeSeries.length > 0 ? {
              time: timeSeries[timeSeries.length - 1].time,
              epoch: timeSeries[timeSeries.length - 1].epoch,
              observedAt: timeSeries[timeSeries.length - 1].observedAt,
              accumulated: timeSeries[timeSeries.length - 1].accumulated,
              hourly: timeSeries[timeSeries.length - 1].hourly,
              value: timeSeries[timeSeries.length - 1].hourly
            } : null
          },
          format: 'text'
        };
      }
    } catch (error) {
      log.warn('Failed to fetch rainfall data', {
        action: 'getRainfallData',
        error,
        statusCode: error.response?.status
      });
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        data: {
          date: this.formatDateForRain(date),
          timeSeries: [],
          statistics: { total: 0, max: 0, avg: 0, count: 0 },
          latest: null
        }
      };
    }
  }

  /**
   * 獲取強地動目錄列表（可選功能）
   * 嘗試訪問 /pgapgv/ 目錄索引，獲取可用的時間戳列表
   */
  async getStrongMotionDirectoryList() {
    try {
      const url = `${this.baseUrl}/pgapgv/`;
      
      const response = await apiClient.get(url, {
        signal: this.signal,
        responseType: 'text'
      });
      
      // 解析HTML目錄列表，提取時間戳
      const html = response.data;
      const timestampPattern = /(\d{14}\.\d{2})\//g;
      const timestamps = [];
      let match;
      
      while ((match = timestampPattern.exec(html)) !== null) {
        timestamps.push(match[1]);
      }
      
      return {
        success: true,
        timestamps: timestamps.sort().reverse()
      };
    } catch (error) {
      return { success: false, timestamps: [], error: error.message, statusCode: error.response?.status };
    }
  }

  /**
   * 獲取強地動資料
   * 正常方式：直接使用正確的路徑格式訪問API
   * 路徑格式：http://140.113.16.140/pgapgv/YYYYMMDDHHMNSS.SS/文件名
   * 例如：http://140.113.16.140/pgapgv/20250425015806.70/DH3A.cwa.txt
   * 
   * @param {Date|string} timestamp - 時間戳記（可選，如果為null則使用當前時間）
   * @param {number} milliseconds - 毫秒（0-99）
   * @param {string} fileType - 文件類型: 'autoacclplot.png', 'DH3A.cwa.txt', 'tmp.legend'
   * @returns {Promise<Object>} 強地動數據
   */
  async getStrongMotionData(timestamp = null, milliseconds = 0, fileType = 'DH3A.cwa.txt') {
    try {
      // 如果沒有提供時間戳，使用當前時間
      const targetTime = timestamp || new Date();
      const timestampStr = this.formatTimestampForPgapgv(targetTime, milliseconds);
      // 根據API文檔，URL格式應該是：/pgapgv/YYYYMMDDHHMNSS.SS/文件名
      // 例如：http://140.113.16.140/pgapgv/20250425015806.70/DH3A.cwa.txt
      // 注意：目錄路徑格式是 YYYYMMDDHHMNSS.SS/，然後是文件名
      const url = `${this.baseUrl}/pgapgv/${timestampStr}/${fileType}`;
      
      
      if (fileType.endsWith('.png')) {
        const response = await apiClient.get(url, {
          signal: this.signal,
          responseType: 'arraybuffer'
        });
        
        return {
          success: true,
          data: Buffer.from(response.data),
          contentType: 'image/png',
          timestamp: timestampStr,
          fileType: 'image'
        };
      } else if (fileType.endsWith('.txt')) {
        const response = await apiClient.get(url, {
          signal: this.signal,
          responseType: 'text'
        });
        
        
        // 解析CWA文本數據
        const lines = response.data.split('\n').filter(line => line.trim());
        
        const parsedData = this.parseCwaData(lines);
        
        // 如果解析後沒有數據，記錄詳細信息
        if (parsedData.timeSeries.length === 0) {
          log.warn('Strong motion data parsed empty', {
            action: 'getStrongMotionData',
            firstLine: lines[0],
            secondLine: lines[1],
            thirdLine: lines[2],
            totalLines: lines.length
          });
        }
        
        // 嘗試讀取tmp.legend文件獲取PGA和PGV數值
        let legendData = null;
        try {
          const legendUrl = `${this.baseUrl}/pgapgv/${timestampStr}/tmp.legend`;
          const legendResponse = await apiClient.get(legendUrl, {
            signal: this.signal,
            responseType: 'text'
          });
          legendData = this.parseLegendData(legendResponse.data);
        } catch (legendError) {
          log.debug('Legend file not available', {
            action: 'getStrongMotionData',
            error: legendError
          });
        }
        
        const data = {
          timestamp: timestampStr,
          raw: response.data,
          lines: lines,
          parsed: parsedData,
          legend: legendData,
          // 優先使用legend中的PGA和PGV，其次使用解析的數據
          pga: legendData?.pga ?? parsedData.pga ?? null,
          pgv: legendData?.pgv ?? null,
          max_acceleration: parsedData.maxAcceleration ?? null,
          acceleration: parsedData.acceleration ?? null
        };
        
        return {
          success: true,
          data,
          fileType: 'text'
        };
      } else if (fileType === 'tmp.legend') {
        // 專門讀取圖例文件
        const response = await apiClient.get(url, {
          signal: this.signal,
          responseType: 'text'
        });
        
        const legendData = this.parseLegendData(response.data);
        
        return {
          success: true,
          data: {
            timestamp: timestampStr,
            raw: response.data,
            legend: legendData,
            pga: legendData?.pga || null,
            pgv: legendData?.pgv || null
          },
          fileType: 'legend'
        };
      } else {
        // 其他文件類型（如png）
        const response = await apiClient.get(url, {
          signal: this.signal,
          responseType: fileType.endsWith('.png') ? 'arraybuffer' : 'text'
        });
        
        return {
          success: true,
          data: fileType.endsWith('.png') ? Buffer.from(response.data) : response.data,
          fileType: fileType.endsWith('.png') ? 'image' : 'text'
        };
      }
    } catch (error) {
      log.error('Strong motion API request failed', {
        action: 'getStrongMotionData',
        error,
        statusCode: error.response?.status,
        responseHeaders: error.response?.headers,
        responsePreview: error.response?.data ? String(error.response.data).substring(0, 500) : undefined,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method
      });
      
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        requestUrl: error.config?.url
      };
    }
  }

  /**
   * 解析圖例文件（tmp.legend）
   * 圖例文件包含觸發事件的PGA和PGV數值
   * 根據實際格式，包含類似這樣的內容：
   * "L 12p,Helvetica CB PGA 31.9 gal"
   * "L 12p,Helvetica CB PGV 0.6 cm/s"
   * "L 12p,Helvetica CB Lead Time 0.0 sec"
   * "L 12p,Helvetica CB Intensity 4"
   */
  parseLegendData(legendText) {
    const result = {
      pga: null,
      pgv: null,
      leadTime: null,
      intensity: null,
      raw: legendText
    };
    
    if (!legendText) {
      return result;
    }
    
    
    const lines = legendText.split('\n').filter(line => line.trim());
    
    // 根據實際格式解析：查找包含 "PGA"、"PGV"、"Lead Time"、"Intensity" 的行
    lines.forEach(line => {
      // 解析PGA: "L 12p,Helvetica CB PGA 31.9 gal"
      const pgaMatch = line.match(/PGA\s+([\d.]+)\s+gal/i);
      if (pgaMatch && result.pga === null) {
        result.pga = parseFloat(pgaMatch[1]);
      }
      
      // 解析PGV: "L 12p,Helvetica CB PGV 0.6 cm/s"
      const pgvMatch = line.match(/PGV\s+([\d.]+)\s+cm\/s/i);
      if (pgvMatch && result.pgv === null) {
        result.pgv = parseFloat(pgvMatch[1]);
      }
      
      // 解析Lead Time: "L 12p,Helvetica CB Lead Time 0.0 sec"
      const leadTimeMatch = line.match(/Lead\s+Time\s+([\d.]+)\s+sec/i);
      if (leadTimeMatch && result.leadTime === null) {
        result.leadTime = parseFloat(leadTimeMatch[1]);
      }
      
      // 解析Intensity: "L 12p,Helvetica CB Intensity 4"
      const intensityMatch = line.match(/Intensity\s+(\d+)/i);
      if (intensityMatch && result.intensity === null) {
        result.intensity = parseInt(intensityMatch[1], 10);
      }
    });
    
    // 如果正則表達式沒找到，嘗試更寬鬆的匹配
    if (result.pga === null) {
      const pgaMatch = legendText.match(/PGA[:\s]+([\d.]+)/i);
      if (pgaMatch) {
        result.pga = parseFloat(pgaMatch[1]);
      }
    }
    
    if (result.pgv === null) {
      const pgvMatch = legendText.match(/PGV[:\s]+([\d.]+)/i);
      if (pgvMatch) {
        result.pgv = parseFloat(pgvMatch[1]);
      }
    }
    
    
    return result;
  }

  /**
   * 解析CWA數據文件
   * 根據實際格式，CWA文件包含：
   * 1. 元數據行（以#開頭）：StationCode, StartTime, SampleRate等
   * 2. 數據序列：Time U(+); N(+); E(+) 格式
   * 例如：0.000 -0.079 0.010 -0.013
   *      0.005 -0.073 0.003 -0.008
   */
  parseCwaData(lines) {
    const timeSeries = [];
    let pga = null;
    let maxAcceleration = null;
    const accelerations = [];
    const metadata = {};
    
    
    let dataStartIndex = -1;
    
    // 第一遍：解析元數據和找到數據開始位置
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // 解析元數據行（以#開頭）
      if (trimmedLine.startsWith('#')) {
        // 提取元數據
        if (trimmedLine.includes('StationCode:')) {
          metadata.stationCode = trimmedLine.split('StationCode:')[1]?.trim();
        }
        if (trimmedLine.includes('StartTime:')) {
          metadata.startTime = trimmedLine.split('StartTime:')[1]?.trim();
        }
        if (trimmedLine.includes('SampleRate(Hz):')) {
          const rate = trimmedLine.match(/SampleRate\(Hz\):\s*(\d+)/);
          if (rate) metadata.sampleRate = parseInt(rate[1], 10);
        }
        if (trimmedLine.includes('RecordLength(sec):')) {
          const length = trimmedLine.match(/RecordLength\(sec\):\s*([\d.]+)/);
          if (length) metadata.recordLength = parseFloat(length[1]);
        }
        if (trimmedLine.includes('AmplitudeMAX.')) {
          // 提取最大振幅值
          const maxMatch = trimmedLine.match(/AmplitudeMAX\.\s*([UNE]):\s*([-\d.]+)~\s*([\d.]+)/);
          if (maxMatch) {
            const component = maxMatch[1];
            const min = parseFloat(maxMatch[2]);
            const max = parseFloat(maxMatch[3]);
            metadata[`amplitudeMax${component}`] = { min, max, abs: Math.max(Math.abs(min), Math.abs(max)) };
          }
        }
        if (trimmedLine.includes('#DataSequence:')) {
          // 下一行開始是數據
          dataStartIndex = index + 1;
        }
      }
    });
    
    
    // 第二遍：解析數據序列（從#DataSequence之後開始）
    const dataLines = dataStartIndex >= 0 ? lines.slice(dataStartIndex) : lines;
    
    dataLines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      // 數據格式：Time U N E（空格分隔）
      // 例如：0.000 -0.079 0.010 -0.013
      const parts = trimmedLine.split(/\s+/).filter(p => p.trim());
      
      if (parts.length >= 4) {
        const time = parseFloat(parts[0]);
        const u = parseFloat(parts[1]); // 垂直分量
        const n = parseFloat(parts[2]); // 南北分量
        const e = parseFloat(parts[3]); // 東西分量
        
        if (!isNaN(time) && !isNaN(u) && !isNaN(n) && !isNaN(e)) {
          // 計算合成加速度（三個分量的向量和）
          const acceleration = Math.sqrt(u * u + n * n + e * e);
          const absAcceleration = Math.max(Math.abs(u), Math.abs(n), Math.abs(e));
          
          timeSeries.push({
            time: time,
            timeStr: `${time.toFixed(3)}`,
            u: u,
            n: n,
            e: e,
            acceleration: acceleration,
            absAcceleration: absAcceleration,
            index: index
          });
          
          accelerations.push(absAcceleration);
          if (maxAcceleration === null || absAcceleration > maxAcceleration) {
            maxAcceleration = absAcceleration;
          }
        }
      }
    });
    
    // PGA通常是峰值地面加速度，取最大值
    pga = maxAcceleration;
    
    // 如果元數據中有AmplitudeMAX，也可以使用
    if (metadata.amplitudeMaxE && !pga) {
      pga = metadata.amplitudeMaxE.abs;
    }
    
    
    return {
      raw: lines,
      count: lines.length,
      timeSeries: timeSeries,
      pga: pga,
      maxAcceleration: maxAcceleration,
      acceleration: timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].acceleration : null,
      latest: timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : null,
      metadata: metadata
    };
  }

  /**
   * 格式化日期為降雨API格式: YYYY-MM-DD
   */
  formatDateForRain(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化時間戳記為強地動API格式: YYYYMMDDHHMNSS.SS
   * 根據API文檔格式：/pgapgv/YYYYMMDDHHMNSS.SS/
   * - YYYYMMDDHHMNSS: 年月日時分秒（14位數字）
   * - .SS: 百分之一秒（00-99），即毫秒的前兩位
   * 例如：20240101120000.50 表示 2024-01-01 12:00:00.50（即50百分之一秒）
   */
  formatTimestampForPgapgv(timestamp, milliseconds = 0) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    // 根據API文檔，.SS是百分之一秒（00-99）
    // 如果milliseconds為0，從Date對象獲取毫秒並轉換為百分之一秒
    let ss = 0;
    if (milliseconds === 0) {
      // 從Date對象獲取毫秒，轉換為百分之一秒（0-99）
      const ms = date.getMilliseconds();
      ss = Math.floor(ms / 10); // 毫秒轉換為百分之一秒（0-99）
    } else {
      // 確保在0-99範圍內
      ss = Math.max(0, Math.min(99, Math.floor(milliseconds)));
    }
    const ssStr = String(ss).padStart(2, '0');
    
    const result = `${year}${month}${day}${hour}${minute}${second}.${ssStr}`;
    
    // 調試：輸出格式化的時間戳
    
    return result;
  }
}

// 創建服務實例
const microseismicService = new MicroseismicApiService();
const rainfallEarthquakeService = new RainfallEarthquakeApiService();

export {
  microseismicService,
  rainfallEarthquakeService,
  MicroseismicApiService,
  RainfallEarthquakeApiService
};
