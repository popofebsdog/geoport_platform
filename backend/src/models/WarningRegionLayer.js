import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WarningRegion = sequelize.define('WarningRegion', {
  region_id: { type: DataTypes.UUID, primaryKey: true },
  region_code: DataTypes.STRING,
  deleted_at: DataTypes.DATE
}, { tableName: 'warning_regions', timestamps: false, paranoid: false });

export const WarningRegionLayer = sequelize.define('WarningRegionLayer', {
  layer_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  region_id: { type: DataTypes.UUID, allowNull: false },
  region_code: { type: DataTypes.STRING, allowNull: false },
  layer_type: { type: DataTypes.STRING, allowNull: false },
  layer_name: { type: DataTypes.STRING, allowNull: false },
  storage_path: { type: DataTypes.TEXT, allowNull: false },
  display_config: { type: DataTypes.JSONB, defaultValue: {} },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'warning_region_layers', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: false });
