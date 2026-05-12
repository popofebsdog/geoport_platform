import { createLogger } from '../utils/logger.js';

const log = createLogger('error-handler');

export const errorHandler = (err, req, res, next) => {
  log.error('Unhandled request error', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode: err.statusCode || err.status || 500,
    error: err
  });

  // Multer upload errors
  if (err.name === 'MulterError') {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? '檔案超過允許大小'
      : err.message || '檔案上傳失敗';

    return res.status(statusCode).json({
      success: false,
      message,
      code: err.code
    });
  }

  if (err.message && (
    err.message.includes('不允許副檔名') ||
    err.message.includes('不允許 MIME') ||
    err.message.includes('不支援的檔案')
  )) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Sequelize 驗證錯誤
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: '數據驗證失敗',
      errors
    });
  }

  // Sequelize 唯一性約束錯誤
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: '數據已存在',
      error: err.errors[0].message
    });
  }

  // Sequelize 外鍵約束錯誤
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: '關聯數據不存在',
      error: err.message
    });
  }

  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '無效的令牌',
      error: 'Token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '令牌已過期',
      error: 'Token has expired'
    });
  }

  // 默認錯誤
  const statusCode = err.statusCode || 500;
  const message = err.message || '服務器內部錯誤';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
