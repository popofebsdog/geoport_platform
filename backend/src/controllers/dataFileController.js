import { DataFile } from '../models/DataFile.js';
import { Op } from 'sequelize';

// 獲取所有資料檔案
export const getAllDataFiles = async (req, res) => {
  try {
    const { search, fileType, projectId } = req.query;
    
    let whereClause = {};
    
    // 搜尋條件
    if (search) {
      whereClause[Op.or] = [
        { fileName: { [Op.iLike]: `%${search}%` } },
        { originalName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // 檔案類型篩選
    if (fileType) {
      whereClause.fileType = fileType;
    }
    
    // 專案ID篩選
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    const dataFiles = await DataFile.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: { dataFiles }
    });
  } catch (error) {
    console.error('獲取資料檔案列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取資料檔案列表失敗',
      error: error.message
    });
  }
};

// 獲取單個資料檔案
export const getDataFileById = async (req, res) => {
  try {
    const { id } = req.params;
    const dataFile = await DataFile.findByPk(id);
    
    if (!dataFile) {
      return res.status(404).json({ success: false, message: '資料檔案未找到' });
    }
    
    res.json({ success: true, data: { dataFile } });
  } catch (error) {
    console.error('獲取資料檔案錯誤:', error);
    res.status(500).json({ success: false, message: '獲取資料檔案失敗', error: error.message });
  }
};

// 創建資料檔案
export const createDataFile = async (req, res) => {
  try {
    const { 
      projectId, 
      fileName, 
      fileType, 
      storagePath, 
      fileSize, 
      metadata,
      uploaderId 
    } = req.body;
    
    const newDataFile = await DataFile.create({
      projectId,
      fileName,
      fileType,
      storagePath,
      fileSize: fileSize || 0,
      metadata,
      uploaderId
    });
    
    res.status(201).json({ 
      success: true, 
      message: '資料檔案創建成功', 
      data: { dataFile: newDataFile } 
    });
  } catch (error) {
    console.error('創建資料檔案錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '創建資料檔案失敗', 
      error: error.message 
    });
  }
};

// 更新資料檔案
export const updateDataFile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const dataFile = await DataFile.findByPk(id);
    
    if (!dataFile) {
      return res.status(404).json({ success: false, message: '資料檔案未找到' });
    }
    
    await dataFile.update(updateData);
    
    res.json({ success: true, message: '資料檔案更新成功', data: { dataFile } });
  } catch (error) {
    console.error('更新資料檔案錯誤:', error);
    res.status(500).json({ success: false, message: '更新資料檔案失敗', error: error.message });
  }
};

// 刪除資料檔案 (軟刪除)
export const deleteDataFile = async (req, res) => {
  try {
    const { id } = req.params;
    const dataFile = await DataFile.findByPk(id);
    
    if (!dataFile) {
      return res.status(404).json({ success: false, message: '資料檔案未找到' });
    }
    
    await dataFile.destroy(); // 軟刪除
    
    res.json({ success: true, message: '資料檔案已移至垃圾桶' });
  } catch (error) {
    console.error('刪除資料檔案錯誤:', error);
    res.status(500).json({ success: false, message: '刪除資料檔案失敗', error: error.message });
  }
};

// 永久刪除資料檔案
export const permanentDeleteDataFile = async (req, res) => {
  try {
    const { id } = req.params;
    const dataFile = await DataFile.findByPk(id, { paranoid: false }); // 查找包括軟刪除的檔案
    
    if (!dataFile) {
      return res.status(404).json({ success: false, message: '資料檔案未找到' });
    }
    
    await dataFile.destroy({ force: true }); // 永久刪除
    
    res.json({ success: true, message: '資料檔案已永久刪除' });
  } catch (error) {
    console.error('永久刪除資料檔案錯誤:', error);
    res.status(500).json({ success: false, message: '永久刪除資料檔案失敗', error: error.message });
  }
};

// 獲取所有已刪除的資料檔案
export const getDeletedDataFiles = async (req, res) => {
  try {
    const deletedDataFiles = await DataFile.findAll({
      where: {
        deleted_at: { [Op.ne]: null } // 查找 deleted_at 不為 null 的記錄
      },
      paranoid: false, // 包含軟刪除的記錄
      order: [['deleted_at', 'DESC']]
    });
    
    // 轉換資料格式以符合前端需求
    const formattedDataFiles = deletedDataFiles.map(file => ({
      id: file.fileId,
      name: file.fileName,
      description: file.metadata?.description || '無描述',
      type: file.fileType,
      size: formatFileSize(file.fileSize),
      deletedAt: file.deletedAt,
      originalProject: file.metadata?.originalProject || '未知專案'
    }));
    
    res.json({ success: true, data: { dataFiles: formattedDataFiles } });
  } catch (error) {
    console.error('獲取已刪除資料檔案列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取已刪除資料檔案列表失敗',
      error: error.message
    });
  }
};

// 還原資料檔案
export const restoreDataFile = async (req, res) => {
  try {
    const { id } = req.params;
    const dataFile = await DataFile.findByPk(id, { paranoid: false }); // 查找包括軟刪除的檔案
    
    if (!dataFile) {
      return res.status(404).json({ success: false, message: '資料檔案未找到' });
    }
    
    await dataFile.restore(); // 還原軟刪除的檔案
    
    res.json({ success: true, message: '資料檔案已成功還原', data: { dataFile } });
  } catch (error) {
    console.error('還原資料檔案錯誤:', error);
    res.status(500).json({ success: false, message: '還原資料檔案失敗', error: error.message });
  }
};

// 輔助函數：格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
