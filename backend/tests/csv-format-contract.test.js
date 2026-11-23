import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const query = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query } }));
jest.unstable_mockModule('dotenv', () => ({ default: { config() {} } }));
let root, previousEnv, parser, enhanced;
beforeEach(async () => {
  jest.resetModules(); jest.clearAllMocks();
  previousEnv = process.env;
  root = await fs.mkdtemp(path.join(tmpdir(), 'geoport-csv-'));
  process.env = { ...previousEnv, UPLOADS_ROOT: root, DATA_ROOT: path.join(root, 'data') };
  parser = await import('../src/controllers/temporalDataParserController.js');
  enhanced = await import('../src/controllers/temporalDataEnhancedController.js');
  query.mockResolvedValue({ rows: [{ temporal_id: 'fixture', storage_path: 'uploads/test.csv', name: 'CSV', x_axis_columns: ['step'], y_axis_columns: ['value'] }] });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => { process.env = previousEnv; jest.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const request = { params: { temporalId: 'fixture' }, body: { xAxisColumns: ['step'], yAxisColumns: ['value'] } };

test.each(['\uFEFFstep,value\r\n0,0\r\n1,2.5\r\n', 'step,value\r\n0,0\r\n1,2.5\r\n'])('CSV BOM/CRLF parsing preserves zero observations and the first column', async text => {
  await fs.writeFile(path.join(root, 'test.csv'), text);
  const res = response(); await parser.parseCSVForCharting(request, res);
  expect(res.json.mock.calls[0][0].data.chartData.datasets[0].data).toEqual([{ x: 0, y: 0 }, { x: 1, y: 2.5 }]);
});

test('header-only CSV returns available columns promptly instead of hanging', async () => {
  await fs.writeFile(path.join(root, 'test.csv'), '\uFEFFstep,value\r\n');
  const res = response();
  await Promise.race([parser.getAvailableColumns(request, res), new Promise(done => setTimeout(done, 100))]);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ columns: ['step', 'value'] }) }));
});

test.each(['legacy', 'enhanced'])('%s CSV numeric parsing does not turn junk or Infinity into measurements', async mode => {
  await fs.writeFile(path.join(root, 'test.csv'), 'step,value\n0,0\n1,1.5mm\n2,Infinity\n3,"1,234.5"\n4,\n5,-2.5\n');
  const res = response();
  await (mode === 'legacy' ? parser.parseCSVForCharting : enhanced.getChartData)(request, res);
  const data = res.json.mock.calls[0][0].data.chartData.datasets[0].data;
  expect(data.map(point => point.y)).toEqual([0, 1234.5, -2.5]);
});

test.each(['legacy', 'enhanced'])('%s CSV rejects malformed row lengths and missing selected columns', async mode => {
  const run = mode === 'legacy' ? parser.parseCSVForCharting : enhanced.getChartData;
  await fs.writeFile(path.join(root, 'test.csv'), 'step,value\n0,1,extra\n');
  const res = response(); await run(request, res);
  expect(res.status).toHaveBeenCalledWith(400);
  await fs.writeFile(path.join(root, 'test.csv'), 'wrong,value\n0,1\n');
  const second = response(); await run(request, second);
  expect(second.status).toHaveBeenCalledWith(400);
});

test('CSV skips blank records but preserves blank lines inside quoted field values', async () => {
  await fs.writeFile(path.join(root, 'test.csv'), '\n  \nstep,note,value\n0,"line one\n\nline three",1\n\n  \n1,plain,2\n');
  const res = response(); await parser.parseCSVForCharting(request, res);
  expect(res.json.mock.calls[0][0].data.chartData.datasets[0].data).toEqual([{ x: 0, y: 1 }, { x: 1, y: 2 }]);
});
