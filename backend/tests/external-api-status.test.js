import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';

const get = jest.fn();
jest.unstable_mockModule('axios', () => ({ default: { create: () => ({ get }) } }));
jest.unstable_mockModule('../src/utils/logger.js', () => ({ createLogger: () => ({ warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) }));
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query: jest.fn(async () => ({ rows: [{ region_id: 'region-id', api_config: {} }] })) } }));
const { MicroseismicApiService, RainfallEarthquakeApiService } = await import('../src/services/externalApiService.js');
const { getWarningRegionData } = await import('../src/controllers/warningRegionController.js');
beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.useRealTimers());

test.each([404, 503])('directory failure preserves upstream status %s', async status => {
  get.mockRejectedValue({ message: 'upstream failed', response: { status } });
  expect(await new RainfallEarthquakeApiService().getStrongMotionDirectoryList()).toMatchObject({ success: false, statusCode: status, timestamps: [] });
});

test.each(['flags', 'catalog', 'rainfall', 'directory', 'waveform'])('%s shares the caller request deadline', async kind => {
  const signal = AbortSignal.timeout(25000);
  const micro = new MicroseismicApiService('http://example.test', { signal });
  const rain = new RainfallEarthquakeApiService('http://example.test', { signal });
  get.mockResolvedValue({ data: kind === 'flags' ? { warnings: [] } : '', headers: {} });
  const calls = {
    flags: () => micro.getWarningFlags(), catalog: () => micro.getDailyCatalog(new Date()),
    rainfall: () => rain.getRainfallData(new Date()), directory: () => rain.getStrongMotionDirectoryList(),
    waveform: () => rain.getStrongMotionData(new Date())
  };
  await calls[kind]();
  expect(get).toHaveBeenCalled();
  for (const [, options] of get.mock.calls) expect(options.signal).toBe(signal);
});

test.each([
  '2026-11-22T04:00:00 invalid invalid',
  '0 10942 -63 invalid invalid 321 2026-11-22T04:00:00 1763337600 1'
])('rainfall parser does not turn invalid measurements into zero: %s', async text => {
  get.mockResolvedValue({ data: text });
  const result = await new RainfallEarthquakeApiService().getRainfallData(new Date());
  expect(result.data.timeSeries).toEqual([]);
  expect(result.data.latest).toBeNull();
});

test('strong motion parser retains a real zero peak and waveform', async () => {
  get.mockResolvedValueOnce({ data: '#DataSequence:\n0.000 0.0 0.0 0.0' }).mockResolvedValueOnce({ data: 'PGA 0.0 gal' });
  const result = await new RainfallEarthquakeApiService().getStrongMotionData(new Date());
  expect(result.data.pga).toBe(0);
  expect(result.data.parsed.timeSeries).toHaveLength(1);
});

test('empty warning flags do not fabricate a current observation timestamp', async () => {
  get.mockResolvedValue({ data: null });
  const result = await new MicroseismicApiService().getWarningFlags();
  expect(result.data).toBeNull();
});

const flagTime = '2026-11-21T22-00-05+08:00';
const flags = [{ Station: 'DH3A', Measurements: [{ Name: 'FLAG', TimeStamp: flagTime, Value: 0 }] }];
test.each(['text', 'object', 'zero-padded'])('normalizes %s flag array and preserves its shape', async kind => {
  const text = JSON.stringify(flags);
  get.mockResolvedValue({ data: kind === 'object' ? flags : kind === 'zero-padded' ? text.replace('"Value":0', '"Value":000') : text });
  const result = await new MicroseismicApiService().getWarningFlags();
  expect(result).toMatchObject({ success: true, data: flags, observedAt: '2026-11-21T14:00:05.000Z' });
});

test.each([
  '[{"Measurements":[{"TimeStamp":"2026-11-21T22-00-05+08:00","Value":000}],}]',
  '[{"Measurements":[{"TimeStamp":"2026-11-21T22-00-05+08:00","Other":000}]}]',
  'not json', '"not an object"'
])('unrecognized malformed flags remain errors: %s', async data => {
  get.mockResolvedValue({ data });
  expect(await new MicroseismicApiService().getWarningFlags()).toMatchObject({ success: false });
});

test.each([undefined, 'invalid'])('array flag timestamp %s cannot be fresh', async TimeStamp => {
  get.mockResolvedValue({ data: [{ Measurements: [{ TimeStamp, Value: 0 }] }] });
  const result = await new MicroseismicApiService().getWarningFlags();
  expect(result.observedAt ?? null).toBeNull();
});

test('a newer station cannot hide a stale station heartbeat', async () => {
  get.mockResolvedValue({ data: [...flags, { Measurements: [{ TimeStamp: '2026-11-22T12-00-00+08:00', Value: 0 }] }] });
  const result = await new MicroseismicApiService().getWarningFlags();
  expect(result.observedAt).toBe('2026-11-21T14:00:05.000Z');
});

test('rain TXT retains epoch and UTC observation time without changing original date text', async () => {
  get.mockResolvedValue({ data: '0 10942 -63 0.00 0.00 146 2026-05-26T00:00:00 1779753600 1' });
  const result = await new RainfallEarthquakeApiService().getRainfallData('2026-05-26');
  expect(result.data.timeSeries[0]).toMatchObject({ datetime: '2026-05-26T00:00:00', epoch: 1779753600, observedAt: '2026-05-26T00:00:00.000Z', hourly: 0 });
  expect(result.data.latest).toMatchObject({ epoch: 1779753600, observedAt: '2026-05-26T00:00:00.000Z' });
});

test.each(['2026-05-26T00:00:00', '2026-05-26T08:00:00+08:00'])('legacy rain timestamp %s has stable UTC meaning', async time => {
  get.mockResolvedValue({ data: `${time} 0 0` });
  const result = await new RainfallEarthquakeApiService().getRainfallData('2026-05-26');
  expect(result.data.timeSeries[0].observedAt).toBe('2026-05-26T00:00:00.000Z');
});

test.each([
  ['2026-11-22T12-00-00+08:00', '2026-11-22-00-05-02', 'ok'],
  [flagTime, '2026-11-22-03-59-00', 'historical'],
  ['2026-11-22T12-00-00+08:00', '2026-11-21-23-59-00', 'historical'],
  [undefined, '2026-11-22-03-59-00', 'empty']
])('real FLAG feed %s and catalog event %s produce %s without losing rows', async (TimeStamp, event, status) => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-22T04:00:00Z'));
  const { pool } = await import('../src/config/database.js');
  pool.query.mockResolvedValue({ rows: [{ region_id: 'region-id', api_config: {} }] });
  const raw = JSON.stringify([{ Measurements: [{ TimeStamp, Value: 0 }] }]).replace('"Value":0', '"Value":000');
  get.mockResolvedValueOnce({ data: raw }).mockResolvedValueOnce({ data: `No,DateTime(UTC+0),Time(sec),Type\n1,${event},+ 81,NOISE` });
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getWarningRegionData({ params: { regionCode: 'taiwan7' }, query: { dataType: 'microseismic', useExternalApi: 'true' } }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, dataStatus: status, data: expect.objectContaining({ sourceDate: event, values: [81], warningFlags: [{ Measurements: [{ ...(TimeStamp ? { TimeStamp } : {}), Value: 0 }] }] }) }));
});

test('timestamp-only flag object is not a validated heartbeat', async () => {
  get.mockResolvedValue({ data: { timestamp: '2026-11-22T04:00:00Z' } });
  expect(await new MicroseismicApiService().getWarningFlags()).toMatchObject({ observedAt: null });
});
