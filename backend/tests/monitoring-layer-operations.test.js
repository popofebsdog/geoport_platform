import { jest, beforeEach, test, expect } from '@jest/globals';

const regionFindAll = jest.fn(), regionFindOne = jest.fn(), layerCreate = jest.fn(), layerFindOne = jest.fn();
const query = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({
  pool: { query }, sequelize: { define: name => name === 'WarningRegion' ? { findAll: regionFindAll, findOne: regionFindOne } : { create: layerCreate, findOne: layerFindOne } }
}));
const { upsertRegionLayer } = await import('../src/controllers/warningRegionController.js');
const regionId = '529e7dd0-b563-4fc8-a4b3-ac9aa7d132e7';
const layerId = '31614b13-0e36-4a86-8f31-db947c1da7ee';
beforeEach(() => {
  jest.resetAllMocks();
  regionFindOne.mockResolvedValue({ region_id: regionId });
  regionFindAll.mockResolvedValue([{ region_id: regionId }]);
  layerCreate.mockImplementation(async data => ({ layer_id: layerId, ...data }));
  query.mockResolvedValue({ rows: [{ layer_id: layerId }] });
});
const request = (body = {}) => ({ params: { regionCode: '台8臨37線' }, body: { layer_type: 'hotspot', layer_name: '台8熱點', storage_path: 'uploads/monitoring/t8/hitmap.tif', region_id: regionId, ...body } });
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

test('upload binds hotspot to the selected region id using ORM', async () => {
  const req = request(), res = response();
  await upsertRegionLayer(req, res);
  expect(layerCreate).toHaveBeenCalledWith(expect.objectContaining({ region_id: regionId, region_code: '台8臨37線', layer_type: 'hotspot' }));
  expect(query).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(201);
});
test('same-code projects require explicit region id rather than ambiguous binding', async () => {
  regionFindAll.mockResolvedValue([{ region_id: regionId }, { region_id: 'other' }]);
  const req = request({ region_id: undefined }), res = response();
  await upsertRegionLayer(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(layerCreate).not.toHaveBeenCalled();
});
test('a mismatched region id cannot upload to another region code', async () => {
  regionFindOne.mockResolvedValue(null);
  const res = response();
  await upsertRegionLayer(request(), res);
  expect(res.status).toHaveBeenCalledWith(404);
});
test('updating a layer is scoped to its selected region', async () => {
  layerFindOne.mockResolvedValue(null);
  const req = request(), res = response();
  req.params.layerId = layerId;
  await upsertRegionLayer(req, res);
  expect(layerFindOne).toHaveBeenCalledWith(expect.objectContaining({ where: { layer_id: layerId, region_id: regionId } }));
  expect(res.status).toHaveBeenCalledWith(404);
});

test('legacy upload is bound when exactly one active region matches', async () => {
  const res = response();
  await upsertRegionLayer(request({ region_id: undefined }), res);
  expect(layerCreate).toHaveBeenCalledWith(expect.objectContaining({ region_id: regionId }));
});

test.each([{ layer_type: 'disaster' }, { display_config: '{invalid' }])('invalid layer metadata is rejected without a write: %p', async body => {
  const res = response();
  await upsertRegionLayer(request(body), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(layerCreate).not.toHaveBeenCalled();
});

test('valid updates preserve their region binding and file when metadata alone changes', async () => {
  const layer = { update: jest.fn() };
  layerFindOne.mockResolvedValue(layer);
  const req = request({ storage_path: undefined, display_config: '{"opacity":0.5}' }), res = response();
  req.params.layerId = layerId;
  await upsertRegionLayer(req, res);
  expect(layer.update).toHaveBeenCalledWith({ layer_type: 'hotspot', layer_name: '台8熱點', display_config: { opacity: 0.5 } });
});
