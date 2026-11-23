import { jest, beforeEach, test, expect } from '@jest/globals';

const query = jest.fn();
const findAll = jest.fn();
const reportLinks = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query } }));
jest.unstable_mockModule('../src/models/Project.js', () => ({ Project: { findAll } }));
jest.unstable_mockModule('../src/models/ProjectReportLink.js', () => ({ ProjectReportLink: { findAll: reportLinks } }), { virtual: true });
const { getAllParentProjects } = await import('../src/controllers/parentProjectController.js');
beforeEach(() => { jest.resetAllMocks(); reportLinks.mockResolvedValue([]); });

test('parent list includes persisted bookmark state without changing aggregate metadata', async () => {
  query.mockResolvedValue({ rows: [{ project_id: 'a', name: 'Alpha', child_count: 2, metadata: { reportLinks: [] } }, { project_id: 'b', name: 'Beta' }] });
  findAll.mockResolvedValue([{ projectId: 'a', isBookmarked: true }, { projectId: 'b', isBookmarked: false }]);
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getAllParentProjects({}, res);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: [
    { project_id: 'a', name: 'Alpha', child_count: 2, metadata: { reportLinks: [] }, is_bookmarked: true },
    { project_id: 'b', name: 'Beta', is_bookmarked: false, metadata: { reportLinks: [] } }
  ] });
  expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ attributes: ['projectId', 'isBookmarked'], where: { projectId: ['a', 'b'] } }));
});

test('parent cards use the canonical report table instead of stale metadata', async () => {
  query.mockResolvedValue({ rows: [{ project_id: 'a', name: 'Alpha', metadata: { note: 'keep', reportLinks: [{ id: 'old' }] } }] });
  findAll.mockResolvedValue([]);
  const link = { id: 'new', project_id: 'a', title: 'Current report', url: 'https://example.org/report' };
  reportLinks.mockResolvedValue([link]);
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getAllParentProjects({}, res);
  expect(res.json.mock.calls[0][0].data[0].metadata).toEqual({ note: 'keep', reportLinks: [link] });
});

test('empty parent list does not require an extra bookmark read', async () => {
  query.mockResolvedValue({ rows: [] });
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getAllParentProjects({}, res);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  expect(findAll).not.toHaveBeenCalled();
});
