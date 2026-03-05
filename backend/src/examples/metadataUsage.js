/**
 * JSONB Metadata 使用範例
 * 展示如何有效使用優化後的 metadata 結構
 */

import { createMetadata, updateMetadata, extractDataInfo, buildMetadataQuery } from '../utils/metadataHelper.js';

// 範例 1: 建立不同類型的資料 metadata
export const createPotentialAnalysisMetadata = (dataInfo) => {
  return createMetadata(
    {
      name: dataInfo.name,
      description: dataInfo.description,
      date: dataInfo.date,
      source: 'field_survey',
      quality_rating: 4.5
    },
    {
      geometry_type: 'Polygon',
      feature_count: 150,
      coordinate_system: 'WGS84',
      bounds: {
        min_x: 121.5,
        min_y: 25.0,
        max_x: 121.6,
        max_y: 25.1
      }
    },
    {
      type: 'potential_analysis',
      intervals: [
        { min: 0, max: 0.3, color: '#00ff00', label: '低風險' },
        { min: 0.3, max: 0.6, color: '#ffff00', label: '中風險' },
        { min: 0.6, max: 1.0, color: '#ff0000', label: '高風險' }
      ],
      color_scheme: 'blue-red',
      processing_status: 'completed'
    },
    {
      file_hash: 'sha256:abc123...',
      processing_time: new Date().toISOString(),
      validation_errors: []
    }
  );
};

export const createProfileObservationMetadata = (dataInfo) => {
  return createMetadata(
    {
      name: dataInfo.name,
      description: dataInfo.description,
      date: dataInfo.date,
      source: 'drone_survey',
      quality_rating: 4.8
    },
    {
      geometry_type: 'LineString',
      feature_count: 25,
      coordinate_system: 'WGS84',
      bounds: null
    },
    {
      type: 'profile_observation',
      intervals: [],
      color_scheme: 'default',
      processing_status: 'pending'
    },
    {
      file_hash: 'sha256:def456...',
      processing_time: null,
      validation_errors: []
    }
  );
};

// 範例 2: 更新 metadata
export const updateDataMetadata = (existingMetadata, newDataInfo) => {
  return updateMetadata(existingMetadata, {
    data_info: {
      name: newDataInfo.name,
      description: newDataInfo.description,
      date: newDataInfo.date
    },
    technical_info: {
      processing_time: new Date().toISOString()
    }
  });
};

// 範例 3: 查詢範例
export const getQueryExamples = () => {
  return {
    // 查詢特定描述的資料
    searchByDescription: `
      SELECT * FROM data_files 
      WHERE metadata->'data_info'->>'description' ILIKE '%邊坡%'
      AND deleted_at IS NULL
      ORDER BY (metadata->'data_info'->>'date')::date DESC;
    `,
    
    // 查詢特定類型的分析資料
    searchByAnalysisType: `
      SELECT * FROM data_files 
      WHERE metadata->'analysis_info'->>'type' = 'potential_analysis'
      AND deleted_at IS NULL;
    `,
    
    // 查詢特定專案的資料
    searchByProject: `
      SELECT * FROM data_files 
      WHERE project_id = $1 
      AND metadata->'data_info'->>'name' ILIKE $2
      AND deleted_at IS NULL;
    `,
    
    // 複合查詢
    complexSearch: `
      SELECT 
        file_id,
        file_name,
        metadata->'data_info'->>'name' as data_name,
        metadata->'data_info'->>'description' as description,
        metadata->'data_info'->>'date' as data_date,
        metadata->'analysis_info'->>'type' as analysis_type,
        metadata->'spatial_info'->>'feature_count' as feature_count
      FROM data_files 
      WHERE project_id = $1
        AND metadata->'analysis_info'->>'type' = $2
        AND (metadata->'data_info'->>'date')::date >= $3
        AND (metadata->'data_info'->>'date')::date <= $4
        AND deleted_at IS NULL
      ORDER BY (metadata->'data_info'->>'date')::date DESC;
    `
  };
};

// 範例 4: 使用輔助函數建立查詢
export const buildSearchQuery = (filters) => {
  const { whereClause, params } = buildMetadataQuery(filters);
  
  return {
    query: `
      SELECT 
        file_id,
        file_name,
        metadata->'data_info'->>'name' as data_name,
        metadata->'data_info'->>'description' as description,
        metadata->'data_info'->>'date' as data_date,
        metadata->'analysis_info'->>'type' as analysis_type
      FROM data_files 
      ${whereClause}
      AND deleted_at IS NULL
      ORDER BY (metadata->'data_info'->>'date')::date DESC;
    `,
    params
  };
};

// 範例 5: 統計查詢
export const getStatisticsQueries = () => {
  return {
    // 按分析類型統計
    countByAnalysisType: `
      SELECT 
        metadata->'analysis_info'->>'type' as analysis_type,
        COUNT(*) as count
      FROM data_files 
      WHERE deleted_at IS NULL
      GROUP BY metadata->'analysis_info'->>'type'
      ORDER BY count DESC;
    `,
    
    // 按日期統計
    countByDate: `
      SELECT 
        DATE((metadata->'data_info'->>'date')::timestamp) as date,
        COUNT(*) as count
      FROM data_files 
      WHERE deleted_at IS NULL
        AND metadata->'data_info'->>'date' IS NOT NULL
      GROUP BY DATE((metadata->'data_info'->>'date')::timestamp)
      ORDER BY date DESC;
    `,
    
    // 按專案統計
    countByProject: `
      SELECT 
        p.project_name,
        COUNT(df.file_id) as file_count,
        COUNT(CASE WHEN df.metadata->'analysis_info'->>'type' = 'potential_analysis' THEN 1 END) as potential_analysis_count,
        COUNT(CASE WHEN df.metadata->'analysis_info'->>'type' = 'profile_observation' THEN 1 END) as profile_observation_count
      FROM projects p
      LEFT JOIN data_files df ON p.id = df.project_id AND df.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, p.project_name
      ORDER BY file_count DESC;
    `
  };
};

// 範例 6: 前端使用範例
export const frontendUsageExample = {
  // 建立新資料的 metadata
  createNewData: (formData) => {
    const metadata = createPotentialAnalysisMetadata({
      name: formData.name,
      description: formData.description,
      date: formData.date
    });
    
    return {
      file_name: formData.name,
      metadata: JSON.stringify(metadata)
    };
  },
  
  // 更新資料的 metadata
  updateExistingData: (existingMetadata, formData) => {
    const updatedMetadata = updateDataMetadata(existingMetadata, {
      name: formData.name,
      description: formData.description,
      date: formData.date
    });
    
    return JSON.stringify(updatedMetadata);
  },
  
  // 從 metadata 中提取顯示用的資料
  extractDisplayData: (metadata) => {
    const dataInfo = extractDataInfo(metadata);
    return {
      name: dataInfo.name,
      description: dataInfo.description,
      date: dataInfo.date,
      source: dataInfo.source,
      qualityRating: dataInfo.quality_rating
    };
  }
};
