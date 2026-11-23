import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const User = sequelize.define('User', {
  user_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  display_name: DataTypes.STRING(100),
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  is_active: DataTypes.BOOLEAN,
  is_verified: DataTypes.BOOLEAN,
  last_login_at: DataTypes.DATE,
  last_activity_at: DataTypes.DATE
}, {
  tableName: 'users', paranoid: true,
  createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at'
});
