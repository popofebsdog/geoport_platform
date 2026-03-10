import logger from '../utils/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error details:', { error: err.message, stack: err.stack });

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

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: '數據已存在',
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: '關聯數據不存在',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '無效的令牌',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '令牌已過期',
    });
  }

  const statusCode = err.statusCode || 500;

  // Security: Never expose internal error details in production 500 responses
  const message = statusCode === 500 && isProduction
    ? '服務器內部錯誤'
    : (err.message || '服務器內部錯誤');

  res.status(statusCode).json({
    success: false,
    message,
    ...(!isProduction && { stack: err.stack }),
  });
};
