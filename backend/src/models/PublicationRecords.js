import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PublicationDisasterPoint = sequelize.define('PublicationDisasterPoint', {
  disaster_point_id: { type: DataTypes.UUID, primaryKey: true },
  project_id: DataTypes.UUID, name: DataTypes.STRING, description: DataTypes.TEXT,
  latitude: DataTypes.DECIMAL, longitude: DataTypes.DECIMAL, disaster_time: DataTypes.DATE
}, { tableName: 'disaster_points', timestamps: false, paranoid: false });

export const PublicationMedia = sequelize.define('PublicationMedia', {
  media_id: { type: DataTypes.UUID, primaryKey: true }, project_id: DataTypes.UUID,
  original_name: DataTypes.STRING, storage_path: DataTypes.TEXT, mime_type: DataTypes.STRING,
  file_size: DataTypes.BIGINT, description: DataTypes.TEXT, media_type: DataTypes.STRING,
  taken_at: DataTypes.DATE, created_at: DataTypes.DATE
}, { tableName: 'image_records', timestamps: false, paranoid: false });

export const PublicationInspection = sequelize.define('PublicationInspection', {
  record_id: { type: DataTypes.UUID, primaryKey: true }, region_id: DataTypes.UUID,
  mileage: DataTypes.STRING, inspection_type: DataTypes.STRING, inspection_date: DataTypes.DATEONLY,
  inspection_data: DataTypes.JSONB, is_disaster: DataTypes.BOOLEAN, created_at: DataTypes.DATE
}, { tableName: 'inspection_records', timestamps: false, paranoid: false });

export const PublicationAlert = sequelize.define('PublicationAlert', {
  light_id: { type: DataTypes.UUID, primaryKey: true }, region_id: DataTypes.UUID,
  mileage: DataTypes.STRING, current_level: DataTypes.STRING, longitude: DataTypes.DECIMAL,
  latitude: DataTypes.DECIMAL, updated_at: DataTypes.DATE
}, { tableName: 'warning_region_alert_lights', timestamps: false, paranoid: false });
