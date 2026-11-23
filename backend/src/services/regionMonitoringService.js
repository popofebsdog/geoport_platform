/**
 * 從外部API獲取數據
 */
function emptyExternalData(dataType, now) {
  const strongMotion = ['chart3', 'earthquake', 'strong_motion'].includes(dataType);
  const data = {
    dataType,
    timestamp: now.toISOString(),
    time_series: [],
    values: [],
    labels: [],
    updateInterval: strongMotion ? 120 : 600,
    dataDensity: 'none'
  };
  if (['chart1', 'microseismic'].includes(dataType)) {
    Object.assign(data, {
      warningFlags: {
        warnings: [],
        alerts: []
      },
      catalog: {
        records: [],
        count: 0
      },
      latest_value: null,
      average: null
    });
  } else if (['chart2', 'rainfall'].includes(dataType)) {
    Object.assign(data, {
      timeSeries: [],
      statistics: {
        total: null,
        accumulated: null,
        max: null,
        min: null,
        avg: null,
        average: null,
        count: 0
      },
      latest: null,
      hourly: null,
      accumulated: null,
      hourly_values: []
    });
  } else if (strongMotion) {
    Object.assign(data, {
      parsed: {
        raw: [],
        count: 0,
        timeSeries: [],
        metadata: {}
      },
      pga: null,
      max_acceleration: null,
      acceleration: null,
      latest_value: null
    });
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

export async function fetchRegionMonitoring(regionCode, dataType, apiConfig, query = {}) {
  const now = new Date();
  try {
    const {
      MicroseismicApiService,
      RainfallEarthquakeApiService
    } = await import("./externalApiService.js");

    // 從 apiConfig 中提取各類型的 endpoint
    // 確保正確處理 null、undefined、空字符串的情況
    const microseismicEndpoint = apiConfig?.microseismic?.endpoint && typeof apiConfig.microseismic.endpoint === 'string' ? apiConfig.microseismic.endpoint.trim() : '';
    const rainfallEndpoint = apiConfig?.rainfall?.endpoint && typeof apiConfig.rainfall.endpoint === 'string' ? apiConfig.rainfall.endpoint.trim() : '';
    const earthquakeEndpoint = apiConfig?.earthquake?.endpoint && typeof apiConfig.earthquake.endpoint === 'string' ? apiConfig.earthquake.endpoint.trim() : '';

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
      return {
        success: false,
        source: 'external_api',
        dataStatus: 'not_configured',
        message,
        timestamp: now.toISOString(),
        data: {
          ...emptyExternalData(dataType, now),
          dataStatus: 'not_configured',
          message
        }
      };
    }

    // 確定最終使用的 endpoint（台7線使用默認值，其他項目使用配置值或默認值）
    const finalMicroseismicEndpoint = microseismicEndpoint || 'http://140.113.21.54';
    const finalRainfallEndpoint = rainfallEndpoint || 'http://140.113.16.140';
    const finalEarthquakeEndpoint = earthquakeEndpoint || 'http://140.113.16.140';

    // 創建帶有正確 baseUrl 的服務實例
    // Share a deadline across all probes and the optional legend, below the UI's 30s timeout.
    const requestOptions = {
      signal: AbortSignal.timeout(25000)
    };
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
      case 'microseismic':
        {
          // 獲取警示標籤
          const warningFlags = await microseismicService.getWarningFlags();

          // 獲取今日目錄
          const catalog = await microseismicService.getDailyCatalog(now);
          upstreamResults = [warningFlags, catalog];

          // 調試：輸出微地動API原始內容
          if (catalog.data && catalog.data.records && catalog.data.records.length > 0) {}

          // 構建返回數據（即使API失敗也返回空數據結構）
          const catalogData = catalog.data || {
            records: [],
            count: 0
          };
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
          const extractValue = record => {
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
          const extractTime = record => {
            // 優先使用 DateTime(UTC+0) 字段
            if (record['DateTime(UTC+0)'] !== undefined && record['DateTime(UTC+0)'] !== '') {
              return record['DateTime(UTC+0)'];
            }
            // 兼容其他可能的字段名
            return record.time || record.timestamp || record.date || record['DateTime'] || record['datetime'] || '';
          };
          const extractType = record => {
            return record.Type || record.type || record['Type'] || '';
          };
          hasData = recentRecords.length > 0 && recentRecords.every(record => Number.isFinite(extractValue(record))) && warningFlags.data != null && typeof warningFlags.data === 'object' && Object.keys(warningFlags.data).length > 0;
          sourceDate = recentRecords.length ? extractTime(recentRecords[recentRecords.length - 1]) : null;
          observationTime = externalObservationTime(sourceDate, true);
          flagsObservedAt = externalObservationTime(warningFlags.observedAt, true);
          const catalogDay = String(catalogData.date || '').replace(/-/g, '');
          historicalCatalog = /^\d{8}$/.test(catalogDay) && catalogDay < todayStrCompact || Boolean(observationTime && observationTime.slice(0, 10) < todayStr);
          result = {
            dataType: 'microseismic',
            timestamp: now.toISOString(),
            warningFlags: warningFlags.data || {
              warnings: [],
              alerts: []
            },
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
            latest_value: records.length > 0 ? extractValue(records[records.length - 1]) : null,
            average: records.length > 0 ? records.reduce((sum, r) => sum + extractValue(r), 0) / records.length : null,
            // 數據更新頻率提示
            updateInterval: updateInterval,
            dataDensity: records.length > 24 ? 'high' : records.length > 12 ? 'medium' : 'low'
          };
          break;
        }
      case 'chart2': // 雨量
      case 'rainfall':
        {
          // 支持日期參數（如果提供）
          let targetDate = now;
          if (query.date) {
            // 日期格式：YYYY-MM-DD
            try {
              targetDate = new Date(query.date + 'T00:00:00');
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
            if (rainfallData.data.timeSeries && rainfallData.data.timeSeries.length > 0) {}
            // 輸出原始TXT數據的前500字符
            if (rainfallData.data.raw) {}
          } else {}

          // 如果API調用失敗，返回空數據而不是拋出錯誤
          if (!rainfallData.success) {
            result = emptyExternalData('rainfall', now);
          } else {
            const data = rainfallData.data || {};
            const latest = data.timeSeries?.[data.timeSeries.length - 1];
            hasData = (data.timeSeries?.length || 0) > 0 && Number.isFinite(latest?.hourly ?? latest?.rain ?? latest?.value);
            sourceDate = latest?.datetime || latest?.time || data.latest?.time || null;
            observationTime = Number.isFinite(latest?.epoch) ? externalObservationTime(new Date(latest.epoch * 1000).toISOString()) : externalObservationTime(latest?.observedAt || sourceDate, true);
            result = {
              ...emptyExternalData('rainfall', now),
              dataType: 'rainfall',
              timestamp: now.toISOString(),
              ...data,
              // 為了兼容前端組件
              time_series: data.timeSeries || [],
              accumulated: hasData ? data.statistics?.accumulated ?? data.statistics?.total ?? null : null,
              hourly: hasData ? data.latest?.hourly ?? data.latest?.value ?? null : null,
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
      case 'strong_motion':
        {
          let strongMotionData = await earthquakeService.getStrongMotionData(now, 0, 'DH3A.cwa.txt');
          let eventTimestamp = null;

          // Probe only known event directories; guessing 198 timestamps can take hours.
          if (!strongMotionData.success && strongMotionData.statusCode === 404) {
            const dirList = await earthquakeService.getStrongMotionDirectoryList();
            if (!dirList.success) {
              strongMotionData = dirList;
            } else {
              const timestamps = [...new Set(dirList.timestamps || [])].filter(value => /^\d{14}\.\d{2}$/.test(value)).sort().reverse().slice(0, 3);
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
        return {
          success: false,
          message: `不支持的數據類型: ${dataType}`,
          statusCode: 400
        };
    }
    const failure = upstreamResults.find(item => !item.success && item.statusCode !== 404) || upstreamResults.find(item => !item.success);
    const isMicroseismic = ['chart1', 'microseismic'].includes(dataType);
    const isRainfall = ['chart2', 'rainfall'].includes(dataType);
    const observedAt = isMicroseismic || isRainfall ? observationTime : externalObservationTime(sourceDate);
    // Event silence is not a heartbeat failure; catalog day and flags are checked separately.
    const freshnessTime = isMicroseismic ? flagsObservedAt : observedAt;
    const age = freshnessTime ? now.getTime() - new Date(freshnessTime).getTime() : null;
    const futureObservation = observedAt && new Date(observedAt).getTime() - now.getTime() > updateInterval * 2000;
    const dataStatus = failure ? failure.statusCode === 404 ? 'empty' : 'error' : !hasData || !observedAt || futureObservation || age === null || age < -updateInterval * 2000 ? 'empty' : historicalCatalog || age > updateInterval * 2000 ? 'historical' : 'ok';
    const messages = {
      ok: '資料可用',
      empty: '無可用觀測資料或觀測時間',
      error: '外部API調用失敗',
      historical: '歷史觀測資料，非即時狀態'
    };
    Object.assign(result, {
      dataStatus,
      message: messages[dataStatus],
      updateInterval,
      ...(sourceDate ? {
        sourceDate
      } : {}),
      ...(observedAt ? {
        observedAt
      } : {}),
      ...(failure ? {
        error: failure.error,
        statusCode: failure.statusCode
      } : {})
    });
    return {
      success: !failure,
      dataStatus,
      message: result.message,
      data: result,
      source: 'external_api',
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('從外部API獲取數據失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    const dataStatus = error.response?.status === 404 ? 'empty' : 'error';
    const message = dataStatus === 'empty' ? '無可用觀測資料' : '外部API調用失敗';
    return {
      success: false,
      dataStatus,
      message,
      data: {
        ...emptyExternalData(dataType, now),
        dataStatus,
        message
      },
      source: 'external_api',
      timestamp: now.toISOString(),
      warning: '外部API調用失敗，返回空數據'
    };
  }
}

/**
 * 創建或更新預警地區數據
 */
