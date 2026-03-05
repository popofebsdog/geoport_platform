import { Report } from '../models/Report.js';
import { Op } from 'sequelize';

// 獲取所有報告
export const getAllReports = async (req, res) => {
  try {
    const { search, fileType, bookmarked } = req.query;
    
    let whereClause = {};
    
    // 搜尋條件
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // 檔案類型篩選
    if (fileType) {
      whereClause.fileType = fileType;
    }
    
    // 標記篩選
    if (bookmarked === 'true') {
      whereClause.isBookmarked = true;
    }
    
    const reports = await Report.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: { reports }
    });
  } catch (error) {
    console.error('獲取報告列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取報告列表失敗',
      error: error.message
    });
  }
};

// 獲取單個報告
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '報告不存在'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('獲取報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取報告失敗',
      error: error.message
    });
  }
};

// 創建報告
export const createReport = async (req, res) => {
  try {
    const reportData = req.body;
    
    // 驗證必填字段
    if (!reportData.title || !reportData.fileType) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段: title 或 fileType'
      });
    }
    
    // 驗證檔案類型
    if (!['pdf', 'url'].includes(reportData.fileType)) {
      return res.status(400).json({
        success: false,
        message: '檔案類型必須是 pdf 或 url'
      });
    }
    
    // 根據檔案類型驗證必要字段
    if (reportData.fileType === 'pdf' && !reportData.filePath) {
      return res.status(400).json({
        success: false,
        message: 'PDF檔案必須提供檔案路徑'
      });
    }
    
    if (reportData.fileType === 'url' && !reportData.filePath) {
      return res.status(400).json({
        success: false,
        message: 'URL類型必須提供連結網址'
      });
    }
    
    const report = await Report.create(reportData);
    
    res.status(201).json({
      success: true,
      message: '報告創建成功',
      data: report
    });
  } catch (error) {
    console.error('創建報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建報告失敗',
      error: error.message
    });
  }
};

// 更新報告
export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const report = await Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '報告不存在'
      });
    }
    
    await report.update(updateData);
    
    res.json({
      success: true,
      message: '報告更新成功',
      data: report
    });
  } catch (error) {
    console.error('更新報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新報告失敗',
      error: error.message
    });
  }
};

// 刪除報告（軟刪除）
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '報告不存在'
      });
    }
    
    await report.destroy(); // Sequelize 的 destroy 方法會自動設置 deletedAt
    
    res.json({
      success: true,
      message: '報告已刪除'
    });
  } catch (error) {
    console.error('刪除報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除報告失敗',
      error: error.message
    });
  }
};

// 切換書籤狀態
export const toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: '報告不存在'
      });
    }
    
    report.isBookmarked = !report.isBookmarked;
    await report.save();
    
    res.json({
      success: true,
      message: `報告已${report.isBookmarked ? '標記' : '取消標記'}`,
      data: report
    });
  } catch (error) {
    console.error('切換書籤狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '切換書籤狀態失敗',
      error: error.message
    });
  }
};

// 獲取已刪除的報告
export const getDeletedReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
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
      data: { reports }
    });
  } catch (error) {
    console.error('獲取已刪除報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取已刪除報告失敗',
      error: error.message
    });
  }
};

// 還原報告
export const restoreReport = async (req, res) => {
  try {
    const { id } = req.params;
    // 使用 restore 方法來清除 deletedAt 欄位
    const restoredCount = await Report.restore({
      where: { reportId: id }
    });
    
    if (restoredCount === 0) {
      return res.status(404).json({
        success: false,
        message: '報告不存在或未被刪除'
      });
    }
    
    const report = await Report.findByPk(id); // 獲取還原後的報告
    
    res.json({
      success: true,
      message: '報告已還原',
      data: report
    });
  } catch (error) {
    console.error('還原報告錯誤:', error);
    res.status(500).json({
      success: false,
      message: '還原報告失敗',
      error: error.message
    });
  }
};
