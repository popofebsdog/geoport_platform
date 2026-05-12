/**
 * 子專案影像紀錄控制器
 * 管理子專案的照片與影片上傳、查詢、刪除
 * 複用 image_records 資料表，以 metadata.source = 'child_project' 區分
 */

import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import { createMulterFileFilter, createStoredFilename, maxUploadSize } from '../config/uploadPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────── Multer 設定 ───────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'data', 'child-project-media');
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch(cb);
  },
  filename: (req, file, cb) => {
    cb(null, createStoredFilename('child-media', file.originalname));
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: maxUploadSize('media') },
  fileFilter: createMulterFileFilter('media')
});

// ─────────────────── 工具函式 ───────────────────

const resolveStoragePath = (storagePath) => {
  if (!storagePath) return null;
  const relative = storagePath.startsWith('/uploads/')
    ? storagePath.substring('/uploads/'.length)
    : storagePath;
  return path.join(process.cwd(), 'uploads', relative);
};

// ─────────────────── Controllers ───────────────────

/**
 * GET /api/child-projects/:projectId/media
 * 取得子專案的所有媒體紀錄
 */
export const getChildProjectMedia = async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         media_id,
         media_type,
         original_name,
         file_size,
         mime_type,
         storage_path,
         created_at
       FROM image_records
       WHERE project_id = $1
         AND deleted_at IS NULL
         AND metadata->>'source' = 'child_project'
       ORDER BY created_at DESC`,
      [projectId]
    );

    const mediaList = result.rows.map(row => ({
      id: row.media_id,
      type: row.media_type === 'video' ? 'video' : 'image',
      name: row.original_name,
      size: row.file_size,
      mimeType: row.mime_type,
      url: row.storage_path,
      thumbnail: row.media_type === 'image' ? row.storage_path : null,
      createdAt: row.created_at
    }));

    res.json({ success: true, data: mediaList });
  } catch (error) {
    console.error('取得子專案媒體失敗:', error);
    res.status(500).json({ success: false, message: '取得影像紀錄失敗' });
  }
};

/**
 * POST /api/child-projects/:projectId/media
 * 上傳照片或影片
 * FormData field: file (multiple allowed)
 */
export const uploadChildProjectMedia = async (req, res) => {
  const { projectId } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: '未收到檔案' });
  }

  try {
    const inserted = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const storagePath = `/uploads/data/child-project-media/${file.filename}`;

      const result = await pool.query(
        `INSERT INTO image_records (
           project_id,
           media_type,
           file_name,
           original_name,
           file_extension,
           mime_type,
           file_size,
           storage_path,
           metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING media_id, created_at`,
        [
          projectId,
          mediaType,
          file.filename,
          file.originalname,
          ext,
          file.mimetype,
          file.size,
          storagePath,
          JSON.stringify({ source: 'child_project', uploaded_at: new Date().toISOString() })
        ]
      );

      const row = result.rows[0];
      inserted.push({
        id: row.media_id,
        type: mediaType,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url: storagePath,
        thumbnail: mediaType === 'image' ? storagePath : null,
        createdAt: row.created_at
      });
    }

    res.status(201).json({
      success: true,
      message: `已上傳 ${inserted.length} 個檔案`,
      data: inserted
    });
  } catch (error) {
    console.error('上傳子專案媒體失敗:', error);
    res.status(500).json({ success: false, message: '上傳失敗' });
  }
};

/**
 * DELETE /api/child-projects/:projectId/media/:mediaId
 * 刪除單筆媒體（soft delete DB + hard delete 實體檔）
 */
export const deleteChildProjectMedia = async (req, res) => {
  const { projectId, mediaId } = req.params;

  try {
    // 查詢確認存在且屬於此子專案
    const findResult = await pool.query(
      `SELECT media_id, storage_path
       FROM image_records
       WHERE media_id = $1
         AND project_id = $2
         AND deleted_at IS NULL
         AND metadata->>'source' = 'child_project'`,
      [mediaId, projectId]
    );

    if (findResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '影像紀錄不存在' });
    }

    const media = findResult.rows[0];

    // 刪除實體檔
    if (media.storage_path) {
      const fullPath = resolveStoragePath(media.storage_path);
      if (fullPath) {
        try {
          await fs.unlink(fullPath);
        } catch {
          // 檔案不存在時忽略
        }
      }
    }

    // Soft delete DB 紀錄
    await pool.query(
      `UPDATE image_records
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE media_id = $1`,
      [mediaId]
    );

    res.json({ success: true, message: '影像紀錄已刪除' });
  } catch (error) {
    console.error('刪除子專案媒體失敗:', error);
    res.status(500).json({ success: false, message: '刪除失敗' });
  }
};
