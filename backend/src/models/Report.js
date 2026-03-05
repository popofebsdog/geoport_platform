import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Report = sequelize.define('Report', {
  reportId: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    field: 'report_id'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileType: {
    type: DataTypes.ENUM('pdf', 'url'),
    allowNull: false,
    field: 'file_type'
  },
  filePath: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'file_path'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'file_name'
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'owner_id'
  },
  isBookmarked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_bookmarked'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  }
}, {
  tableName: 'reports',
  timestamps: true,
  paranoid: true, // 軟刪除
  underscored: true,
  indexes: [
    {
      fields: ['title']
    },
    {
      fields: ['file_type']
    },
    {
      fields: ['owner_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_bookmarked']
    }
  ]
});

// 類方法
Report.searchByTitle = async function(searchTerm) {
  return await this.findAll({
    where: {
      title: {
        [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%`
      }
    },
    order: [['created_at', 'DESC']]
  });
};
