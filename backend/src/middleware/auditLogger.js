import logger from '../utils/logger.js';

// Security: Audit logging for auth, admin actions, file uploads, and errors
export const auditLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      type: 'audit',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'unknown',
      duration: `${duration}ms`,
    };

    // Security: Include user identity but NEVER log tokens or passwords
    if (req.user) {
      logEntry.userId = req.user.userId;
      logEntry.username = req.user.username;
      logEntry.role = req.user.role;
    }

    const isAuthRoute = req.originalUrl.startsWith('/api/auth');
    const isAdminAction = req.user?.role === 'admin' && ['POST', 'PUT', 'DELETE'].includes(req.method);
    const isFileUpload = req.originalUrl.includes('upload') || req.originalUrl.includes('data-file');
    const isError = res.statusCode >= 400;
    const isServerError = res.statusCode >= 500;

    if (isAuthRoute || isAdminAction || isFileUpload || isError) {
      logEntry.securityEvent = true;

      if (isAuthRoute && req.method === 'POST') {
        logEntry.eventType = 'auth_attempt';
        // Security: Log attempted username for audit trail, NEVER log password
        if (req.body?.username) {
          logEntry.attemptedUsername = req.body.username;
        }
      } else if (isAdminAction) {
        logEntry.eventType = 'admin_action';
      } else if (isFileUpload) {
        logEntry.eventType = 'file_upload';
      } else if (isServerError) {
        logEntry.eventType = 'server_error';
      } else if (isError) {
        logEntry.eventType = 'client_error';
      }

      if (isServerError) {
        logger.error('Security audit', logEntry);
      } else if (isError) {
        logger.warn('Security audit', logEntry);
      } else {
        logger.info('Security audit', logEntry);
      }
    }
  });

  next();
};
