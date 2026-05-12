import { pool } from '../config/database.js';
import { checkTitilerHealth } from '../services/healthService.js';
import { directoryStats, statStoragePath, storageConfig } from '../services/storageService.js';

async function countFrom(table, where = 'deleted_at IS NULL') {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE ${where}`);
  return result.rows[0]?.count || 0;
}

async function scalar(sql, params = [], fallback = 0) {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0] || fallback;
  } catch (error) {
    console.warn('[admin] query failed:', error.message);
    return fallback;
  }
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let next = value / 1024;
  let unit = units.shift();
  while (next >= 1024 && units.length) {
    next /= 1024;
    unit = units.shift();
  }
  return `${next.toFixed(next >= 10 ? 1 : 2)} ${unit}`;
}

function toIssue(type, severity, title, detail, source) {
  return {
    type,
    severity,
    title,
    detail,
    source,
    created_at: source?.created_at || null
  };
}

async function buildFileHealth(row) {
  const localFile = await statStoragePath(row.storage_path, row.storage_type || 'local');
  const dbSize = Number(row.file_size || 0);
  const diskSize = Number(localFile.size || 0);

  let status = 'ok';
  let recommendation = '檔案紀錄與實體檔案一致，暫不需要處理。';
  if (localFile.exists === null) {
    status = 'external';
    recommendation = '此檔案使用外部儲存，需由儲存服務端檢查可讀性。';
  } else if (!localFile.exists) {
    status = 'missing';
    recommendation = '找不到實體檔案。請確認檔案是否被移動、刪除，或 storage_path 是否需要修正。';
  } else if (dbSize !== diskSize) {
    status = 'size-mismatch';
    recommendation = '實體檔案存在但大小與資料庫不同。請先確認檔案是否為同一版本，再決定是否更新 DB size 或重新上傳。';
  }

  return {
    status,
    checkedAt: new Date().toISOString(),
    db: {
      fileSize: dbSize,
      fileSizeLabel: formatBytes(dbSize),
      storagePath: row.storage_path,
      storageType: row.storage_type,
      processingStatus: row.processing_status,
      validationStatus: row.validation_status,
      errorMessage: row.error_message || null
    },
    disk: {
      exists: localFile.exists,
      path: localFile.path,
      fileSize: diskSize,
      fileSizeLabel: formatBytes(diskSize)
    },
    sizeMatches: localFile.exists === true ? dbSize === diskSize : null,
    recommendation
  };
}

export async function getAdminOverview(req, res) {
  try {
    const [
      projects,
      users,
      dataFiles,
      spatialLayers,
      disasterPoints,
      warningRegions,
      totalFileSize,
      fileTypes,
      processingStatuses,
      recentFiles,
      recentProjects
    ] = await Promise.all([
      countFrom('projects'),
      countFrom('users'),
      countFrom('data_files'),
      countFrom('spatial_layers'),
      countFrom('disaster_points'),
      countFrom('warning_regions'),
      scalar('SELECT COALESCE(SUM(file_size), 0)::bigint AS bytes FROM data_files WHERE deleted_at IS NULL'),
      scalar(`SELECT json_agg(row_to_json(t)) AS items FROM (
        SELECT file_type, COUNT(*)::int AS count
        FROM data_files
        WHERE deleted_at IS NULL
        GROUP BY file_type
        ORDER BY count DESC
      ) t`, [], { items: [] }),
      scalar(`SELECT json_agg(row_to_json(t)) AS items FROM (
        SELECT processing_status, COUNT(*)::int AS count
        FROM data_files
        WHERE deleted_at IS NULL
        GROUP BY processing_status
        ORDER BY count DESC
      ) t`, [], { items: [] }),
      scalar(`SELECT json_agg(row_to_json(t)) AS items FROM (
        SELECT df.file_id, df.file_name, df.original_name, df.file_type, df.file_size,
               df.processing_status, df.validation_status, df.storage_path,
               df.created_at, p.name AS project_name
        FROM data_files df
        LEFT JOIN projects p ON p.project_id = df.project_id
        WHERE df.deleted_at IS NULL
        ORDER BY df.created_at DESC
        LIMIT 8
      ) t`, [], { items: [] }),
      scalar(`SELECT json_agg(row_to_json(t)) AS items FROM (
        SELECT project_id, name, status, file_count, layer_count, total_size, created_at
        FROM projects
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 8
      ) t`, [], { items: [] })
    ]);

    const failedFiles = Number((processingStatuses.items || [])
      .find(item => item.processing_status === 'failed')?.count || 0);

    return res.json({
      success: true,
      summary: {
        projects,
        users,
        dataFiles,
        spatialLayers,
        disasterPoints,
        warningRegions,
        totalFileSizeBytes: Number(totalFileSize.bytes || 0),
        totalFileSizeLabel: formatBytes(totalFileSize.bytes || 0),
        failedFiles
      },
      charts: {
        fileTypes: fileTypes.items || [],
        processingStatuses: processingStatuses.items || []
      },
      recent: {
        files: recentFiles.items || [],
        projects: recentProjects.items || []
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ success: false, message: '無法載入管理總覽' });
  }
}

export async function getAdminFiles(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const params = [];
    const filters = ['df.deleted_at IS NULL'];

    if (req.query.status) {
      params.push(req.query.status);
      filters.push(`df.processing_status = $${params.length}`);
    }

    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      filters.push(`(df.file_name ILIKE $${params.length} OR df.original_name ILIKE $${params.length})`);
    }

    params.push(limit);
    const result = await pool.query(`
      SELECT df.file_id, df.file_name, df.original_name, df.file_extension, df.file_type,
             df.project_id,
             df.mime_type, df.file_size, df.storage_path, df.storage_type,
             df.processing_status, df.validation_status, df.error_message,
             df.created_at, p.name AS project_name
      FROM data_files df
      LEFT JOIN projects p ON p.project_id = df.project_id
      WHERE ${filters.join(' AND ')}
      ORDER BY df.created_at DESC
      LIMIT $${params.length}
    `, params);

    const files = await Promise.all(result.rows.map(async row => {
      const health = await buildFileHealth(row);

      return {
        ...row,
        file_size_label: formatBytes(row.file_size),
        local_file_exists: health.disk.exists,
        local_file_path: health.disk.path,
        local_file_size: health.disk.fileSize,
        size_matches: health.sizeMatches
      };
    }));

    return res.json({ success: true, files });
  } catch (error) {
    console.error('Admin files error:', error);
    return res.status(500).json({ success: false, message: '無法載入檔案健康資料' });
  }
}

export async function checkAdminFile(req, res) {
  try {
    const result = await pool.query(`
      SELECT df.file_id, df.project_id, df.file_name, df.original_name, df.file_extension,
             df.file_type, df.mime_type, df.file_size, df.storage_path, df.storage_type,
             df.processing_status, df.validation_status, df.error_message,
             df.created_at, df.updated_at, p.name AS project_name
      FROM data_files df
      LEFT JOIN projects p ON p.project_id = df.project_id
      WHERE df.file_id = $1 AND df.deleted_at IS NULL
      LIMIT 1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到檔案紀錄' });
    }

    const file = result.rows[0];
    const health = await buildFileHealth(file);
    return res.json({
      success: true,
      file: {
        ...file,
        file_size_label: formatBytes(file.file_size)
      },
      health
    });
  } catch (error) {
    console.error('Admin file check error:', error);
    return res.status(500).json({ success: false, message: '無法檢查檔案健康狀態' });
  }
}

export async function auditAdminFiles(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 300), 1000);
    const result = await pool.query(`
      SELECT df.file_id, df.project_id, df.file_name, df.original_name, df.file_extension,
             df.file_type, df.mime_type, df.file_size, df.storage_path, df.storage_type,
             df.processing_status, df.validation_status, df.error_message,
             df.created_at, df.updated_at, p.name AS project_name
      FROM data_files df
      LEFT JOIN projects p ON p.project_id = df.project_id
      WHERE df.deleted_at IS NULL
      ORDER BY df.created_at DESC
      LIMIT $1
    `, [limit]);

    const audited = await Promise.all(result.rows.map(async file => {
      const health = await buildFileHealth(file);
      return {
        file: {
          ...file,
          file_size_label: formatBytes(file.file_size)
        },
        health
      };
    }));

    const summary = audited.reduce((acc, item) => {
      acc.total += 1;
      acc[item.health.status] = (acc[item.health.status] || 0) + 1;
      return acc;
    }, { total: 0, ok: 0, missing: 0, 'size-mismatch': 0, external: 0 });

    const problems = audited
      .filter(item => ['missing', 'size-mismatch'].includes(item.health.status))
      .slice(0, 100);

    return res.json({
      success: true,
      checkedAt: new Date().toISOString(),
      limit,
      summary,
      problems
    });
  } catch (error) {
    console.error('Admin file audit error:', error);
    return res.status(500).json({ success: false, message: '無法執行批次檔案掃描' });
  }
}

export async function getAdminIssues(req, res) {
  try {
    const [health, failedFiles, failedLayers, recentFiles] = await Promise.all([
      checkTitilerHealth(),
      pool.query(`
        SELECT df.file_id, df.project_id, df.file_name, df.original_name, df.file_size,
               df.storage_path, df.storage_type, df.processing_status, df.error_message,
               df.created_at, p.name AS project_name
        FROM data_files df
        LEFT JOIN projects p ON p.project_id = df.project_id
        WHERE df.deleted_at IS NULL AND df.processing_status = 'failed'
        ORDER BY df.created_at DESC
        LIMIT 30
      `),
      pool.query(`
        SELECT sl.layer_id, sl.project_id, sl.layer_name, sl.display_name,
               sl.processing_status, sl.error_message, sl.created_at, p.name AS project_name
        FROM spatial_layers sl
        LEFT JOIN projects p ON p.project_id = sl.project_id
        WHERE sl.deleted_at IS NULL AND sl.processing_status = 'failed'
        ORDER BY sl.created_at DESC
        LIMIT 30
      `),
      pool.query(`
        SELECT df.file_id, df.project_id, df.file_name, df.original_name, df.file_size,
               df.storage_path, df.storage_type, df.processing_status, df.created_at,
               p.name AS project_name
        FROM data_files df
        LEFT JOIN projects p ON p.project_id = df.project_id
        WHERE df.deleted_at IS NULL AND df.storage_type = 'local'
        ORDER BY df.created_at DESC
        LIMIT 80
      `)
    ]);

    const issues = [];
    if (health.status !== 'ok') {
      issues.push(toIssue(
        'service',
        'high',
        'TiTiler health check 失敗',
        health.message || `${health.url} 無法正常回應`,
        { service: 'titiler', url: health.url }
      ));
    }

    failedFiles.rows.forEach(file => {
      issues.push(toIssue(
        'file-processing',
        'high',
        '檔案處理失敗',
        file.error_message || 'processing_status = failed',
        file
      ));
    });

    failedLayers.rows.forEach(layer => {
      issues.push(toIssue(
        'layer-processing',
        'high',
        '圖層處理失敗',
        layer.error_message || 'processing_status = failed',
        layer
      ));
    });

    for (const file of recentFiles.rows) {
      const localFile = await statStoragePath(file.storage_path, file.storage_type || 'local');
      if (!localFile.exists) {
        issues.push(toIssue(
          'file-missing',
          'high',
          '找不到實體檔案',
          file.storage_path,
          file
        ));
      } else if (Number(file.file_size || 0) !== Number(localFile.size || 0)) {
        issues.push(toIssue(
          'file-size-mismatch',
          'medium',
          '檔案大小與資料庫不一致',
          `DB ${formatBytes(file.file_size)} / Disk ${formatBytes(localFile.size)}`,
          { ...file, local_file_size: localFile.size }
        ));
      }
    }

    issues.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const severityDiff = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return res.json({
      success: true,
      issues,
      summary: {
        total: issues.length,
        high: issues.filter(issue => issue.severity === 'high').length,
        medium: issues.filter(issue => issue.severity === 'medium').length,
        low: issues.filter(issue => issue.severity === 'low').length
      }
    });
  } catch (error) {
    console.error('Admin issues error:', error);
    return res.status(500).json({ success: false, message: '無法載入問題清單' });
  }
}

export async function getAdminProjectDetail(req, res) {
  try {
    const { id } = req.params;
    const [projectResult, filesResult, layersResult, pointsResult] = await Promise.all([
      pool.query(`
        SELECT project_id, name, description, status, road_type, road_number,
               file_count, layer_count, total_size, created_at, updated_at
        FROM projects
        WHERE project_id = $1 AND deleted_at IS NULL
        LIMIT 1
      `, [id]),
      pool.query(`
        SELECT file_id, file_name, original_name, file_type, file_size, storage_path,
               storage_type, processing_status, validation_status, error_message, created_at
        FROM data_files
        WHERE project_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 80
      `, [id]),
      pool.query(`
        SELECT layer_id, layer_name, display_name, geometry_type, feature_count,
               processing_status, validation_status, error_message, created_at
        FROM spatial_layers
        WHERE project_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 80
      `, [id]),
      pool.query(`
        SELECT disaster_point_id, name, latitude, longitude, created_at
        FROM disaster_points
        WHERE project_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 80
      `, [id])
    ]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到專案' });
    }

    const files = await Promise.all(filesResult.rows.map(async file => {
      const health = await buildFileHealth(file);
      return {
        ...file,
        file_size_label: formatBytes(file.file_size),
        local_file_exists: health.disk.exists,
        local_file_size: health.disk.fileSize,
        size_matches: health.sizeMatches
      };
    }));

    return res.json({
      success: true,
      project: {
        ...projectResult.rows[0],
        total_size_label: formatBytes(projectResult.rows[0].total_size)
      },
      files,
      layers: layersResult.rows,
      disasterPoints: pointsResult.rows,
      summary: {
        files: files.length,
        layers: layersResult.rows.length,
        disasterPoints: pointsResult.rows.length,
        missingFiles: files.filter(file => file.local_file_exists === false).length,
        failedFiles: files.filter(file => file.processing_status === 'failed').length,
        failedLayers: layersResult.rows.filter(layer => layer.processing_status === 'failed').length
      }
    });
  } catch (error) {
    console.error('Admin project detail error:', error);
    return res.status(500).json({ success: false, message: '無法載入專案詳情' });
  }
}

export async function getAdminHealth(req, res) {
  const started = Date.now();
  try {
    const dbStarted = Date.now();
    await pool.query('SELECT 1');

    const [uploads, data, titiler, failedFiles, invalidLayers] = await Promise.all([
      directoryStats(storageConfig.uploadsRoot),
      directoryStats(storageConfig.dataRoot),
      checkTitilerHealth(),
      countFrom('data_files', "deleted_at IS NULL AND processing_status = 'failed'"),
      countFrom('spatial_layers', "deleted_at IS NULL AND processing_status = 'failed'")
    ]);

    const issues = [];
    if (titiler.status !== 'ok') issues.push('TiTiler 無法通過 health check');
    if (failedFiles > 0) issues.push(`有 ${failedFiles} 筆檔案處理失敗`);
    if (invalidLayers > 0) issues.push(`有 ${invalidLayers} 筆圖層處理失敗`);

    return res.json({
      success: true,
      status: issues.length ? 'warning' : 'ok',
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      services: {
        database: { status: 'ok', latencyMs: Date.now() - dbStarted },
        titiler
      },
      storage: {
        uploads: { ...uploads, label: formatBytes(uploads.totalBytes) },
        data: { ...data, label: formatBytes(data.totalBytes) }
      },
      issues
    });
  } catch (error) {
    console.error('Admin health error:', error);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: '系統健康檢查失敗',
      error: error.message
    });
  }
}
