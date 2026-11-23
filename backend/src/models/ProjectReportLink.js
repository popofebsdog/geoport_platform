import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ProjectReportLink = sequelize.define('ProjectReportLink', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  project_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.TEXT, allowNull: false },
  url: { type: DataTypes.TEXT, allowNull: false }
}, {
  tableName: 'project_report_links',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false
});
