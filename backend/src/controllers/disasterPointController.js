/**
 * 災點紀錄控制器
 * 處理災點紀錄的 CRUD 操作
 */

import { pool } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// 配置 multer 用於上傳媒體文件
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // 驗證 project_id 格式（UUID），防止 path traversal
    const rawProjectId = req.body.project_id || 'default';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeProjectId = (rawProjectId === 'default' || uuidRegex.test(rawProjectId))
      ? rawProjectId
      : 'default';
    const uploadDir = path.join(process.cwd(), 'uploads', 'data', 'disaster-points', path.basename(safeProjectId));
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // 保存原始文件名（UTF-8编码）用于数据库存储
    // 但实际存储的文件名使用安全格式避免编码问题
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `disaster-${uniqueSuffix}${ext}`);
  }
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片或影片檔案'), false);
    }
  },
  // 保持原始文件名，用於處理 UTF-8 編碼
  preservePath: false
});

/**
 * 獲取專案的所有災點紀錄
 * GET /api/disaster-points/project/:projectId
 */
export const getDisasterPointsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // 驗證專案是否存在
    const projectCheck = await pool.query(`
      SELECT project_id, name FROM projects 
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [projectId]);

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '專案不存在'
      });
    }

    // 獲取災點紀錄列表（包含專案資訊）
    const result = await pool.query(`
      SELECT 
        dp.disaster_point_id,
        dp.project_id,
        dp.name,
        dp.description,
        dp.disaster_time,
        dp.latitude,
        dp.longitude,
        ST_AsGeoJSON(dp.location_geometry)::json as location_geometry,
        dp.metadata,
        dp.created_at,
        dp.updated_at,
        -- 專案資訊
        jsonb_build_object(
          'project_id', p.project_id,
          'project_name', p.name,
          'project_description', p.description,
          'project_type', p.project_type,
          'is_parent', p.is_parent,
          'parent_project_id', p.parent_project_id
        ) as project_info,
        -- 獲取關聯的媒體文件（過濾已刪除且 storage_path 不為 null 的）
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'media_id', ir.media_id,
              'media_type', ir.media_type,
              'file_name', ir.file_name,
              'original_name', ir.original_name,
              'storage_path', ir.storage_path,
              'thumbnail_path', ir.thumbnail_path,
              'created_at', ir.created_at
            )
          ) FILTER (WHERE ir.media_id IS NOT NULL AND ir.storage_path IS NOT NULL),
          '[]'::json
        ) as media_files
      FROM disaster_points dp
      INNER JOIN projects p ON p.project_id = dp.project_id 
        AND p.deleted_at IS NULL
      LEFT JOIN image_records ir ON ir.project_id = dp.project_id 
        AND ir.deleted_at IS NULL
        AND ir.storage_path IS NOT NULL
        AND ir.metadata->>'disaster_point_id' = dp.disaster_point_id::text
      WHERE dp.project_id = $1 
        AND dp.deleted_at IS NULL
      GROUP BY dp.disaster_point_id, dp.project_id, dp.name, dp.description, 
               dp.disaster_time, dp.latitude, dp.longitude, dp.location_geometry, 
               dp.metadata, dp.created_at, dp.updated_at,
               p.project_id, p.name, p.description, p.project_type, 
               p.is_parent, p.parent_project_id
      ORDER BY dp.created_at DESC
    `, [projectId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取災點紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取災點紀錄失敗',
    });
  }
};

/**
 * 獲取單個災點紀錄
 * GET /api/disaster-points/:id
 */
export const getDisasterPointById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        dp.disaster_point_id,
        dp.project_id,
        dp.name,
        dp.description,
        dp.disaster_time,
        dp.latitude,
        dp.longitude,
        ST_AsGeoJSON(dp.location_geometry)::json as location_geometry,
        dp.metadata,
        dp.created_at,
        dp.updated_at,
        -- 專案資訊
        jsonb_build_object(
          'project_id', p.project_id,
          'project_name', p.name,
          'project_description', p.description,
          'project_type', p.project_type,
          'is_parent', p.is_parent,
          'parent_project_id', p.parent_project_id
        ) as project_info,
        -- 獲取關聯的媒體文件（過濾已刪除且 storage_path 不為 null 的）
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'media_id', ir.media_id,
              'media_type', ir.media_type,
              'file_name', ir.file_name,
              'original_name', ir.original_name,
              'storage_path', ir.storage_path,
              'thumbnail_path', ir.thumbnail_path,
              'created_at', ir.created_at
            )
          ) FILTER (WHERE ir.media_id IS NOT NULL AND ir.storage_path IS NOT NULL),
          '[]'::json
        ) as media_files
      FROM disaster_points dp
      INNER JOIN projects p ON p.project_id = dp.project_id 
        AND p.deleted_at IS NULL
      LEFT JOIN image_records ir ON ir.project_id = dp.project_id 
        AND ir.deleted_at IS NULL
        AND ir.storage_path IS NOT NULL
        AND ir.metadata->>'disaster_point_id' = dp.disaster_point_id::text
      WHERE dp.disaster_point_id = $1 
        AND dp.deleted_at IS NULL
      GROUP BY dp.disaster_point_id, dp.project_id, dp.name, dp.description, 
               dp.disaster_time, dp.latitude, dp.longitude, dp.location_geometry, 
               dp.metadata, dp.created_at, dp.updated_at,
               p.project_id, p.name, p.description, p.project_type, 
               p.is_parent, p.parent_project_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '災點紀錄不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('獲取災點紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取災點紀錄失敗',
    });
  }
};

/**
 * 創建災點紀錄
 * POST /api/disaster-points
 */
export const createDisasterPoint = async (req, res) => {
  try {
    const { name, description, disaster_time, latitude, longitude, project_id } = req.body;

    // 驗證必填欄位
    if (!name || !latitude || !longitude || !project_id) {
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位：名稱、緯度、經度、專案ID'
      });
    }

    // 驗證專案是否存在
    const projectCheck = await pool.query(`
      SELECT project_id FROM projects 
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [project_id]);

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '專案不存在'
      });
    }

    // 驗證座標範圍
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: '無效的座標範圍'
      });
    }

    // 驗證災害時間格式（如果提供）
    let disasterTimeValue = null;
    if (disaster_time) {
      const disasterTime = new Date(disaster_time);
      if (isNaN(disasterTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: '無效的災害時間格式'
        });
      }
      disasterTimeValue = disasterTime.toISOString();
    }

    // 創建 location_geometry
    // 注意：ST_MakePoint的参数顺序是 (经度, 纬度)，即 (longitude, latitude)
    const result = await pool.query(`
      INSERT INTO disaster_points (
        project_id,
        name,
        description,
        disaster_time,
        latitude,
        longitude,
        location_geometry,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($6::numeric, $5::numeric), 4326),
        $7
      )
      RETURNING 
        disaster_point_id,
        project_id,
        name,
        description,
        disaster_time,
        latitude,
        longitude,
        ST_AsGeoJSON(location_geometry)::json as location_geometry,
        metadata,
        created_at,
        updated_at
    `, [
      project_id,
      name,
      description || null,
      disasterTimeValue,
      lat,
      lng,
      JSON.stringify(req.body.metadata || {})
    ]);

    // 獲取專案資訊並加入返回結果
    const projectInfo = await pool.query(`
      SELECT 
        project_id,
        name as project_name,
        description as project_description,
        project_type,
        is_parent,
        parent_project_id
      FROM projects
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [project_id]);

    // 將專案資訊加入返回數據
    const disasterPointData = result.rows[0];
    if (projectInfo.rows.length > 0) {
      disasterPointData.project_info = {
        project_id: projectInfo.rows[0].project_id,
        project_name: projectInfo.rows[0].project_name,
        project_description: projectInfo.rows[0].project_description,
        project_type: projectInfo.rows[0].project_type,
        is_parent: projectInfo.rows[0].is_parent,
        parent_project_id: projectInfo.rows[0].parent_project_id
      };
    }

    // 如果有上傳的媒體文件，處理它們
    if (req.files && req.files.length > 0) {
      const disasterPointId = result.rows[0].disaster_point_id;
      const mediaPromises = req.files.map(async (file) => {
        const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        const fileExtension = path.extname(file.originalname).substring(1);
        
        // 處理中文文件名編碼問題
        // multer 接收到的 originalname 可能已經是 UTF-8 編碼的字符串
        // 但如果出現亂碼，嘗試從 Buffer 重新解碼
        let originalName = file.originalname;
        if (file.originalname && Buffer.isBuffer(file.originalname)) {
          // 如果 originalname 是 Buffer，嘗試解碼
          originalName = file.originalname.toString('utf-8');
        } else if (typeof file.originalname === 'string') {
          // 確保字符串是正確的 UTF-8 編碼
          try {
            // 如果字符串包含亂碼，嘗試修復（從 latin1 轉 utf-8）
            // 這通常發生在瀏覽器將 UTF-8 文件名誤解為 latin1 時
            if (/[\x80-\xFF]/.test(file.originalname) && !/[\u4e00-\u9fa5]/.test(file.originalname)) {
              // 如果包含非 ASCII 字符但不包含中文字符，可能是編碼問題
              originalName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
            } else {
              originalName = file.originalname;
            }
          } catch (e) {
            // 如果轉換失敗，使用原始值
            originalName = file.originalname;
          }
        }
        
        // 構建相對路徑：從 uploads 目錄開始的相對路徑
        // file.path 是完整路徑，需要轉換為相對路徑
        const relativePath = path.relative(path.join(process.cwd(), 'uploads'), file.path);
        const storagePath = `/uploads/${relativePath.replace(/\\/g, '/')}`;
        
        // 插入到 image_records 表
        await pool.query(`
          INSERT INTO image_records (
            project_id,
            media_type,
            file_name,
            original_name,
            file_extension,
            mime_type,
            file_size,
            storage_path,
            metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
        `, [
          project_id,
          mediaType,
          file.filename,
          originalName,
          fileExtension,
          file.mimetype,
          file.size,
          storagePath,
          JSON.stringify({
            disaster_point_id: disasterPointId,
            uploaded_at: new Date().toISOString()
          })
        ]);
      });

      await Promise.all(mediaPromises);
    }

    res.status(201).json({
      success: true,
      message: '災點紀錄創建成功',
      data: disasterPointData
    });
  } catch (error) {
    console.error('創建災點紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建災點紀錄失敗',
    });
  }
};

/**
 * 更新災點紀錄
 * PUT /api/disaster-points/:id
 */
export const updateDisasterPoint = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('更新災點紀錄 - ID:', id);
    console.log('請求體:', req.body);
    console.log('文件:', req.files ? req.files.length : 0);
    
    // 支持 FormData 和 JSON
    // 如果是 FormData，req.body 的字段是字符串，需要解析
    // 判断是否为FormData：检查Content-Type或req.body中的字段是否为字符串
    const isFormData = req.get('Content-Type')?.includes('multipart/form-data') || 
                       (req.body.latitude && typeof req.body.latitude === 'string') ||
                       (req.body.longitude && typeof req.body.longitude === 'string');
    
    let name, description, disaster_time, latitude, longitude, project_id;
    
    if (isFormData) {
      // FormData 模式：字段都是字符串，需要解析
      name = req.body.name;
      description = req.body.description !== undefined && req.body.description !== '' ? req.body.description : null;
      disaster_time = req.body.disaster_time !== undefined && req.body.disaster_time !== '' ? req.body.disaster_time : null;
      latitude = req.body.latitude !== undefined && req.body.latitude !== '' ? parseFloat(req.body.latitude) : undefined;
      longitude = req.body.longitude !== undefined && req.body.longitude !== '' ? parseFloat(req.body.longitude) : undefined;
      project_id = req.body.project_id;
      
      // 验证解析后的数值
      if (latitude !== undefined && isNaN(latitude)) {
        console.warn('latitude 解析失敗:', req.body.latitude);
        latitude = undefined;
      }
      if (longitude !== undefined && isNaN(longitude)) {
        console.warn('longitude 解析失敗:', req.body.longitude);
        longitude = undefined;
      }
    } else {
      // JSON 模式：字段已经是正确的类型
      ({ name, description, disaster_time, latitude, longitude, project_id } = req.body);
    }
    
    console.log('解析後的數據:', { 
      name, 
      description, 
      latitude, 
      longitude, 
      isFormData,
      latitudeType: typeof latitude,
      longitudeType: typeof longitude
    });

    // 檢查災點是否存在
    const checkResult = await pool.query(`
      SELECT disaster_point_id FROM disaster_points 
      WHERE disaster_point_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '災點紀錄不存在'
      });
    }

    // 構建更新語句
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined && name !== null && name !== '') {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (disaster_time !== undefined) {
      // 驗證災害時間格式（如果提供）
      let disasterTimeValue = null;
      if (disaster_time) {
        const disasterTime = new Date(disaster_time);
        if (isNaN(disasterTime.getTime())) {
          return res.status(400).json({
            success: false,
            message: '無效的災害時間格式'
          });
        }
        disasterTimeValue = disasterTime.toISOString();
      }
      updates.push(`disaster_time = $${paramIndex++}`);
      values.push(disasterTimeValue);
    }
    if (latitude !== undefined && longitude !== undefined) {
      // 确保latitude和longitude是数字类型
      const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
      const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: '無效的座標範圍'
        });
      }
      // 先添加latitude和longitude的值
      const latIndex = paramIndex++;
      const lngIndex = paramIndex++;
      updates.push(`latitude = $${latIndex}`);
      updates.push(`longitude = $${lngIndex}`);
      // location_geometry使用相同的参数（ST_MakePoint的参数顺序是：经度, 纬度）
      updates.push(`location_geometry = ST_SetSRID(ST_MakePoint($${lngIndex}::numeric, $${latIndex}::numeric), 4326)`);
      values.push(lat, lng);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有提供要更新的欄位'
      });
    }

    values.push(id);
    const whereParamIndex = paramIndex;

    console.log('更新SQL參數:', {
      updates: updates,
      values: values,
      whereParamIndex: whereParamIndex
    });

    const result = await pool.query(`
      UPDATE disaster_points
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE disaster_point_id = $${whereParamIndex}
      RETURNING 
        disaster_point_id,
        project_id,
        name,
        description,
        disaster_time,
        latitude,
        longitude,
        ST_AsGeoJSON(location_geometry)::json as location_geometry,
        metadata,
        created_at,
        updated_at
    `, values);

    if (!result.rows || result.rows.length === 0) {
      console.error('更新失敗：未返回任何數據')
      return res.status(500).json({
        success: false,
        message: '更新失敗：未返回任何數據'
      });
    }

    // 獲取專案資訊並加入返回結果
    const disasterPointData = result.rows[0];
    const projectInfo = await pool.query(`
      SELECT 
        project_id,
        name as project_name,
        description as project_description,
        project_type,
        is_parent,
        parent_project_id
      FROM projects
      WHERE project_id = $1 AND deleted_at IS NULL
    `, [disasterPointData.project_id]);

    if (projectInfo.rows.length > 0) {
      disasterPointData.project_info = {
        project_id: projectInfo.rows[0].project_id,
        project_name: projectInfo.rows[0].project_name,
        project_description: projectInfo.rows[0].project_description,
        project_type: projectInfo.rows[0].project_type,
        is_parent: projectInfo.rows[0].is_parent,
        parent_project_id: projectInfo.rows[0].parent_project_id
      };
    }

    // 如果有上傳的媒體文件，處理它們
    if (req.files && req.files.length > 0) {
      const disasterPointId = disasterPointData.disaster_point_id;
      const projectId = disasterPointData.project_id;
      const mediaPromises = req.files.map(async (file) => {
        const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        const fileExtension = path.extname(file.originalname).substring(1);
        
        // 處理中文文件名編碼問題
        // multer 接收到的 originalname 可能已經是 UTF-8 編碼的字符串
        // 但如果出現亂碼，嘗試從 Buffer 重新解碼
        let originalName = file.originalname;
        if (file.originalname && Buffer.isBuffer(file.originalname)) {
          // 如果 originalname 是 Buffer，嘗試解碼
          originalName = file.originalname.toString('utf-8');
        } else if (typeof file.originalname === 'string') {
          // 確保字符串是正確的 UTF-8 編碼
          try {
            // 如果字符串包含亂碼，嘗試修復
            originalName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
          } catch (e) {
            // 如果轉換失敗，使用原始值
            originalName = file.originalname;
          }
        }
        
        // 構建相對路徑
        const relativePath = path.relative(path.join(process.cwd(), 'uploads'), file.path);
        const storagePath = `/uploads/${relativePath.replace(/\\/g, '/')}`;
        
        // 插入到 image_records 表
        await pool.query(`
          INSERT INTO image_records (
            project_id,
            media_type,
            file_name,
            original_name,
            file_extension,
            mime_type,
            file_size,
            storage_path,
            metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
        `, [
          projectId,
          mediaType,
          file.filename,
          originalName,
          fileExtension,
          file.mimetype,
          file.size,
          storagePath,
          JSON.stringify({
            disaster_point_id: disasterPointId,
            uploaded_at: new Date().toISOString()
          })
        ]);
      });

      await Promise.all(mediaPromises);
    }

    res.json({
      success: true,
      message: '災點紀錄更新成功',
      data: disasterPointData
    });
  } catch (error) {
    console.error('更新災點紀錄失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '更新災點紀錄失敗',
    });
  }
};

/**
 * 刪除災點紀錄（軟刪除）
 * DELETE /api/disaster-points/:id
 */
export const deleteDisasterPoint = async (req, res) => {
  try {
    const { id } = req.params;

    // 先獲取災點資訊，以便刪除關聯的媒體文件
    const disasterPointResult = await pool.query(`
      SELECT disaster_point_id, project_id
      FROM disaster_points
      WHERE disaster_point_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (disasterPointResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '災點紀錄不存在'
      });
    }

    const disasterPoint = disasterPointResult.rows[0];
    const projectId = disasterPoint.project_id;

    // 獲取該災點關聯的所有媒體文件
    const mediaFilesResult = await pool.query(`
      SELECT 
        media_id,
        storage_path,
        file_name
      FROM image_records
      WHERE project_id = $1
        AND deleted_at IS NULL
        AND metadata->>'disaster_point_id' = $2
    `, [projectId, id]);

    // 刪除物理文件
    const fileDeletionPromises = mediaFilesResult.rows.map(async (media) => {
      try {
        // storage_path 格式是 /uploads/data/disaster-points/xxx/file.jpg
        // 需要轉換為完整路徑
        if (media.storage_path) {
          // 移除開頭的 /uploads，然後加上 process.cwd()
          const relativePath = media.storage_path.startsWith('/uploads/')
            ? media.storage_path.substring('/uploads/'.length)
            : media.storage_path;
          const fullPath = path.join(process.cwd(), 'uploads', relativePath);
          
          // 檢查文件是否存在
          try {
            await fs.access(fullPath);
            // 文件存在，刪除它
            await fs.unlink(fullPath);
            console.log('已刪除物理文件:', fullPath);
          } catch (fileError) {
            // 文件不存在，跳過
            console.warn('文件不存在，跳過刪除:', fullPath);
          }
        }
      } catch (error) {
        // 刪除文件失敗，記錄但不中斷流程
        console.error('刪除物理文件失敗:', media.storage_path, error);
      }
    });

    // 等待所有文件刪除完成
    await Promise.all(fileDeletionPromises);

    // 軟刪除關聯的媒體文件記錄
    await pool.query(`
      UPDATE image_records
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE project_id = $1
        AND deleted_at IS NULL
        AND metadata->>'disaster_point_id' = $2
    `, [projectId, id]);

    // 軟刪除災點紀錄
    const result = await pool.query(`
      UPDATE disaster_points
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE disaster_point_id = $1 AND deleted_at IS NULL
      RETURNING disaster_point_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '災點紀錄不存在'
      });
    }

    res.json({
      success: true,
      message: '災點紀錄及相關媒體文件已刪除'
    });
  } catch (error) {
    console.error('刪除災點紀錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除災點紀錄失敗',
    });
  }
};

/**
 * 刪除災點的照片/影片
 * DELETE /api/disaster-points/:disasterPointId/media/:mediaId
 */
export const deleteDisasterPointMedia = async (req, res) => {
  try {
    const { disasterPointId, mediaId } = req.params;

    // 驗證災點是否存在
    const disasterPointCheck = await pool.query(`
      SELECT disaster_point_id, project_id
      FROM disaster_points
      WHERE disaster_point_id = $1 AND deleted_at IS NULL
    `, [disasterPointId]);

    if (disasterPointCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '災點紀錄不存在'
      });
    }

    const projectId = disasterPointCheck.rows[0].project_id;

    // 獲取媒體文件資訊
    const mediaResult = await pool.query(`
      SELECT 
        media_id,
        storage_path,
        file_name
      FROM image_records
      WHERE media_id = $1
        AND project_id = $2
        AND deleted_at IS NULL
        AND metadata->>'disaster_point_id' = $3
    `, [mediaId, projectId, disasterPointId]);

    if (mediaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '媒體文件不存在或已刪除'
      });
    }

    const media = mediaResult.rows[0];

    // 刪除物理文件
    if (media.storage_path) {
      try {
        const relativePath = media.storage_path.startsWith('/uploads/')
          ? media.storage_path.substring('/uploads/'.length)
          : media.storage_path;
        const fullPath = path.join(process.cwd(), 'uploads', relativePath);
        
        try {
          await fs.access(fullPath);
          await fs.unlink(fullPath);
          console.log('已刪除物理文件:', fullPath);
        } catch (fileError) {
          console.warn('文件不存在，跳過刪除:', fullPath);
        }
      } catch (error) {
        console.error('刪除物理文件失敗:', media.storage_path, error);
      }
    }

    // 軟刪除媒體文件記錄
    await pool.query(`
      UPDATE image_records
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE media_id = $1
    `, [mediaId]);

    res.json({
      success: true,
      message: '媒體文件已刪除'
    });
  } catch (error) {
    console.error('刪除媒體文件失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除媒體文件失敗',
    });
  }
};

