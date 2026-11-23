import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ProjectShare = sequelize.define('ProjectShare', {
  share_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  kind: { type: DataTypes.STRING(20), allowNull: false },
  project_id: DataTypes.UUID,
  region_id: DataTypes.UUID,
  token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  created_by: DataTypes.UUID,
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: DataTypes.DATE
}, { tableName: 'project_shares', createdAt: 'created_at', updatedAt: false, paranoid: false });
