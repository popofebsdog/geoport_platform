import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SpatialLayer = sequelize.define('SpatialLayer', {
  layer_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  project_id: { type: DataTypes.UUID, allowNull: false },
  source_file_id: DataTypes.UUID,
  layer_name: { type: DataTypes.STRING, allowNull: false },
  display_name: DataTypes.STRING,
  description: DataTypes.TEXT,
  geometry_type: { type: DataTypes.STRING, allowNull: false },
  srid: { type: DataTypes.INTEGER, defaultValue: 4326 },
  spatial_extent: DataTypes.GEOMETRY('POLYGON', 4326),
  bbox_min_x: DataTypes.DECIMAL(15, 8),
  bbox_min_y: DataTypes.DECIMAL(15, 8),
  bbox_max_x: DataTypes.DECIMAL(15, 8),
  bbox_max_y: DataTypes.DECIMAL(15, 8),
  feature_count: DataTypes.INTEGER,
  layer_style: DataTypes.JSONB,
  opacity: DataTypes.DECIMAL(3, 2),
  visible: DataTypes.BOOLEAN,
  z_index: DataTypes.INTEGER,
  processing_status: DataTypes.STRING,
  metadata: DataTypes.JSONB
}, { tableName: 'spatial_layers', createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at', paranoid: true });
