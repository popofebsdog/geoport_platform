/**
 * 母專案控制器
 * 母專案代表地點（location）
 * 負責管理地點資訊和子專案容器
 */

import { pool } from '../config/database.js';

/**
 * 獲取所有母專案列表
 * GET /api/parent-projects
 */
export const getAllParentProjects = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.project_id,
        p.name,
        p.description,
        p.location_name,
        ST_X(p.location_geometry::geometry) as longitude,
        ST_Y(p.location_geometry::geometry) as latitude,
        p.road_type,
        p.road_number,
        p.road_section,
        p.is_parent,
        p.child_count,
        p.status,
        p.metadata,
        p.created_at,
        p.updated_at,
        -- 聚合子專案的時間範圍
        MIN(c.start_date) as earliest_start_date,
        MAX(c.end_date) as latest_end_date,
        -- 聚合統計
        COALESCE(SUM(c.file_count), 0) as total_file_count,
        COALESCE(SUM(c.total_size), 0) as total_size,
        COALESCE(SUM(c.layer_count), 0) as total_layer_count
      FROM projects p
      LEFT JOIN projects c ON c.parent_project_id = p.project_id AND c.deleted_at IS NULL
      WHERE (p.is_parent = TRUE OR p.parent_project_id IS NULL)
        AND p.deleted_at IS NULL
      GROUP BY p.project_id, p.name, p.description, p.location_name, p.location_geometry,
               p.road_type, p.road_number, p.road_section, p.is_parent, p.child_count, 
               p.status, p.metadata, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取母專案列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取母專案列表失敗',
      error: error.message
    });
  }
};

/**
 * 獲取單個母專案詳情
 * GET /api/parent-projects/:id
 */
export const getParentProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        p.project_id,
        p.name,
        p.description,
        p.location_name,
        ST_AsGeoJSON(p.location_geometry)::json as location_geometry,
        ST_X(p.location_geometry::geometry) as longitude,
        ST_Y(p.location_geometry::geometry) as latitude,
        p.road_type,
        p.road_number,
        p.road_section,
        p.is_parent,
        p.child_count,
        p.status,
        p.priority,
        p.tags,
        p.metadata,
        p.created_at,
        p.updated_at,
        -- 聚合子專案統計
        MIN(c.start_date) as earliest_start_date,
        MAX(c.end_date) as latest_end_date,
        COALESCE(SUM(c.file_count), 0) as total_file_count,
        COALESCE(SUM(c.total_size), 0) as total_size,
        COALESCE(SUM(c.layer_count), 0) as total_layer_count
      FROM projects p
      LEFT JOIN projects c ON c.parent_project_id = p.project_id AND c.deleted_at IS NULL
      WHERE p.project_id = $1 AND p.deleted_at IS NULL
      GROUP BY p.project_id, p.name, p.description, p.location_name, p.location_geometry,
               p.road_type, p.road_number, p.road_section, p.is_parent, p.child_count,
               p.status, p.priority, p.tags, p.metadata, p.created_at, p.updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '母專案不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('獲取母專案詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取母專案詳情失敗',
      error: error.message
    });
  }
};

/**
 * 創建母專案（地點）
 * POST /api/parent-projects
 */
export const createParentProject = async (req, res) => {
  try {
    const {
      name,
      description,
      location_name,
      locationGeometry, // { type: 'Point', coordinates: [lng, lat] }
      road_type,
      road_number,
      road_section,
      tags,
      metadata
    } = req.body;

    // 驗證必填欄位
    if (!name || !locationGeometry) {
      return res.status(400).json({
        success: false,
        message: '請提供專案名稱和地點座標'
      });
    }

    // 構建 PostGIS 幾何對象
    const geometryWKT = `POINT(${locationGeometry.coordinates[0]} ${locationGeometry.coordinates[1]})`;

    const result = await pool.query(`
      INSERT INTO projects (
        name, 
        description, 
        location_name,
        location_geometry,
        road_type,
        road_number,
        road_section,
        is_parent,
        tags,
        metadata,
        status
      ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7, FALSE, $8, $9, 'active')
      RETURNING 
        project_id,
        name,
        description,
        location_name,
        ST_AsGeoJSON(location_geometry)::json as location_geometry,
        ST_X(location_geometry::geometry) as longitude,
        ST_Y(location_geometry::geometry) as latitude,
        road_type,
        road_number,
        road_section,
        is_parent,
        child_count,
        status,
        created_at,
        updated_at
    `, [
      name,
      description,
      location_name,
      geometryWKT,
      road_type,
      road_number,
      road_section,
      tags,
      metadata ? JSON.stringify(metadata) : null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '母專案創建成功'
    });
  } catch (error) {
    console.error('創建母專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建母專案失敗',
      error: error.message
    });
  }
};

/**
 * 更新母專案
 * PUT /api/parent-projects/:id
 */
export const updateParentProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      location_name,
      locationGeometry,
      road_type,
      road_number,
      road_section,
      status,
      tags,
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

    if (location_name !== undefined) {
      updates.push(`location_name = $${paramCount}`);
      values.push(location_name);
      paramCount++;
    }

    if (locationGeometry) {
      const geometryWKT = `POINT(${locationGeometry.coordinates[0]} ${locationGeometry.coordinates[1]})`;
      updates.push(`location_geometry = ST_GeomFromText($${paramCount}, 4326)`);
      values.push(geometryWKT);
      paramCount++;
    }

    if (road_type !== undefined) {
      updates.push(`road_type = $${paramCount}`);
      values.push(road_type);
      paramCount++;
    }

    if (road_number !== undefined) {
      updates.push(`road_number = $${paramCount}`);
      values.push(road_number);
      paramCount++;
    }

    if (road_section !== undefined) {
      updates.push(`road_section = $${paramCount}`);
      values.push(road_section);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      values.push(tags);
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

    values.push(id);

    const result = await pool.query(`
      UPDATE projects
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $${paramCount} AND deleted_at IS NULL
      RETURNING 
        project_id,
        name,
        description,
        location_name,
        ST_AsGeoJSON(location_geometry)::json as location_geometry,
        ST_X(location_geometry::geometry) as longitude,
        ST_Y(location_geometry::geometry) as latitude,
        road_type,
        road_number,
        road_section,
        is_parent,
        child_count,
        status,
        updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '母專案不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '母專案更新成功'
    });
  } catch (error) {
    console.error('更新母專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新母專案失敗',
      error: error.message
    });
  }
};

/**
 * 刪除母專案（軟刪除）
 * DELETE /api/parent-projects/:id
 */
export const deleteParentProject = async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查是否有子專案
    const childCheck = await pool.query(`
      SELECT COUNT(*) as child_count
      FROM projects
      WHERE parent_project_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (parseInt(childCheck.rows[0].child_count) > 0) {
      return res.status(400).json({
        success: false,
        message: '無法刪除有子專案的母專案，請先刪除所有子專案'
      });
    }

    const result = await pool.query(`
      UPDATE projects
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE project_id = $1 AND deleted_at IS NULL
      RETURNING project_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '母專案不存在'
      });
    }

    res.json({
      success: true,
      message: '母專案刪除成功'
    });
  } catch (error) {
    console.error('刪除母專案錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除母專案失敗',
      error: error.message
    });
  }
};

