import { Project } from '../models/Project.js';
import { Op } from 'sequelize';

// 獲取所有項目
export const getAllProjects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      roadType, 
      highway, 
      search,
      startDate,
      endDate,
      status = 'active'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      status,
      deletedAt: null
    };

    // 添加篩選條件
    if (roadType) {
      whereClause.roadType = roadType;
    }

    if (highway) {
      whereClause.roadNumber = highway;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (startDate || endDate) {
      whereClause.startDate = {};
      if (startDate) {
        whereClause.startDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.startDate[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows } = await Project.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // 處理 PostGIS 幾何數據，轉換為經緯度座標
    const projectsWithCoordinates = rows.map(project => {
      const projectData = project.toJSON();
      
      // 如果有 locationGeometry，提取經緯度
      if (projectData.locationGeometry && projectData.locationGeometry.coordinates) {
        const [longitude, latitude] = projectData.locationGeometry.coordinates;
        projectData.latitude = latitude;
        projectData.longitude = longitude;
      }
      
      return projectData;
    });

    res.json({
      success: true,
      data: {
        projects: projectsWithCoordinates,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取項目列表錯誤:', error);
    res.status(500).json({ success: false, message: '獲取項目列表失敗' });
  }
};

// 獲取單個項目
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 處理 PostGIS 幾何數據，轉換為經緯度座標
    const projectData = project.toJSON();
    
    // 如果有 locationGeometry，提取經緯度
    if (projectData.locationGeometry && projectData.locationGeometry.coordinates) {
      const [longitude, latitude] = projectData.locationGeometry.coordinates;
      projectData.latitude = latitude;
      projectData.longitude = longitude;
    }

    res.json({
      success: true,
      data: projectData
    });
  } catch (error) {
    console.error('獲取項目錯誤:', error);
    res.status(500).json({ success: false, message: '獲取項目失敗' });
  }
};

// 創建新項目
export const createProject = async (req, res) => {
  try {
    const {
      name, description, startDate, endDate,
      roadType, roadNumber, latitude, longitude,
      status, locationGeometry
    } = req.body;
    const projectData = {
      name, description, startDate, endDate,
      roadType, roadNumber, latitude, longitude,
      status, locationGeometry
    };

    // 驗證必填字段
    const requiredFields = ['name', 'description', 'startDate', 'endDate'];
    for (const field of requiredFields) {
      if (!projectData[field]) {
        return res.status(400).json({
          success: false,
          message: `缺少必填字段: ${field}`
        });
      }
    }

    // 驗證時間
    if (new Date(projectData.endDate) <= new Date(projectData.startDate)) {
      return res.status(400).json({
        success: false,
        message: '結束時間必須晚於開始時間'
      });
    }

    // 處理地理位置資料
    if (projectData.locationGeometry && projectData.locationGeometry.coordinates) {
      const [lng, lat] = projectData.locationGeometry.coordinates;
      projectData.locationGeometry = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }

    const project = await Project.create(projectData);

    res.status(201).json({
      success: true,
      message: '項目創建成功',
      data: project
    });
  } catch (error) {
    console.error('創建項目錯誤:', error);
    res.status(500).json({ success: false, message: '創建項目失敗' });
  }
};

// 更新項目
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, startDate, endDate,
      roadType, roadNumber, latitude, longitude,
      status, locationGeometry
    } = req.body;
    const updateData = Object.fromEntries(
      Object.entries({ name, description, startDate, endDate, roadType, roadNumber, latitude, longitude, status, locationGeometry })
        .filter(([, v]) => v !== undefined)
    );

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    // 驗證時間
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.endDate) <= new Date(updateData.startDate)) {
        return res.status(400).json({
          success: false,
          message: '結束時間必須晚於開始時間'
        });
      }
    }
    
    // 處理地理位置資料
    if (updateData.locationGeometry && updateData.locationGeometry.coordinates) {
      const [lng, lat] = updateData.locationGeometry.coordinates;
      updateData.locationGeometry = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }

    await project.update(updateData);

    res.json({
      success: true,
      message: '項目更新成功',
      data: project
    });
  } catch (error) {
    console.error('更新項目錯誤:', error);
    res.status(500).json({ success: false, message: '更新項目失敗' });
  }
};

// 刪除項目（軟刪除）
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    await project.destroy();

    res.json({
      success: true,
      message: '項目已刪除'
    });
  } catch (error) {
    console.error('刪除項目錯誤:', error);
    res.status(500).json({ success: false, message: '刪除項目失敗' });
  }
};

// 切換書籤狀態
export const toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    project.isBookmarked = !project.isBookmarked;
    await project.save();

    res.json({
      success: true,
      message: `項目已${project.isBookmarked ? '標記' : '取消標記'}`,
      data: project
    });
  } catch (error) {
    console.error('切換書籤錯誤:', error);
    res.status(500).json({ success: false, message: '切換書籤失敗' });
  }
};

// 獲取已刪除的項目
export const getDeletedProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null
        }
      },
      order: [['deletedAt', 'DESC']],
      paranoid: false // 包含已刪除的記錄
    });

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('獲取已刪除項目錯誤:', error);
    res.status(500).json({ success: false, message: '獲取已刪除項目失敗' });
  }
};

// 還原項目
export const restoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id, { paranoid: false });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '項目不存在'
      });
    }

    if (!project.deletedAt) {
      return res.status(400).json({
        success: false,
        message: '項目未被刪除'
      });
    }

    await project.restore();

    res.json({
      success: true,
      message: '項目已還原',
      data: project
    });
  } catch (error) {
    console.error('還原項目錯誤:', error);
    res.status(500).json({ success: false, message: '還原項目失敗' });
  }
};
