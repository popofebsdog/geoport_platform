import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Project = sequelize.define('Project', {
  projectId: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    field: 'project_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  locationGeometry: {
    type: DataTypes.GEOMETRY('POINT', 4326),
    allowNull: true,
    field: 'location_geometry'
  },
  locationDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'location_description'
  },
  roadType: {
    type: DataTypes.ENUM('highway', 'national', 'railway', 'other'),
    allowNull: true,
    field: 'road_type'
  },
  roadNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'road_number'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'archived', 'draft'),
    defaultValue: 'active'
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
  fileCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'file_count'
  },
  totalSize: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'total_size'
  },
  layerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'layer_count'
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
  tableName: 'projects',
  timestamps: true,
  paranoid: true, // 軟刪除
  underscored: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['road_type']
    },
    {
      fields: ['road_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['owner_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// 實例方法
Project.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// 類方法
Project.findActive = function() {
  return this.findAll({
    where: {
      status: 'active',
      deletedAt: null
    },
    order: [['createdAt', 'DESC']]
  });
};

Project.findByRoadType = function(roadType) {
  return this.findAll({
    where: {
      roadType,
      status: 'active',
      deletedAt: null
    },
    order: [['createdAt', 'DESC']]
  });
};

Project.searchByName = function(query) {
  return this.findAll({
    where: {
      name: {
        [sequelize.Sequelize.Op.like]: `%${query}%`
      },
      status: 'active',
      deletedAt: null
    },
    order: [['createdAt', 'DESC']]
  });
};
