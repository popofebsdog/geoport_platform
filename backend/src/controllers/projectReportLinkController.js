/**
 * 專案報告連結控制器
 * 管理母專案關聯的外部報告網址
 */

import { pool } from '../config/database.js';

/**
 * 取得專案的所有報告連結
 * GET /api/parent-projects/:id/report-links
 */
export const getReportLinks = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, project_id, title, url, created_at
       FROM project_report_links
       WHERE project_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('取得報告連結失敗:', error);
    res.status(500).json({ success: false, message: '取得報告連結失敗', error: error.message });
  }
};

/**
 * 新增報告連結
 * POST /api/parent-projects/:id/report-links
 */
export const createReportLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;

    if (!title || !url) {
      return res.status(400).json({ success: false, message: '標題和網址為必填欄位' });
    }

    // 確認母專案存在
    const projectCheck = await pool.query(
      'SELECT project_id FROM projects WHERE project_id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '母專案不存在' });
    }

    const result = await pool.query(
      `INSERT INTO project_report_links (project_id, title, url)
       VALUES ($1, $2, $3)
       RETURNING id, project_id, title, url, created_at`,
      [id, title.trim(), url.trim()]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: '報告連結新增成功' });
  } catch (error) {
    console.error('新增報告連結失敗:', error);
    res.status(500).json({ success: false, message: '新增報告連結失敗', error: error.message });
  }
};

/**
 * 更新報告連結
 * PUT /api/parent-projects/:id/report-links/:linkId
 */
export const updateReportLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const { title, url } = req.body;

    if (!title || !url) {
      return res.status(400).json({ success: false, message: '標題和網址為必填欄位' });
    }

    const result = await pool.query(
      `UPDATE project_report_links
       SET title = $1, url = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND project_id = $4
       RETURNING id, project_id, title, url, created_at, updated_at`,
      [title.trim(), url.trim(), linkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '報告連結不存在' });
    }

    res.json({ success: true, data: result.rows[0], message: '報告連結已更新' });
  } catch (error) {
    console.error('更新報告連結失敗:', error);
    res.status(500).json({ success: false, message: '更新報告連結失敗', error: error.message });
  }
};

/**
 * 刪除報告連結
 * DELETE /api/parent-projects/:id/report-links/:linkId
 */
export const deleteReportLink = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const result = await pool.query(
      `DELETE FROM project_report_links
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [linkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '報告連結不存在' });
    }

    res.json({ success: true, message: '報告連結已刪除' });
  } catch (error) {
    console.error('刪除報告連結失敗:', error);
    res.status(500).json({ success: false, message: '刪除報告連結失敗', error: error.message });
  }
};
