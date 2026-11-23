import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';

const query = jest.fn();
const getWarningFlags = jest.fn();
const getDailyCatalog = jest.fn();
const getRainfallData = jest.fn();
const getStrongMotionData = jest.fn();
const getStrongMotionDirectoryList = jest.fn();
const serviceOptions = [];
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query } }));
jest.unstable_mockModule('../src/services/externalApiService.js', () => ({
  MicroseismicApiService: class {
    constructor(_url, options) { serviceOptions.push(options); }
    getWarningFlags = getWarningFlags;
    getDailyCatalog = getDailyCatalog;
  },
  RainfallEarthquakeApiService: class {
    constructor(_url, options) { serviceOptions.push(options); }
    getRainfallData = getRainfallData;
    getStrongMotionData = getStrongMotionData;
    getStrongMotionDirectoryList = getStrongMotionDirectoryList;
  }
}));
const { getWarningRegionData, getWarningRegionDataById } = await import('../src/controllers/warningRegionController.js');
const now = new Date('2026-11-22T04:00:00.000Z');
const missing = { success: false, statusCode: 404, error: 'Not found' };

beforeEach(() => {
  jest.resetAllMocks();
  serviceOptions.length = 0;
  jest.useFakeTimers().setSystemTime(now);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  query.mockResolvedValue({ rows: [{ region_id: 'region-id', region_code: 'taiwan7', api_config: {} }] });
  getWarningFlags.mockResolvedValue({ success: true, data: { warnings: [], alerts: [], timestamp: now.toISOString() }, observedAt: now.toISOString() });
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [], count: 0 } });
  getRainfallData.mockResolvedValue({ success: true, data: { timeSeries: [], latest: null } });
  getStrongMotionData.mockResolvedValue(missing);
  getStrongMotionDirectoryList.mockResolvedValue({ success: true, timestamps: [] });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function request(dataType, { regionCode = 'taiwan7', byId = false, date } = {}) {
  const req = { params: { regionCode, regionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, query: { dataType, useExternalApi: 'true', ...(date ? { date } : {}) } };
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await (byId ? getWarningRegionDataById : getWarningRegionData)(req, res);
  return res.json.mock.calls[0][0];
}

function expectStatus(payload, dataStatus, success) {
  expect(payload).toMatchObject({ success, source: 'external_api', dataStatus, message: expect.any(String), data: { dataStatus, message: expect.any(String) } });
  expect(payload.data.updateInterval).toBeGreaterThan(0);
}

test.each(['chart1', 'chart2', 'chart3'])('unconfigured %s is explicit, not normal', async type => {
  const payload = await request(type, { regionCode: 'other' });
  expectStatus(payload, 'not_configured', false);
  expect(getRainfallData).not.toHaveBeenCalled();
  expect(getWarningFlags).not.toHaveBeenCalled();
  expect(getStrongMotionData).not.toHaveBeenCalled();
});

test.each([
  [404, 'empty'], [500, 'error'], [undefined, 'error']
])('rainfall upstream %s is %s with structured failure', async (statusCode, status) => {
  getRainfallData.mockResolvedValue({ success: false, statusCode, error: 'upstream failed' });
  const payload = await request('rainfall');
  expectStatus(payload, status, false);
  expect(payload.data).toMatchObject({ timeSeries: [], time_series: [], values: [], hourly: null, accumulated: null, latest: null });
});

test.each(['chart1', 'chart2', 'chart3'])('successful empty %s is not normal', async type => {
  if (type === 'chart3') getStrongMotionData.mockResolvedValue({ success: true, data: { parsed: { timeSeries: [] } } });
  const payload = await request(type);
  expectStatus(payload, 'empty', true);
  expect(payload.data.values).toEqual([]);
});

test.each(['flags', 'catalog'])('microseismic partial failure in %s remains failure', async part => {
  (part === 'flags' ? getWarningFlags : getDailyCatalog).mockResolvedValue({ success: false, statusCode: 503, error: 'unavailable' });
  expectStatus(await request('microseismic'), 'error', false);
});

test('microseismic failure takes precedence over a missing catalog', async () => {
  getWarningFlags.mockResolvedValue({ success: false, error: 'timeout' });
  getDailyCatalog.mockResolvedValue(missing);
  expectStatus(await request('chart1'), 'error', false);
});

test.each([
  ['2026-11-22-03-59-00', 'ok'], ['2025-11-17-00-05-02', 'historical']
])('microseismic catalog %s preserves observation date and is %s', async (time, status) => {
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': time, 'Time(sec)': '+ 81', Type: 'NOISE' }], count: 1 } });
  const payload = await request('chart1');
  expectStatus(payload, status, true);
  expect(payload.data.observedAt).toBe(time.replace(/^(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})-(\d{2})$/, '$1T$2:$3:$4.000Z'));
  expect(payload.data.values).toEqual([81]);
});

test.each([
  [now.toISOString(), 'ok'], ['2025-11-17T00:00:00Z', 'historical'], [undefined, 'empty']
])('rainfall timestamp %s is %s, real zero readings survive', async (datetime, status) => {
  getRainfallData.mockResolvedValue({ success: true, data: {
    date: '2026-11-22', timeSeries: [{ datetime, hourly: 0, accumulated: 0 }],
    statistics: { accumulated: 0 }, latest: { time: datetime, hourly: 0 }
  } });
  const payload = await request('chart2', { byId: true });
  expectStatus(payload, status, true);
  expect(payload.data.hourly).toBe(0);
  expect(payload.data.values).toEqual([0]);
  if (datetime) expect(payload.data.observedAt).toBe(new Date(datetime).toISOString());
});

test('strong motion retains historical waveform and actual directory event timestamp', async () => {
  const timestamp = '20250425015806.70';
  const waveform = [{ time: 0, absAcceleration: 0, acceleration: 0.2 }];
  getStrongMotionDirectoryList.mockResolvedValue({ success: true, timestamps: [timestamp] });
  getStrongMotionData.mockResolvedValueOnce(missing).mockResolvedValueOnce({ success: true, data: { timestamp, raw: 'waveform', parsed: { timeSeries: waveform, pga: 0, maxAcceleration: 0 } } });
  const payload = await request('strong_motion');
  expectStatus(payload, 'historical', true);
  expect(payload.data).toMatchObject({ timestamp, sourceDate: timestamp, pga: 0, raw: 'waveform', time_series: waveform, values: [0] });
  expect(new Date(payload.data.observedAt).getFullYear()).toBe(2025);
});

test('strong motion 404 with empty directory is empty without 198 blind probes', async () => {
  expectStatus(await request('chart3'), 'empty', false);
  expect(getStrongMotionData).toHaveBeenCalledTimes(1);
});

test('strong motion directory errors are errors, not missing data', async () => {
  getStrongMotionDirectoryList.mockResolvedValue({ success: false, error: 'timeout' });
  expectStatus(await request('chart3'), 'error', false);
  expect(getStrongMotionData).toHaveBeenCalledTimes(1);
});

test('strong motion stops on upstream failure instead of continuing fallback', async () => {
  getStrongMotionDirectoryList.mockResolvedValue({ success: true, timestamps: ['20250425015806.70', '20250424015806.70'] });
  getStrongMotionData.mockResolvedValueOnce(missing).mockResolvedValue({ success: false, statusCode: 500, error: 'broken' });
  expectStatus(await request('chart3'), 'error', false);
  expect(getStrongMotionData).toHaveBeenCalledTimes(2);
});

test('strong motion checks at most three unique listed events', async () => {
  getStrongMotionDirectoryList.mockResolvedValue({ success: true, timestamps: Array.from({ length: 10 }, (_, i) => `202504${String(25 - i).padStart(2, '0')}015806.70`).flatMap(time => [time, time]) });
  expectStatus(await request('chart3'), 'empty', false);
  expect(getStrongMotionData).toHaveBeenCalledTimes(4);
});

test('unexpected external exception returns structured error, not success zeros', async () => {
  getRainfallData.mockRejectedValue(new Error('timeout'));
  const payload = await request('chart2');
  expectStatus(payload, 'error', false);
  expect(payload.data).toMatchObject({ hourly: null, accumulated: null, timeSeries: [], time_series: [] });
});

test('all external services share a 25 second deadline', async () => {
  const deadline = jest.spyOn(AbortSignal, 'timeout');
  await request('chart2');
  expect(deadline).toHaveBeenCalledWith(25000);
  expect(serviceOptions).toHaveLength(3);
  expect(serviceOptions.every(options => options.signal === serviceOptions[0].signal)).toBe(true);
});

test.each([
  ['2026-11-22T03:39:59Z', 'historical'], ['2026-11-22T03:40:00Z', 'ok'],
  ['2026-11-23T04:00:00Z', 'empty']
])('rainfall freshness boundary %s is %s', async (datetime, status) => {
  getRainfallData.mockResolvedValue({ success: true, data: { timeSeries: [{ datetime, hourly: 0 }], latest: { hourly: 0 } } });
  expectStatus(await request('rainfall'), status, true);
});

test('fresh microseismic events cannot hide stale warning flags', async () => {
  getWarningFlags.mockResolvedValue({ success: true, observedAt: '2025-11-17T00:00:00.000Z', data: { warnings: [], alerts: [], timestamp: '2025-11-17T00:00:00Z' } });
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': '0' }] } });
  expectStatus(await request('microseismic'), 'historical', true);
});

test.each([null, {}])('missing warning flag payload %s cannot become normal', async data => {
  getWarningFlags.mockResolvedValue({ success: true, data });
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': '0' }] } });
  expectStatus(await request('microseismic'), 'empty', true);
});

test.each(['microseismic', 'rainfall', 'strong_motion'])('invalid %s measurement is not normal zero data', async type => {
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': 'invalid' }] } });
  getRainfallData.mockResolvedValue({ success: true, data: { timeSeries: [{ datetime: now.toISOString(), hourly: null }] } });
  getStrongMotionData.mockResolvedValue({ success: true, data: { parsed: { metadata: { startTime: now.toISOString() }, timeSeries: [{ time: 0 }] } } });
  expectStatus(await request(type), 'empty', true);
});

test('strong motion uses historical header date instead of fetch timestamp', async () => {
  const startTime = '2025-04-25T01:58:06.700Z';
  getStrongMotionData.mockResolvedValue({ success: true, data: { timestamp: now.toISOString(), parsed: { metadata: { startTime }, timeSeries: [{ time: 0, acceleration: 0 }] } } });
  const payload = await request('earthquake');
  expectStatus(payload, 'historical', true);
  expect(payload.data).toMatchObject({ sourceDate: startTime, observedAt: startTime, values: [0] });
});

test('strong motion summary alone does not fabricate a waveform', async () => {
  getStrongMotionData.mockResolvedValue({ success: true, data: { timestamp: now.toISOString(), parsed: { pga: 1, timeSeries: [] } } });
  const payload = await request('strong_motion');
  expectStatus(payload, 'empty', true);
  expect(payload.data).toMatchObject({ pga: 1, values: [], time_series: [], labels: [] });
});

test('fresh heartbeat with earlier events today is ok without changing event time', async () => {
  const time = '2026-11-22-00-05-02';
  getDailyCatalog.mockResolvedValue({ success: true, data: { date: '20261122', records: [{ 'DateTime(UTC+0)': time, 'Time(sec)': '81' }] } });
  const payload = await request('microseismic');
  expectStatus(payload, 'ok', true);
  expect(payload.data).toMatchObject({ sourceDate: time, observedAt: '2026-11-22T00:05:02.000Z', flagsObservedAt: now.toISOString(), values: [81] });
});

test.each([undefined, 'invalid'])('legacy flags with timestamp %s are unknown, retaining event rows', async timestamp => {
  getWarningFlags.mockResolvedValue({ success: true, data: { warnings: [], alerts: [], timestamp } });
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': '81' }] } });
  const payload = await request('microseismic');
  expectStatus(payload, 'empty', true);
  expect(payload.data.values).toEqual([81]);
});

test('stale array heartbeat keeps fresh catalog event date and rows', async () => {
  const flagsObservedAt = '2026-11-21T14:00:05.000Z';
  getWarningFlags.mockResolvedValue({ success: true, data: [{ Measurements: [{ TimeStamp: '2026-11-21T22-00-05+08:00', Value: 0 }] }], observedAt: flagsObservedAt });
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': '81' }] } });
  const payload = await request('microseismic');
  expectStatus(payload, 'historical', true);
  expect(payload.data).toMatchObject({ sourceDate: '2026-11-22-03-59-00', observedAt: '2026-11-22T03:59:00.000Z', flagsObservedAt, values: [81] });
});

test('old catalog day remains historical even with a fresh heartbeat and recent event', async () => {
  getDailyCatalog.mockResolvedValue({ success: true, data: { date: '20261121', records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': '81' }] } });
  expectStatus(await request('microseismic'), 'historical', true);
});

test('rainfall epoch controls observation time, not conflicting wall-clock text', async () => {
  const datetime = '2026-11-21T20:00:00';
  getRainfallData.mockResolvedValue({ success: true, data: { timeSeries: [{ datetime, epoch: now.getTime() / 1000, hourly: 0 }], latest: { hourly: 0 } } });
  const payload = await request('rainfall');
  expectStatus(payload, 'ok', true);
  expect(payload.data).toMatchObject({ sourceDate: datetime, observedAt: now.toISOString(), values: [0] });
});

test('legacy rainfall without timezone is explicitly UTC', async () => {
  const datetime = '2026-11-22T04:00:00';
  getRainfallData.mockResolvedValue({ success: true, data: { timeSeries: [{ datetime, hourly: 0 }], latest: { hourly: 0 } } });
  const payload = await request('rainfall');
  expectStatus(payload, 'ok', true);
  expect(payload.data.observedAt).toBe(now.toISOString());
});

test('controller does not bypass rejected flag validation using raw timestamp', async () => {
  getWarningFlags.mockResolvedValue({ success: true, observedAt: null, data: { timestamp: now.toISOString() } });
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-22-03-59-00', 'Time(sec)': '81' }] } });
  expectStatus(await request('microseismic'), 'empty', true);
});

test('fresh heartbeat does not make future catalog events valid', async () => {
  getDailyCatalog.mockResolvedValue({ success: true, data: { records: [{ 'DateTime(UTC+0)': '2026-11-23-03-59-00', 'Time(sec)': '81' }] } });
  expectStatus(await request('microseismic'), 'empty', true);
});
