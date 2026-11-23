const isNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function getMonitoringState(data) {
  if (!data) return { available: false, status: 'empty', text: '無資料' };
  const messages = { error: '來源連線失敗', empty: '無資料', not_configured: '未設定來源' };
  const status = data.dataStatus || (data.error ? 'error' : data.dataDensity === 'none' ? 'not_configured' : null);
  if (messages[status]) return { available: false, status, text: messages[status] };

  const series = [data.time_series, data.timeSeries, data.parsed?.timeSeries, data.values, data.hourly_values];
  const hasMeasurements = series.some(rows => Array.isArray(rows) && rows.some(row => {
    if (typeof row !== 'object' || row === null) return isNumber(row);
    return Boolean(row.type || row.Type) || ['hourly', 'accumulated', 'rainfall', 'value', 'pga', 'PGA',
      'pgv', 'acceleration', 'absAcceleration'].some(key => isNumber(row[key]));
  })) || (!series.some(Array.isArray) && ['pga', 'acceleration', 'hourly', 'rainfall'].some(key => isNumber(data[key])));
  if (!hasMeasurements) return { available: false, status: 'empty', text: '無資料' };

  // The API checks observation instants; its raw UTC source date may be yesterday in Taiwan.
  if (status === 'ok') return { available: true, status: 'ok', text: '' };

  // Fetch timestamps describe the request, not when the sensor measured the data.
  const sourceDate = String(data.sourceDate || data.parsed?.metadata?.startTime || data.date || '').replaceAll('/', '-').slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (status === 'historical' || (/^\d{4}-\d{2}-\d{2}$/.test(sourceDate) && sourceDate < today)) {
    return { available: true, status: 'historical', text: '歷史資料' };
  }
  return { available: true, status: 'ok', text: '' };
}
