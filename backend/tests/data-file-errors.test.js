import { jest, test, expect, beforeEach } from '@jest/globals';

const findByPk = jest.fn();
jest.unstable_mockModule('../src/models/DataFile.js', () => ({ DataFile: { findByPk } }));
const controller = await import('../src/controllers/dataFileController.js');
const id = '11111111-1111-4111-8111-111111111111';
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => { jest.clearAllMocks(); });

for (const name of ['getDataFileById', 'updateDataFile', 'deleteDataFile', 'permanentDeleteDataFile', 'restoreDataFile']) {
  test(`${name} returns an error when its database operation fails`, async () => {
    findByPk.mockRejectedValue(new Error('isolated database failure'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = response();
    try {
      await controller[name]({ params: { id }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    } finally { log.mockRestore(); }
  });

  test(`${name} rejects invalid IDs before querying the database`, async () => {
    findByPk.mockResolvedValue(null);
    const res = response();
    await controller[name]({ params: { id: 'not-a-uuid' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(findByPk).not.toHaveBeenCalled();
  });
}
