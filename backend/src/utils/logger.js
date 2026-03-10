import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Custom format to prevent logging sensitive data
const sanitizeFormat = winston.format((info) => {
  // Remove potentially sensitive fields from the entire log object
  const sensitiveFields = ['password', 'token', 'secret', 'jwt', 'authorization', 'apikey', 'api_key', 'credentials'];
  const logKeys = Object.keys(info);
  
  for (const key of logKeys) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      info[key] = '[REDACTED]';
    }
    // Also sanitize nested objects
    if (typeof info[key] === 'object' && info[key] !== null) {
      sanitizeObject(info[key], sensitiveFields);
    }
  }
  
  return info;
});

function sanitizeObject(obj, sensitiveFields) {
  for (const key of Object.keys(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key], sensitiveFields);
    }
  }
}

// Transport configuration
const transports = [];

// Console transport - colorized in dev, JSON in prod
if (isProduction) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.json()
      )
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        })
      )
    })
  );
}

// File transport - combined log (all levels)
transports.push(
  new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      sanitizeFormat(),
      winston.format.timestamp(),
      winston.format.json()
    )
  })
);

// File transport - error log (errors only)
transports.push(
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      sanitizeFormat(),
      winston.format.timestamp(),
      winston.format.json()
    )
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    sanitizeFormat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'geoport-backend' },
  transports
});

// Factory function for creating child loggers with context
export const createChildLogger = (context) => {
  return logger.child(context);
};

export default logger;
