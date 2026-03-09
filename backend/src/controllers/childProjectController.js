/**
 * 子專案控制器
 * 子專案代表時間週期（time period）
 * 屬於某個母專案（地點），包含實際的資料檔案和圖層
 */

import { pool } from '../config/database.js';
import { validateUUID } from '../utils/validators.js';

/**
 * 獲取特定母專案的所有子專案（時間軸）
 * GET /api/parent-projects/:parentId/children
 */
export const getChildProjectsByParent = async (req, res) => {
  try {
    const { parentId } = req.params;

    if (!validateUUID(parentId, res, '母專案 ID')) return;

    // 驗證母專案是否存在
    const parentCheck = await pool.query(`
      SELECT project_id, name FROM projects 
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [parentId]);

    if (parentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '母專案不存在'
      });
    }

    // 獲取子專案列表（按時間排序，優先使用 event_date）
    const result = await pool.query(`
      SELECT 
        c.project_id,
        c.name,
        c.description,
        c.parent_project_id,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_AsGeoJSON(c.location_geometry)::json 
          ELSE NULL 
        END as location_geometry,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_X(c.location_geometry::geometry) 
          ELSE NULL 
        END as longitude,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_Y(c.location_geometry::geometry) 
          ELSE NULL 
        END as latitude,
        c.start_date,
        c.end_date,
        c.event_date,
        c.status,
        c.priority,
        c.file_count,
        c.total_size,
        c.layer_count,
        c.tags,
        c.metadata,
        c.created_at,
        c.updated_at,
        -- 母專案資訊
        p.name as parent_name,
        p.location_name as parent_location_name,
        p.road_type as parent_road_type,
        p.road_number as parent_road_number,
        p.road_section as parent_road_section
      FROM projects c
      JOIN projects p ON c.parent_project_id = p.project_id
      WHERE c.parent_project_id = $1 
        AND c.deleted_at IS NULL
      ORDER BY c.event_date ASC NULLS LAST, c.start_date ASC NULLS LAST, c.created_at ASC
    `, [parentId]);

    res.json({
      success: true,
      data: {
        parent: parentCheck.rows[0],
        children: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('獲取子專案列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取子專案列表失敗',
    });
  }
};

/**
 * 獲取單個子專案詳情
 * GET /api/child-projects/:id
 */
export const getChildProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateUUID(id, res, '子專案 ID')) return;

    const result = await pool.query(`
      SELECT 
        c.project_id,
        c.name,
        c.description,
        c.parent_project_id,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_AsGeoJSON(c.location_geometry)::json 
          ELSE NULL 
        END as location_geometry,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_X(c.location_geometry::geometry) 
          ELSE NULL 
        END as longitude,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_Y(c.location_geometry::geometry) 
          ELSE NULL 
        END as latitude,
        c.start_date,
        c.end_date,
        c.event_date,
        c.status,
        c.priority,
        c.file_count,
        c.total_size,
        c.layer_count,
        c.tags,
        c.is_bookmarked,
        c.metadata,
        c.created_at,
        c.updated_at,
        -- 母專案完整資訊
        p.name as parent_name,
        p.description as parent_description,
        p.location_name as parent_location_name,
        CASE 
          WHEN p.location_geometry IS NOT NULL 
          THEN ST_AsGeoJSON(p.location_geometry)::json 
          ELSE NULL 
        END as parent_location_geometry,
        CASE 
          WHEN p.location_geometry IS NOT NULL 
          THEN ST_X(p.location_geometry::geometry) 
          ELSE NULL 
        END as parent_longitude,
        CASE 
          WHEN p.location_geometry IS NOT NULL 
          THEN ST_Y(p.location_geometry::geometry) 
          ELSE NULL 
        END as parent_latitude,
        p.road_type as parent_road_type,
        p.road_number as parent_road_number,
        p.road_section as parent_road_section
      FROM projects c
      JOIN projects p ON c.parent_project_id = p.project_id
      WHERE c.project_id = $1 
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '子專案不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('獲取子專案詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取子專案詳情失敗',
    });
  }
};

/**
 * 創建子專案（時間週期）
 * POST /api/parent-projects/:parentId/children
 */
export const createChildProject = async (req, res) => {
  try {
    const { parentId } = req.params;

    if (!validateUUID(parentId, res, '母專案 ID')) return;

    const {
      name,
      description,
      start_date,
      end_date,
      event_date,
      latitude,
      longitude,
      locationGeometry,
      tags,
      metadata
    } = req.body;

    // 驗證必填欄位
    if (!name || !event_date) {
      return res.status(400).json({
        success: false,
        message: '請提供子專案名稱和重要事件日期'
      });
    }

    // 驗證座標
    let geometryWKT = null;
    if (locationGeometry && locationGeometry.coordinates) {
      const [lng, lat] = locationGeometry.coordinates;
      if (isNaN(lng) || isNaN(lat)) {
        return res.status(400).json({
          success: false,
          message: '請提供有效的座標（經度和緯度）'
        });
      }
      geometryWKT = `POINT(${lng} ${lat})`;
    } else if (longitude && latitude) {
      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude);
      if (isNaN(lng) || isNaN(lat)) {
        return res.status(400).json({
          success: false,
          message: '請提供有效的座標（經度和緯度）'
        });
      }
      geometryWKT = `POINT(${lng} ${lat})`;
    } else {
      return res.status(400).json({
        success: false,
        message: '請提供座標（經度和緯度）'
      });
    }

    // 驗證母專案是否存在
    const parentCheck = await pool.query(`
      SELECT project_id, name, location_geometry
      FROM projects 
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [parentId]);

    if (parentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '母專案不存在'
      });
    }

    // 處理 event_date：如果是 YYYY-MM-DD 格式，轉換為完整的時間戳記
    let processedEventDate = event_date;
    if (typeof event_date === 'string') {
      // 檢查是否為 YYYY-MM-DD 格式
      if (/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        // 只有日期，轉換為 ISO 格式（使用本地時區的午夜時間）
        // PostgreSQL 會自動處理時區轉換
        processedEventDate = `${event_date}T00:00:00`;
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(event_date)) {
        // 已經是 ISO 格式，直接使用
        processedEventDate = event_date;
      }
    } else if (event_date instanceof Date) {
      // 如果是 Date 對象，轉換為 ISO 字串
      processedEventDate = event_date.toISOString();
    }
    
    console.log('處理 event_date:', {
      original: event_date,
      processed: processedEventDate,
      type: typeof event_date
    });

    // 如果有提供時間區間，驗證時間範圍
    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        success: false,
        message: '結束時間必須晚於開始時間'
      });
    }

    // 創建子專案
    const result = await pool.query(`
      INSERT INTO projects (
        name, 
        description, 
        parent_project_id,
        location_geometry,
        start_date,
        end_date,
        event_date,
        tags,
        metadata,
        status
      ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7::timestamp with time zone, $8, $9, 'active')
      RETURNING 
        project_id,
        name,
        description,
        parent_project_id,
        ST_AsGeoJSON(location_geometry)::json as location_geometry,
        ST_X(location_geometry::geometry) as longitude,
        ST_Y(location_geometry::geometry) as latitude,
        start_date,
        end_date,
        event_date,
        status,
        priority,
        file_count,
        total_size,
        layer_count,
        tags,
        created_at,
        updated_at
    `, [
      name,
      description,
      parentId,
      geometryWKT,
      start_date,
      end_date,
      processedEventDate,
      tags,
      metadata ? JSON.stringify(metadata) : null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '子專案創建成功'
    });
  } catch (error) {
    console.error('創建子專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建子專案失敗',
    });
  }
};

/**
 * 更新子專案
 * PUT /api/child-projects/:id
 */
export const updateChildProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateUUID(id, res, '子專案 ID')) return;

    const {
      name,
      description,
      start_date,
      end_date,
      event_date,
      latitude,
      longitude,
      locationGeometry,
      status,
      priority,
      tags,
      is_bookmarked,
      metadata
    } = req.body;

    // 構建更新查詢
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount}`);
      values.push(start_date);
      paramCount++;
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }

    if (event_date !== undefined) {
      // 處理 event_date：如果是 YYYY-MM-DD 格式，轉換為完整的時間戳記
      let processedEventDate = event_date;
      if (typeof event_date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
          processedEventDate = `${event_date}T00:00:00`;
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(event_date)) {
          processedEventDate = event_date;
        }
      } else if (event_date instanceof Date) {
        processedEventDate = event_date.toISOString();
      }
      
      console.log('更新 event_date:', {
        original: event_date,
        processed: processedEventDate,
        type: typeof event_date
      });
      
      updates.push(`event_date = $${paramCount}::timestamp with time zone`);
      values.push(processedEventDate);
      paramCount++;
    }

    // 處理座標更新
    if (locationGeometry || (longitude !== undefined && latitude !== undefined)) {
      let lng, lat;
      if (locationGeometry && locationGeometry.coordinates) {
        [lng, lat] = locationGeometry.coordinates;
      } else if (longitude !== undefined && latitude !== undefined) {
        lng = parseFloat(longitude);
        lat = parseFloat(latitude);
      }
      
      if (!isNaN(lng) && !isNaN(lat)) {
        const geometryWKT = `POINT(${lng} ${lat})`;
        updates.push(`location_geometry = ST_GeomFromText($${paramCount}, 4326)`);
        values.push(geometryWKT);
        paramCount++;
      }
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      values.push(tags);
      paramCount++;
    }

    if (is_bookmarked !== undefined) {
      updates.push(`is_bookmarked = $${paramCount}`);
      values.push(is_bookmarked);
      paramCount++;
    }

    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount}`);
      values.push(JSON.stringify(metadata));
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有提供要更新的欄位'
      });
    }

    // 驗證時間範圍（如果有更新時間）
    if (start_date && end_date) {
      if (new Date(end_date) <= new Date(start_date)) {
        return res.status(400).json({
          success: false,
          message: '結束時間必須晚於開始時間'
        });
      }
    }

    values.push(id);

    const result = await pool.query(`
      UPDATE projects
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $${paramCount} 
        AND parent_project_id IS NOT NULL 
        AND deleted_at IS NULL
      RETURNING 
        project_id,
        name,
        description,
        parent_project_id,
        ST_AsGeoJSON(location_geometry)::json as location_geometry,
        ST_X(location_geometry::geometry) as longitude,
        ST_Y(location_geometry::geometry) as latitude,
        start_date,
        end_date,
        event_date,
        status,
        priority,
        file_count,
        total_size,
        layer_count,
        tags,
        is_bookmarked,
        updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '子專案不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '子專案更新成功'
    });
  } catch (error) {
    console.error('更新子專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新子專案失敗',
    });
  }
};

/**
 * 刪除子專案（軟刪除）
 * DELETE /api/child-projects/:id
 */
export const deleteChildProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateUUID(id, res, '子專案 ID')) return;

    const result = await pool.query(`
      UPDATE projects
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE project_id = $1 
        AND parent_project_id IS NOT NULL 
        AND deleted_at IS NULL
      RETURNING project_id, parent_project_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '子專案不存在'
      });
    }

    res.json({
      success: true,
      message: '子專案刪除成功'
    });
  } catch (error) {
    console.error('刪除子專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除子專案失敗',
    });
  }
};

/**
 * 獲取所有子專案（平面視圖）
 * GET /api/child-projects
 */
export const getAllChildProjects = async (req, res) => {
  try {
    const { status, parentId } = req.query;

    let whereConditions = ['c.parent_project_id IS NOT NULL', 'c.deleted_at IS NULL', 'p.deleted_at IS NULL'];
    const values = [];
    let paramCount = 1;

    if (status) {
      whereConditions.push(`c.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (parentId) {
      whereConditions.push(`c.parent_project_id = $${paramCount}`);
      values.push(parentId);
      paramCount++;
    }

    const result = await pool.query(`
      SELECT 
        c.project_id,
        c.name,
        c.description,
        c.parent_project_id,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_AsGeoJSON(c.location_geometry)::json 
          ELSE NULL 
        END as location_geometry,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_X(c.location_geometry::geometry) 
          ELSE NULL 
        END as longitude,
        CASE 
          WHEN c.location_geometry IS NOT NULL 
          THEN ST_Y(c.location_geometry::geometry) 
          ELSE NULL 
        END as latitude,
        c.start_date,
        c.end_date,
        c.event_date,
        c.status,
        c.priority,
        c.file_count,
        c.total_size,
        c.layer_count,
        c.tags,
        c.is_bookmarked,
        c.created_at,
        c.updated_at,
        -- 母專案資訊
        p.name as parent_name,
        p.location_name as parent_location_name,
        p.road_number as parent_road_number
      FROM projects c
      JOIN projects p ON c.parent_project_id = p.project_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.event_date ASC NULLS LAST, c.start_date ASC NULLS LAST, c.created_at ASC
    `, values);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('獲取所有子專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取所有子專案失敗',
    });
  }
};

