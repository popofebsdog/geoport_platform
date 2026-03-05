/**
 * Metadata 輔助函數
 * 用於標準化 JSONB metadata 的操作
 */

// 標準化的 metadata 結構
export const createMetadata = (dataInfo = {}, spatialInfo = {}, analysisInfo = {}, technicalInfo = {}) => {
  return {
    data_info: {
      name: '',
      description: '',
      date: '',
      source: '',
      quality_rating: null,
      ...dataInfo
    },
    spatial_info: {
      geometry_type: null,
      feature_count: 0,
      coordinate_system: 'WGS84',
      bounds: null,
      ...spatialInfo
    },
    analysis_info: {
      type: null,
      intervals: [],
      color_scheme: 'default',
      processing_status: 'pending',
      ...analysisInfo
    },
    technical_info: {
      file_hash: null,
      processing_time: null,
      validation_errors: [],
      ...technicalInfo
    }
  };
};

// 更新 metadata 的特定部分
export const updateMetadata = (existingMetadata, updates) => {
  const metadata = existingMetadata || {};
  
  return {
    data_info: { ...metadata.data_info, ...updates.data_info },
    spatial_info: { ...metadata.spatial_info, ...updates.spatial_info },
    analysis_info: { ...metadata.analysis_info, ...updates.analysis_info },
    technical_info: { ...metadata.technical_info, ...updates.technical_info }
  };
};

// 從 metadata 中提取常用信息
export const extractDataInfo = (metadata) => {
  if (!metadata || !metadata.data_info) {
    return {
      name: '',
      description: '',
      date: '',
      source: '',
      quality_rating: null
    };
  }
  
  return {
    name: metadata.data_info.name || '',
    description: metadata.data_info.description || '',
    date: metadata.data_info.date || '',
    source: metadata.data_info.source || '',
    quality_rating: metadata.data_info.quality_rating || null
  };
};

// 驗證 metadata 結構
export const validateMetadata = (metadata) => {
  const errors = [];
  
  if (!metadata) {
    errors.push('Metadata 不能為空');
    return errors;
  }
  
  // 驗證 data_info
  if (!metadata.data_info) {
    errors.push('缺少 data_info 部分');
  } else {
    if (!metadata.data_info.name) {
      errors.push('data_info.name 是必填的');
    }
    if (!metadata.data_info.date) {
      errors.push('data_info.date 是必填的');
    }
  }
  
  // 驗證 analysis_info
  if (metadata.analysis_info && metadata.analysis_info.type) {
    const validTypes = ['potential_analysis', 'profile_observation', 'general'];
    if (!validTypes.includes(metadata.analysis_info.type)) {
      errors.push(`無效的分析類型: ${metadata.analysis_info.type}`);
    }
  }
  
  return errors;
};

// 建立查詢條件
export const buildMetadataQuery = (filters) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (filters.name) {
    conditions.push(`metadata->'data_info'->>'name' ILIKE $${paramIndex}`);
    params.push(`%${filters.name}%`);
    paramIndex++;
  }
  
  if (filters.description) {
    conditions.push(`metadata->'data_info'->>'description' ILIKE $${paramIndex}`);
    params.push(`%${filters.description}%`);
    paramIndex++;
  }
  
  if (filters.analysisType) {
    conditions.push(`metadata->'analysis_info'->>'type' = $${paramIndex}`);
    params.push(filters.analysisType);
    paramIndex++;
  }
  
  if (filters.dateFrom) {
    conditions.push(`(metadata->'data_info'->>'date')::date >= $${paramIndex}`);
    params.push(filters.dateFrom);
    paramIndex++;
  }
  
  if (filters.dateTo) {
    conditions.push(`(metadata->'data_info'->>'date')::date <= $${paramIndex}`);
    params.push(filters.dateTo);
    paramIndex++;
  }
  
  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};
