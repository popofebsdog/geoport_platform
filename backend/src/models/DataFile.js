import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const DataFile = sequelize.define('DataFile', {
  fileId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'file_id'
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'project_id'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name'
  },
  originalName: {
    type: DataTypes.STRING(255),
    field: 'original_name'
  },
  fileExtension: {
    type: DataTypes.STRING(20),
    field: 'file_extension'
  },
  fileType: {
    type: DataTypes.ENUM('raster', 'vector', 'csv', 'lidar', 'report', 'image', 'document', 'other'),
    allowNull: false,
    field: 'file_type'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    field: 'mime_type'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'file_size'
  },
  storagePath: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'storage_path'
  },
  storageType: {
    type: DataTypes.STRING(20),
    defaultValue: 'local',
    field: 'storage_type'
  },
  fileHash: {
    type: DataTypes.STRING(64),
    field: 'file_hash'
  },
  checksum: {
    type: DataTypes.STRING(32),
    field: 'checksum'
  },
  uploadDate: {
    type: DataTypes.DATE,
    field: 'upload_date'
  },
  uploaderId: {
    type: DataTypes.UUID,
    field: 'uploader_id'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    field: 'status'
  },
  processingStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    field: 'processing_status'
  },
  hasSpatialData: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_spatial_data'
  },
  spatialExtent: {
    type: DataTypes.GEOMETRY('POLYGON', 4326),
    field: 'spatial_extent'
  },
  coordinateSystem: {
    type: DataTypes.STRING(50),
    field: 'coordinate_system'
  },
  srid: {
    type: DataTypes.INTEGER,
    field: 'srid'
  },
  dataQualityScore: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'data_quality_score'
  },
  validationStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    field: 'validation_status'
  },
  validationErrors: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    field: 'validation_errors'
  },
  processingLog: {
    type: DataTypes.TEXT,
    field: 'processing_log'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    field: 'error_message'
  },
  processingMetadata: {
    type: DataTypes.JSONB,
    field: 'processing_metadata'
  },
  version: {
    type: DataTypes.STRING(20),
    defaultValue: '1.0',
    field: 'version'
  },
  parentFileId: {
    type: DataTypes.UUID,
    field: 'parent_file_id'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  accessLevel: {
    type: DataTypes.STRING(20),
    defaultValue: 'private',
    field: 'access_level'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    field: 'tags'
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    field: 'keywords'
  },
  metadata: {
    type: DataTypes.JSONB,
    field: 'metadata'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at'
  }
}, {
  tableName: 'data_files',
  timestamps: true,
  paranoid: true, // 啟用軟刪除
  underscored: true, // 使用 snake_case 命名約定
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['file_type']
    },
    {
      fields: ['uploader_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['deleted_at']
    }
  ]
});

// 類方法
DataFile.searchByFileName = async function(searchTerm) {
  return await this.findAll({
    where: {
      fileName: {
        [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%`
      }
    },
    order: [['created_at', 'DESC']]
  });
};

DataFile.getByProjectId = async function(projectId) {
  return await this.findAll({
    where: {
      projectId: projectId
    },
    order: [['created_at', 'DESC']]
  });
};

DataFile.getDeleted = async function() {
  return await this.findAll({
    where: {
      deleted_at: { [sequelize.Sequelize.Op.ne]: null }
    },
    paranoid: false,
    order: [['deleted_at', 'DESC']]
  });
};
