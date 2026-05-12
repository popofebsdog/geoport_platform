import { pool } from '../config/database.js';

// 允許查詢的圖層白名單（對應 PostGIS table name）
const ALLOWED_LAYERS = {
  dodshp: 'spatial_dodshp'
};

/**
 * GET /api/spatial/:layer/bbox
 * 查詢指定空間範圍內的 features，回傳 GeoJSON FeatureCollection
 * Query params: xmin, ymin, xmax, ymax (EPSG:4326), limit (default 2000)
 */
export async function getLayerByBBox(req, res) {
  const { layer } = req.params;
  const tableName = ALLOWED_LAYERS[layer.toLowerCase()];

  if (!tableName) {
    return res.status(404).json({ success: false, message: `圖層 "${layer}" 不存在` });
  }

  const xmin = parseFloat(req.query.xmin);
  const ymin = parseFloat(req.query.ymin);
  const xmax = parseFloat(req.query.xmax);
  const ymax = parseFloat(req.query.ymax);
  const limit = Math.min(parseInt(req.query.limit) || 2000, 5000);

  if ([xmin, ymin, xmax, ymax].some(isNaN)) {
    return res.status(400).json({ success: false, message: '必須提供 xmin, ymin, xmax, ymax 參數' });
  }

  try {
    const sql = `
      SELECT
        id,
        fid,
        elev,
        ST_AsGeoJSON(geom)::json AS geometry
      FROM ${tableName}
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      LIMIT $5
    `;

    const result = await pool.query(sql, [xmin, ymin, xmax, ymax, limit]);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id: row.id,
        fid: row.fid,
        elev: row.elev
      }
    }));

    res.json({
      type: 'FeatureCollection',
      features,
      meta: {
        count: features.length,
        limit,
        bbox: [xmin, ymin, xmax, ymax]
      }
    });
  } catch (err) {
    console.error(`[spatialLayer] bbox query error (${tableName}):`, err.message);
    res.status(500).json({ success: false, message: '空間查詢失敗', error: err.message });
  }
}

/**
 * GET /api/spatial/:layer/info
 * 回傳圖層統計資訊（總筆數、bbox）
 */
export async function getLayerInfo(req, res) {
  const { layer } = req.params;
  const tableName = ALLOWED_LAYERS[layer.toLowerCase()];

  if (!tableName) {
    return res.status(404).json({ success: false, message: `圖層 "${layer}" 不存在` });
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        ST_AsGeoJSON(ST_Extent(geom))::json AS extent
      FROM ${tableName}
    `);

    res.json({ success: true, ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
