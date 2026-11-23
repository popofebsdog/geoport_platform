import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pool, sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import { DataFile } from '../models/DataFile.js';
import { Project } from '../models/Project.js';
import { SpatialLayer } from '../models/SpatialLayer.js';
import { parseVectorFile, vectorExtensions, maxVectorSize, boundsToWgs84 } from '../services/vectorFileService.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateUUID, isValidUUID } from '../utils/validators.js';
import { createMulterFileFilter, createStoredFilename, maxUploadSize } from '../config/uploadPolicy.js';
import { resolveStoragePath, toStoragePath, storageConfig } from '../services/storageService.js';

const execFileAsync = promisify(execFile);

const resolveUploadPath = (storagePath) => {
  const resolved = resolveStoragePath(storagePath);
  if (!resolved) throw new Error('Storage path is outside allowed roots');
  return resolved;
};

// 配置 multer 用於檔案上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/data/others';
    
    // 根據文件類型選擇存儲路徑
    if (file.mimetype === 'application/geo+json') {
      uploadPath = 'uploads/data/geojson';
    } else if (file.mimetype === 'application/vnd.google-earth.kml+xml') {
      uploadPath = 'uploads/data/kml';
    } else if (file.mimetype.startsWith('image/') || file.mimetype === 'image/tiff' || file.mimetype === 'image/tif') {
      if (req.body.data_type === 'basemap') {
        uploadPath = 'uploads/data/basemaps';
      }
    }
    
    // 額外檢查：如果是底圖類型，強制使用 basemaps 目錄
    if (req.body.data_type === 'basemap') {
      uploadPath = 'uploads/data/basemaps';
    }
    
    // 確保目錄存在（使用絕對路徑）
    const absUploadPath = resolveUploadPath(uploadPath);
    if (!fs.existsSync(absUploadPath)) {
      fs.mkdirSync(absUploadPath, { recursive: true });
    }

    cb(null, absUploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, createStoredFilename(file.fieldname || 'data', file.originalname));
  }
});

// 配置 multer 用於關聯上傳（feature uploads）
const featureUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = resolveUploadPath('uploads/features/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, createStoredFilename('feature', file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: maxUploadSize('dataFile') },
  fileFilter: createMulterFileFilter('dataFile')
});

// 關聯上傳的 multer 配置（主要用於圖片）
const featureUpload = multer({
  storage: featureUploadStorage,
  limits: { fileSize: maxUploadSize('featureAttachment') },
  fileFilter: createMulterFileFilter('featureAttachment')
});

// 檔案類型識別函數
const detectFileType = (mimeType, extension) => {
  const typeMap = {
    'application/pdf': 'document',
    'application/vnd.ms-excel': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
    'text/csv': 'csv',
    'application/json': 'other',
    'application/geo+json': 'vector',
    'text/plain': 'other',
    'image/jpeg': 'image',
    'image/png': 'image',
    'application/zip': 'other',
    'application/x-zip-compressed': 'other'
  };
  
  // 如果副檔名是 .geojson，識別為 vector 類型
  if (extension === '.geojson') {
    return 'vector';
  }
  
  return typeMap[mimeType] || 'other';
};

// 計算檔案雜湊值
const calculateFileHash = async (filePath) => {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
};

// GDAL validates georeferencing before a TIFF is accepted as a basemap.
const validateRaster = async inputPath => {
  try {
    const { stdout } = await execFileAsync('gdalinfo', ['-if', 'GTiff', '-json', inputPath], { maxBuffer: 4 * 1024 * 1024 });
    const info = JSON.parse(stdout);
    if (!info.coordinateSystem?.wkt || !Array.isArray(info.geoTransform)) {
      throw new Error('TIFF 缺少地理定位或座標系統');
    }
  } catch (error) {
    throw Object.assign(new Error(error.code === 'ENOENT' ? 'GDAL 尚未安裝，無法驗證圖資' : '無法讀取 GeoTIFF，請確認檔案完整且包含地理定位'), { status: error.code === 'ENOENT' ? 503 : 400 });
  }
};

// Generate a lossless display copy; the uploaded original remains downloadable.
const convertTifToCog = async inputPath => {
  const outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, path.extname(inputPath)) + '_cog.tif');
  try {
    await execFileAsync('gdal_translate', ['-if', 'GTiff', '-of', 'COG', '-co', 'COMPRESS=LZW', '-co', 'BLOCKSIZE=512',
      '-co', 'RESAMPLING=AVERAGE', '-co', 'BIGTIFF=IF_SAFER', inputPath, outputPath], { timeout: 600000 });
    await fs.promises.access(outputPath);
    return outputPath;
  } catch (error) {
    await fs.promises.rm(outputPath, { force: true });
    throw Object.assign(new Error('COG 轉換失敗，原始檔未變更；可關閉 COG 優化後重新上傳'), { status: 422, cause: error });
  }
};

// 上傳資料
const serializeDataFile = file => Object.fromEntries(Object.entries(file.toJSON()).map(([key, value]) => [
  DataFile.rawAttributes?.[key]?.field || key, value
]));

export const uploadData = async (req, res) => {
  const ownedPaths = new Set();
  try {
    const { project_id, data_name, data_description, data_date, data_type, analysis_data, layer_color } = req.body;
    if (!req.file) throw Object.assign(new Error('請選擇要上傳的檔案'), { status: 400 });
    const file = req.file;
    const originalPath = resolveUploadPath(file.path);
    ownedPaths.add(originalPath);
    if (!isValidUUID(project_id) || typeof data_name !== 'string' || !data_name.trim() || !data_date || !Number.isFinite(Date.parse(data_date))) {
      throw Object.assign(new Error('請提供有效的 project_id、資料名稱與資料日期'), { status: 400 });
    }
    const analysis = analysis_data ? JSON.parse(analysis_data) : null;
    if (analysis && (typeof analysis !== 'object' || Array.isArray(analysis))) throw Object.assign(new Error('分析設定必須是 JSON 物件'), { status: 400 });
    if (!await Project.findByPk(project_id, { attributes: ['projectId'] })) {
      throw Object.assign(new Error('專案不存在'), { status: 404 });
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isMapLayer = ['general', 'potential_analysis', 'profile_observation'].includes(data_type);
    if (isMapLayer && !vectorExtensions.includes(fileExtension)) {
      throw Object.assign(new Error('地圖圖層支援 GeoJSON（.geojson 或 .json）與 KML；CSV 請使用時序資料上傳'), { status: 400 });
    }
    const isVector = vectorExtensions.includes(fileExtension) && (fileExtension !== '.json' || isMapLayer);
    let vector;
    if (isVector) {
      if (file.size > maxVectorSize) throw Object.assign(new Error('向量圖資上限為 64 MB，請先分割或簡化資料'), { status: 413 });
      vector = parseVectorFile(await fs.promises.readFile(originalPath, 'utf8'), fileExtension);
    }
    let fileType = detectFileType(file.mimetype, fileExtension);
    if (isMapLayer) fileType = data_type === 'general' ? 'vector' : data_type;
    else if (data_type === 'basemap') fileType = 'raster';
    else if (isVector) fileType = 'vector';

    let finalFilePath = originalPath;
    const rasterMetadata = {};
    if (data_type === 'basemap') {
      if (!['.tif', '.tiff'].includes(fileExtension)) throw Object.assign(new Error('底圖需要 GeoTIFF（.tif 或 .tiff）'), { status: 400 });
      await validateRaster(originalPath);
      rasterMetadata.cog_optimized = req.body.enable_cog !== 'false' && req.body.enable_cog !== false;
      if (rasterMetadata.cog_optimized) {
        finalFilePath = await convertTifToCog(originalPath);
        ownedPaths.add(finalFilePath);
        rasterMetadata.original_storage_path = toStoragePath(originalPath);
        rasterMetadata.original_file_hash = await calculateFileHash(originalPath);
      }
    }
    const fileHash = await calculateFileHash(finalFilePath);
    const finalFileSize = (await fs.promises.stat(finalFilePath)).size;
    const fileData = await sequelize.transaction(async transaction => {
      const dataFile = await DataFile.create({
        projectId: project_id, fileName: data_name.trim(), originalName: file.originalname,
        fileExtension: finalFilePath !== originalPath ? '.tif' : fileExtension,
        fileType, mimeType: data_type === 'basemap' ? 'image/tiff' : file.mimetype, fileSize: finalFileSize, storagePath: toStoragePath(finalFilePath),
        fileHash, uploadDate: data_date, processingStatus: 'completed', metadata: { data_date, data_description: data_description || null,
          data_name: data_name.trim(), data_type: data_type || 'general', analysis_data: analysis, layer_color: layer_color || '#3388ff', ...rasterMetadata }
      }, { transaction });
      if (vector) {
        const { geometryType, featureCount, bounds } = vector.spatialInfo;
        await SpatialLayer.create({
          project_id, source_file_id: dataFile.fileId, layer_name: data_name.trim(), display_name: data_name.trim(),
          description: data_description || null, geometry_type: geometryType, srid: vector.srid,
          bbox_min_x: bounds?.minX ?? null, bbox_min_y: bounds?.minY ?? null,
          bbox_max_x: bounds?.maxX ?? null, bbox_max_y: bounds?.maxY ?? null,
          feature_count: featureCount, processing_status: 'completed',
          metadata: { source_file: data_name.trim(), created_from: 'upload', analysis_data: analysis }
        }, { transaction });
      }
      return serializeDataFile(dataFile);
    });
    res.status(201).json({ success: true, message: '資料上傳成功', data: fileData });
  } catch (error) {
    console.error('上傳資料錯誤:', error);
    await Promise.all([...ownedPaths].map(filename => fs.promises.rm(filename, { force: true }).catch(cleanupError => console.error('清理上傳失敗:', cleanupError))));
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    res.status(status).json({ success: false, message: status < 500 ? error.message : '上傳失敗' });
  }
};

// 獲取專案的資料列表（排除底圖和時序資料）
export const getProjectData = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    
    const result = await pool.query(`
      SELECT 
        file_id, file_name, original_name, upload_date,
        file_extension, file_type, mime_type, file_size, 
        created_at, updated_at, metadata
      FROM data_files 
      WHERE project_id = $1 
        AND deleted_at IS NULL
        AND file_type::text NOT LIKE 'temporal_%'
        AND (metadata->>'data_type' IS NULL OR metadata->>'data_type' != 'basemap')
      ORDER BY created_at DESC
    `, [projectId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('獲取專案資料錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '獲取資料失敗',
    });
  }
};

// 獲取單一資料
export const getDataById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    
    const result = await pool.query(`
      SELECT 
        df.*, p.name as project_name
      FROM data_files df
      JOIN projects p ON df.project_id = p.project_id
      WHERE df.file_id = $1 AND df.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('獲取資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取資料失敗',
    });
  }
};

// 更新資料
export const updateData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    const { data_name, data_description, data_date, layer_color } = req.body;
    
    // 首先獲取現有的 metadata
    const existingResult = await pool.query(`
      SELECT metadata FROM data_files WHERE file_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    // 更新 metadata 中的描述信息（保持與前端一致的結構）
    const existingMetadata = existingResult.rows[0].metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      data_description: data_description || existingMetadata.data_description || '',
      data_date: data_date || existingMetadata.data_date || '',
      layer_color: layer_color || existingMetadata.layer_color || '#3388ff',
      // 同時保持 data_info 結構以向後兼容
      data_info: {
        ...existingMetadata.data_info,
        name: data_name || existingMetadata.data_info?.name || '',
        description: data_description || existingMetadata.data_info?.description || '',
        date: data_date || existingMetadata.data_info?.date || ''
      }
    };

    const result = await pool.query(`
      UPDATE data_files 
      SET 
        file_name = COALESCE($1, file_name),
        upload_date = COALESCE($2, upload_date),
        metadata = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE file_id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [data_name, data_date, JSON.stringify(updatedMetadata), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    res.json({
      success: true,
      message: '資料更新成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('更新資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新資料失敗',
    });
  }
};

// 獲取專案的底圖列表
export const getProjectBaseMaps = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    
    const result = await pool.query(`
      SELECT 
        file_id,
        file_name,
        original_name,
        file_type,
        file_size,
        storage_path,
        upload_date,
        metadata
      FROM data_files 
      WHERE project_id = $1 
        AND file_type IN ('raster', 'image')
        AND (metadata->>'data_type' = 'basemap' OR metadata->>'data_type' IS NULL)
        AND deleted_at IS NULL
      ORDER BY upload_date DESC
    `, [projectId]);

    const baseMaps = result.rows.map(row => ({
      id: row.file_id,
      name: row.metadata?.data_info?.name || row.file_name,
      description: row.metadata?.data_info?.description || '',
      originalName: row.original_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      storagePath: row.storage_path,
      uploadDate: row.upload_date,
      metadata: row.metadata
    }));

    res.json({
      success: true,
      data: baseMaps
    });

  } catch (error) {
    console.error('獲取底圖列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取底圖列表失敗',
    });
  }
};

// 軟刪除資料
export const deleteData = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    
    await client.query('BEGIN');

    // 檢查資料是否存在
    const dataFileResult = await client.query(`
      SELECT file_id, file_name, file_type, project_id
      FROM data_files 
      WHERE file_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (dataFileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: '資料不存在'
      });
    }

    const dataFile = dataFileResult.rows[0];

    // 如果是空間資料檔案，同時刪除對應的 spatial_layers 記錄
    if (dataFile.file_type === 'potential_analysis') {
      
      const spatialLayerResult = await client.query(`
        UPDATE spatial_layers 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE source_file_id = $1 AND deleted_at IS NULL
        RETURNING layer_id, layer_name
      `, [id]);

      if (spatialLayerResult.rows.length > 0) {
      }
    }

    // 刪除相關的 feature_uploads 記錄（關聯上傳的圖片等）
    
    const featureUploadsResult = await client.query(`
      UPDATE feature_uploads 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE data_files_id = $1 AND deleted_at IS NULL
      RETURNING upload_id, upload_name, upload_type
    `, [id]);

    if (featureUploadsResult.rows.length > 0) {
    }

    // 刪除 data_files 記錄
    const result = await client.query(`
      UPDATE data_files 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE file_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '資料已刪除',
      data: {
        file_id: result.rows[0].file_id,
        file_name: result.rows[0].file_name,
        deleted_at: result.rows[0].deleted_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('刪除資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除資料失敗',
    });
  } finally {
    client.release();
  }
};

// 下載檔案
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateUUID(id, res, '檔案 ID')) return;
    const file = await DataFile.findByPk(id, {
      attributes: ['fileName', 'originalName', 'fileExtension', 'storagePath', 'mimeType', 'metadata']
    });
    if (!file) return res.status(404).json({ success: false, message: '檔案不存在' });
    const filename = file.originalName || (path.extname(file.fileName) ? file.fileName : file.fileName + (file.fileExtension || ''));
    const absolutePath = resolveUploadPath(file.metadata?.original_storage_path || file.storagePath);
    res.type(file.mimeType || 'application/octet-stream');
    res.download(absolutePath, filename, error => {
      if (!error) return;
      if (res.headersSent) return res.destroy();
      res.type('json').status(error.code === 'ENOENT' || error.status === 404 ? 404 : 500).json({
        success: false, message: error.code === 'ENOENT' || error.status === 404 ? '檔案已遺失' : '下載檔案失敗'
      });
    });
  } catch (error) {
    console.error('下載檔案錯誤:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: '下載檔案失敗' });
  }
};

const vectorFileWhere = projectId => ({
  projectId, fileExtension: { [Op.in]: vectorExtensions },
  fileType: { [Op.in]: ['vector', 'potential_analysis', 'profile_observation'] }
});

// 獲取專案的向量圖層清單（僅含中繼資料，不讀取圖資檔案）。
export const getProjectGeoJSONList = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    const files = await DataFile.findAll({
      where: vectorFileWhere(projectId),
      attributes: ['fileId', 'fileName', 'storagePath', 'metadata', 'fileType', 'fileExtension', 'createdAt'],
      order: [['createdAt', 'DESC']], raw: true
    });
    if (!files.length) return res.json({ success: true, data: [] });
    const spatialLayers = await SpatialLayer.findAll({
      where: { project_id: projectId, source_file_id: files.map(file => file.fileId), processing_status: 'completed' },
      order: [['created_at', 'DESC']], raw: true
    });
    const byFile = new Map();
    for (const layer of spatialLayers) if (!byFile.has(layer.source_file_id)) byFile.set(layer.source_file_id, layer);
    const data = files.filter(file => byFile.has(file.fileId)).map(file => {
      const layer = byFile.get(file.fileId);
      const bbox = boundsToWgs84({ minX: layer.bbox_min_x, minY: layer.bbox_min_y, maxX: layer.bbox_max_x, maxY: layer.bbox_max_y }, layer.srid);
      return {
        ...layer, file_id: file.fileId, file_name: file.fileName, storage_path: file.storagePath,
        metadata: file.metadata, file_type: file.fileType, file_extension: file.fileExtension, created_at: file.createdAt,
        layer_metadata: layer.metadata, bounds: bbox ? [[bbox.minY, bbox.minX], [bbox.maxY, bbox.maxX]] : null
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('獲取向量圖層列表錯誤:', error);
    res.status(500).json({ success: false, message: '獲取圖層列表失敗' });
  }
};

// GeoJSON、JSON 與 KML 使用相同的格式驗證，回傳可供 Leaflet 呈現的資料。
export const getProjectGeoJSON = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!validateUUID(projectId, res, '專案 ID')) return;
    const { fileId } = req.query;
    if (fileId && !validateUUID(fileId, res, '檔案 ID')) return;
    const file = await DataFile.findOne({
      where: { ...vectorFileWhere(projectId), ...(fileId ? { fileId } : {}) },
      order: [['createdAt', 'DESC']]
    });
    if (!file) return res.json({ success: true, data: null, message: '沒有找到向量圖資' });
    const absolutePath = resolveUploadPath(file.storagePath);
    if ((await fs.promises.stat(absolutePath)).size > maxVectorSize) {
      return res.status(413).json({ success: false, message: '向量圖資超過 64 MB，請先分割或簡化資料' });
    }
    const content = await fs.promises.readFile(absolutePath, 'utf8');
    const parsed = parseVectorFile(content, file.fileExtension);
    const bbox = boundsToWgs84(parsed.spatialInfo.bounds, parsed.srid);
    res.json({ success: true, data: {
      file_id: file.fileId, file_name: file.fileName, metadata: file.metadata,
      storage_path: file.storagePath, file_extension: file.fileExtension,
      ...(file.fileExtension === '.kml' ? { kml: content, file_type: 'kml' } : { geojson: parsed.geojson, file_type: 'geojson' }),
      srid: parsed.srid, geometry_type: parsed.spatialInfo.geometryType, bbox
    } });
  } catch (error) {
    console.error('獲取向量圖資錯誤:', error);
    const status = error.code === 'ENOENT' ? 404 : error.status || 500;
    res.status(status).json({ success: false, message: status === 404 ? '圖資檔案已遺失' : status === 400 ? error.message : '獲取圖資資料失敗' });
  }
};

// 關聯上傳到 GeoJSON feature
export const uploadToFeature = async (req, res) => {
  try {
    const { data_files_id, feature_id, upload_name, upload_description, feature_properties } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '沒有選擇檔案'
      });
    }

    // 驗證必要參數
    if (!data_files_id || !feature_id || !upload_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數：data_files_id, feature_id, upload_name'
      });
    }

    // 檢查 data_files 是否存在
    const dataFileCheck = await pool.query(
      'SELECT file_id FROM data_files WHERE file_id = $1 AND deleted_at IS NULL',
      [data_files_id]
    );

    if (dataFileCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到對應的資料檔案'
      });
    }

    // 檢測檔案類型
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uploadType = detectFeatureUploadType(file.mimetype, fileExtension);
    
    // 計算檔案雜湊值
    const fileHash = await calculateFileHash(file.path);

    // 插入關聯上傳記錄
    const result = await pool.query(`
      INSERT INTO feature_uploads (
        data_files_id, feature_id, upload_name, upload_description, upload_type,
        file_name, original_name, file_extension, mime_type, file_size,
        storage_path, file_hash, feature_properties, upload_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      data_files_id,
      feature_id,
      upload_name,
      upload_description || null,
      uploadType,
      file.filename,
      file.originalname,
      fileExtension,
      file.mimetype,
      file.size,
      toStoragePath(file.path),
      fileHash,
      feature_properties ? JSON.stringify(feature_properties) : null,
      JSON.stringify({
        uploaded_at: new Date().toISOString(),
        upload_source: 'feature_upload'
      })
    ]);

    res.json({
      success: true,
      message: '關聯上傳成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('關聯上傳錯誤:', error);
    res.status(500).json({
      success: false,
      message: '關聯上傳失敗',
    });
  }
};

// 獲取 feature 的關聯上傳資料
export const getFeatureUploads = async (req, res) => {
  try {
    const { dataFilesId, featureId } = req.params;

    const result = await pool.query(`
      SELECT 
        upload_id, upload_name, upload_description, upload_type,
        file_name, original_name, file_extension, mime_type, file_size,
        storage_path, feature_properties, upload_metadata, created_at
      FROM feature_uploads 
      WHERE data_files_id = $1 
        AND feature_id = $2 
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [dataFilesId, featureId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('獲取關聯上傳資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取關聯上傳資料失敗',
    });
  }
};

// 刪除關聯上傳資料
export const deleteFeatureUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;

    // 軟刪除
    const result = await pool.query(`
      UPDATE feature_uploads 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE upload_id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [uploadId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到要刪除的關聯上傳資料'
      });
    }

    // 刪除實體檔案
    const uploadRecord = result.rows[0];
    const absPath = resolveUploadPath(uploadRecord.storage_path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    res.json({
      success: true,
      message: '關聯上傳資料已刪除'
    });

  } catch (error) {
    console.error('刪除關聯上傳資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除關聯上傳資料失敗',
    });
  }
};

// 檢測關聯上傳檔案類型
const detectFeatureUploadType = (mimeType, extension) => {
  const typeMap = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'application/pdf': 'document',
    'text/plain': 'document'
  };
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
    return 'image';
  }
  
  return typeMap[mimeType] || 'other';
};

// 獲取潛勢評估的區間設定
export const getPotentialAnalysisIntervals = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // 獲取檔案信息和區間設定
    const result = await pool.query(`
      SELECT file_id, file_name, file_type, metadata
      FROM data_files 
      WHERE file_id = $1 AND file_type = 'potential_analysis' AND deleted_at IS NULL
    `, [fileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '潛勢評估檔案不存在'
      });
    }

    const fileData = result.rows[0];
    const metadata = fileData.metadata || {};
    const analysisData = metadata.analysis_data || {};

    res.json({
      success: true,
      data: {
        file_id: fileId,
        file_name: fileData.file_name,
        intervals: analysisData.intervals || {},
        numericFields: analysisData.numericFields || [],
        fieldStats: analysisData.fieldStats || {}
      }
    });
  } catch (error) {
    console.error('獲取潛勢評估區間設定錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取區間設定失敗'
    });
  }
};

// 創建潛勢分析快照圖層
const createPotentialAnalysisSnapshot = async (originalFileId, projectId, dataName, dataDate, dataDescription, analysisData) => {
  try {
    // 讀取原始 GeoJSON 檔案
    const originalFileResult = await pool.query(`
      SELECT storage_path, metadata
      FROM data_files 
      WHERE file_id = $1
    `, [originalFileId])
    
    if (originalFileResult.rows.length === 0) {
      throw new Error('找不到原始檔案')
    }
    
    const originalFile = originalFileResult.rows[0]
    const fs = await import('fs')
    const path = await import('path')
    
    // 讀取原始 GeoJSON 內容
    const geojsonContent = fs.readFileSync(resolveUploadPath(originalFile.storage_path), 'utf8')
    const geojsonData = JSON.parse(geojsonContent)
    
    // 計算邊界（用於 metadata）
    const bounds = calculateBounds(geojsonData.features)
    if (!bounds) {
      throw new Error('無法計算數據邊界')
    }
    
    // 創建 GeoJSON 快照（合併所有 features）
    const mergedGeojson = {
      type: 'FeatureCollection',
      features: [mergedFeature]
    }
    
    // 保存 GeoJSON 快照檔案
    const snapshotFileName = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.geojson`
    const snapshotFilePath = path.join(storageConfig.uploadsRoot, 'data', 'snapshots', 'geojson', snapshotFileName)
    
    // 確保目錄存在
    const uploadDir = path.dirname(snapshotFilePath)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    fs.writeFileSync(snapshotFilePath, JSON.stringify(mergedGeojson, null, 2))
    
    // 計算檔案雜湊
    const crypto = await import('crypto')
    const fileHash = crypto.createHash('sha256').update(JSON.stringify(mergedGeojson)).digest('hex')
    
    // 將快照圖層存儲到資料庫
    const snapshotResult = await pool.query(`
      INSERT INTO data_files (
        project_id, file_name, original_name, file_extension, file_type, mime_type,
        file_size, storage_path, file_hash, upload_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      projectId,
      `${dataName}_快照`,
      snapshotFileName,
      '.geojson',
      'potential_analysis_snapshot',
      'application/geo+json',
      fs.statSync(snapshotFilePath).size,
      toStoragePath(snapshotFilePath),
      fileHash,
      dataDate,
      JSON.stringify({
        data_date: dataDate,
        data_description: `${dataDescription} - 快照圖層`,
        data_name: `${dataName}_快照`,
        data_type: 'potential_analysis_snapshot',
        original_file_id: originalFileId,
        analysis_data: analysisData,
        bounds: {
          minLat: bounds.minLat,
          maxLat: bounds.maxLat,
          minLng: bounds.minLng,
          maxLng: bounds.maxLng
        }
      })
    ])
    
    return snapshotResult.rows[0]
    
  } catch (error) {
    console.error('創建潛勢分析快照錯誤:', error)
    throw error
  }
}

// 計算 features 的邊界框
const calculateBounds = (features) => {
  if (features.length === 0) return null
  
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  
  features.forEach(feature => {
    const coords = extractCoordinates(feature.geometry)
    coords.forEach(coord => {
      const [lng, lat] = coord
      minLng = Math.min(minLng, lng)
      minLat = Math.min(minLat, lat)
      maxLng = Math.max(maxLng, lng)
      maxLat = Math.max(maxLat, lat)
    })
  })
  
  return {
    minLng, minLat, maxLng, maxLat,
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
    width: maxLng - minLng,
    height: maxLat - minLat
  }
}

// 從幾何形狀中提取所有座標
const extractCoordinates = (geometry) => {
  const coords = []
  
  switch (geometry.type) {
    case 'Point':
      coords.push(geometry.coordinates)
      break
    case 'LineString':
      coords.push(...geometry.coordinates)
      break
    case 'Polygon':
      geometry.coordinates.forEach(ring => coords.push(...ring))
      break
    case 'MultiPolygon':
      geometry.coordinates.forEach(polygon => 
        polygon.forEach(ring => coords.push(...ring))
      )
      break
  }
  
  return coords
}

// 創建簡化的矩形區域
const createSimplifiedRectangle = (bounds, index, totalIntervals) => {
  if (!bounds) return null
  
  // 添加一些偏移，讓多個區間不會完全重疊
  const offset = (bounds.width + bounds.height) * 0.02 // 2% 的偏移
  const offsetX = (index - (totalIntervals - 1) / 2) * offset
  const offsetY = (index - (totalIntervals - 1) / 2) * offset
  
  const minLng = bounds.minLng + offsetX
  const minLat = bounds.minLat + offsetY
  const maxLng = bounds.maxLng + offsetX
  const maxLat = bounds.maxLat + offsetY
  
  return {
    type: 'Polygon',
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]]
  }
}

// 合併多個 features 的幾何形狀（保留用於向後兼容）

// 創建優化的 GeoJSON 快照
const createOptimizedGeoJSON = (geojsonData, analysisData) => {
  const numericField = Object.keys(analysisData.intervals)[0]
  const intervals = analysisData.intervals[numericField]
  
  const optimizedFeatures = []
  
  // 為每個區間創建一個合併的 feature
  intervals.forEach((interval, index) => {
    const featuresInInterval = geojsonData.features.filter(feature => {
      const value = feature.properties[numericField]
      return typeof value === 'number' && value >= interval.min && value <= interval.max
    })
    
    if (featuresInInterval.length > 0) {
      // 合併所有 features 的幾何形狀
      const mergedGeometry = mergeFeatures(featuresInInterval)
      
      if (mergedGeometry) {
        optimizedFeatures.push({
          type: 'Feature',
          properties: {
            interval_index: index,
            min_value: interval.min,
            max_value: interval.max,
            color: interval.color,
            feature_count: featuresInInterval.length,
            numeric_field: numericField
          },
          geometry: mergedGeometry
        })
      }
    }
  })
  
  return {
    type: 'FeatureCollection',
    name: `${geojsonData.name || '潛勢分析快照'}`,
    description: '由潛勢分析生成的優化快照圖層',
    features: optimizedFeatures
  }
}


// 將 GeoJSON 轉換為 KML
const convertToKML = (geojsonData, analysisData) => {
  const numericField = Object.keys(analysisData.intervals)[0]
  const intervals = analysisData.intervals[numericField]
  
  // KML 文件頭
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${geojsonData.name || '潛勢分析快照'}</name>
    <description>由潛勢分析生成的快照圖層</description>
    
    <!-- 定義顏色樣式 -->
`
  
  // 為每個區間創建樣式
  intervals.forEach((interval, index) => {
    const color = interval.color.replace('#', '')
    // KML 使用 aabbggrr 格式的顏色（alpha, blue, green, red）
    const kmlColor = 'ff' + color.substring(4, 6) + color.substring(2, 4) + color.substring(0, 2)
    
    kml += `    <Style id="style${index}">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlColor}88</color>  <!-- 添加50%透明度 -->
      </PolyStyle>
    </Style>
`
  })
  
  // 添加 features（優化：合併同區間的所有 features）
  intervals.forEach((interval, index) => {
    const featuresInInterval = geojsonData.features.filter(feature => {
      const value = feature.properties[numericField]
      return typeof value === 'number' && value >= interval.min && value <= interval.max
    })
    
    if (featuresInInterval.length > 0) {
      // 合併所有 features 的座標
      const allCoordinates = []
      featuresInInterval.forEach(feature => {
        const coordinates = extractCoordinatesForKML(feature.geometry)
        if (coordinates) {
          allCoordinates.push(coordinates)
        }
      })
      
      if (allCoordinates.length > 0) {
        kml += `    <Placemark>
      <styleUrl>#style${index}</styleUrl>
      <name>區間 ${interval.min} - ${interval.max}</name>
      <description>包含 ${featuresInInterval.length} 個物件</description>
      <MultiGeometry>
`
        
        // 為每個 feature 創建一個 Polygon
        allCoordinates.forEach(coordinates => {
          kml += `        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordinates}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
`
        })
        
        kml += `      </MultiGeometry>
    </Placemark>
`
      }
    }
  })
  
  // 關閉 KML 文件
  kml += '  </Document>\n</kml>'
  
  return kml
}

// 從 GeoJSON 幾何形狀提取座標用於 KML
const extractCoordinatesForKML = (geometry) => {
  if (!geometry) return null
  
  let coordinates = []
  
  switch (geometry.type) {
    case 'Polygon':
      // 使用外環
      coordinates = geometry.coordinates[0]
      break
    case 'MultiPolygon':
      // 使用第一個多邊形的外環
      coordinates = geometry.coordinates[0][0]
      break
    case 'LineString':
      coordinates = geometry.coordinates
      break
    case 'Point':
      coordinates = [geometry.coordinates]
      break
  }
  
  // KML 格式：經度,緯度,高度（可選）
  return coordinates.map(coord => `${coord[0]},${coord[1]},0`).join(' ')
}

const mergeFeatures = (features) => {
  try {
    if (features.length === 0) return null
    
    // 如果是單個 feature，直接返回其幾何形狀
    if (features.length === 1) {
      return features[0].geometry
    }
    
    // 對於多個 features，創建一個包含所有幾何形狀的 MultiPolygon
    const coordinates = []
    
    features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        coordinates.push(feature.geometry.coordinates)
      } else if (feature.geometry.type === 'MultiPolygon') {
        coordinates.push(...feature.geometry.coordinates)
      } else if (feature.geometry.type === 'LineString') {
        // 將 LineString 轉換為 Polygon（添加起始點作為結束點）
        const coords = feature.geometry.coordinates
        if (coords.length > 2) {
          coords.push(coords[0]) // 閉合線條
          coordinates.push([coords])
        }
      }
    })
    
    if (coordinates.length === 0) return null
    
    return {
      type: coordinates.length === 1 ? 'Polygon' : 'MultiPolygon',
      coordinates: coordinates.length === 1 ? coordinates[0] : coordinates
    }
    
  } catch (error) {
    console.error('合併 features 錯誤:', error)
    return null
  }
}


export { upload, featureUpload, createPotentialAnalysisSnapshot };
