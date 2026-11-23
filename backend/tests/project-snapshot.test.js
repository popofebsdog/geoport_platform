import { jest, test, expect, afterEach } from '@jest/globals';
import { monitoringDTO, cleanInspection, getProjectSnapshot } from '../src/services/projectSnapshotService.js';
import { Project } from '../src/models/Project.js';
import { DataFile } from '../src/models/DataFile.js';
import { WarningRegion, WarningRegionLayer } from '../src/models/WarningRegionLayer.js';
import { PublicationDisasterPoint, PublicationMedia, PublicationInspection, PublicationAlert } from '../src/models/PublicationRecords.js';

afterEach(() => jest.restoreAllMocks());

test('empty and boolean observations remain unknown, not false zeroes', () => {
  const result = monitoringDTO({ data: { time_series: [{ value: '', hourly: false, acceleration: ' ', absAcceleration: '2.5' }] } });
  expect(result.time_series[0]).toMatchObject({ value: null, hourly: null, acceleration: null, absAcceleration: 2.5 });
});
test('inspection DTO strips credentials and local storage references', () => {
  expect(cleanInspection({ token: 'private', nested: { storage_path: 'uploads/private', notes: '現地紀錄' }, photo: '/uploads/a.jpg' }))
    .toEqual({ nested: { notes: '現地紀錄' }, photo: '[附件]' });
});
test('bounded inspection strings explicitly disclose their omitted source text', () => {
  const value = cleanInspection({ description: '長'.repeat(2001) }).description;
  expect(value).toContain('節錄');
  expect(value).toContain('原始紀錄');
  expect(value.length).toBeLessThan(2100);
});
test('rainfall keeps validated observation times and falls back to epoch, never naive local time', () => {
  const result = monitoringDTO({ data: { time_series: [
    { datetime: '2026-11-22 01:00:00', observedAt: '2026-11-22T01:00:00Z' },
    { datetime: '2026-11-22 02:00:00', epoch: Date.parse('2026-11-22T02:00:00Z') / 1000 },
    { datetime: '2026-11-22 03:00:00', observedAt: 'invalid', epoch: null }
  ] } });
  expect(result.time_series.map(row => row.observedAt)).toEqual(['2026-11-22T01:00:00.000Z', '2026-11-22T02:00:00.000Z', null]);
  expect(result.time_series[2].datetime).toBe('2026-11-22 03:00:00');
});
test('monitoring previews disclose when their source exceeds the sample limit', () => {
  const result = monitoringDTO({ data: { time_series: Array.from({ length: 10001 }, (_, time) => ({ time, acceleration: 1 })) } });
  expect(result.time_series).toHaveLength(10000);
  expect(result.sourcePointCount).toBe(10001);
  expect(result.truncated).toBe(true);
});
test('snapshot keeps photo capture and upload provenance distinct and includes the report contract', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  jest.spyOn(Project, 'findByPk').mockResolvedValue({ projectId: id, name: '現地紀錄' });
  jest.spyOn(Project, 'findAll').mockResolvedValue([]);
  jest.spyOn(PublicationDisasterPoint, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
  jest.spyOn(DataFile, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
  jest.spyOn(PublicationMedia, 'findAndCountAll').mockResolvedValue({ count: 1, rows: [
    { media_id: 'm1', project_id: id, original_name: 'photo.jpg', mime_type: 'image/jpeg', taken_at: null, created_at: '2026-11-22T01:00:00Z' }
  ] });
  const result = await getProjectSnapshot('disaster', id);
  expect(result.media[0]).toMatchObject({ takenAt: null, uploadedAt: '2026-11-22T01:00:00Z' });
  expect(result.report.photos[0].caption).toContain('拍攝時間：未提供');
  expect(result.media[0].sourceProjectId).toBe(id);
  expect(result.report.sections).toHaveLength(6);
});
test('snapshot does not substitute a registration timestamp for a missing inspection date', async () => {
  const id = '22222222-2222-4222-8222-222222222222';
  jest.spyOn(WarningRegion, 'findOne').mockResolvedValue({ region_id: id, region_name: '未填巡查日期', region_code: 'isolated-report-no-source' });
  jest.spyOn(PublicationInspection, 'findAndCountAll').mockResolvedValue({ count: 1, rows: [
    { record_id: 'r1', inspection_date: null, created_at: '2026-11-22T00:00:00Z', inspection_data: {} }
  ] });
  jest.spyOn(PublicationAlert, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
  jest.spyOn(WarningRegionLayer, 'findAndCountAll').mockResolvedValue({ count: 201, rows: Array.from({ length: 200 }, (_, index) => ({ layer_id: `layer${index}`, layer_name: '圖層' })) });
  const result = await getProjectSnapshot('warning', id);
  expect(result.records[0]).toMatchObject({ inspectionDate: null, time: null, registeredAt: '2026-11-22T00:00:00Z' });
  expect(result.layers).toHaveLength(200);
  expect(result.counts['圖層']).toBe(201);
  expect(result.report.sections.at(-1).paragraphs).toContain('圖層 共 201 筆，本次列出前 200 筆');
});
