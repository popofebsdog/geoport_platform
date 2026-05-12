import { getStorageReport } from '../services/storageService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('startup');

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function buildStartupReport() {
  const isProduction = process.env.NODE_ENV === 'production';
  const storage = getStorageReport();
  const warnings = [];

  if (isProduction && (!process.env.JWT_SECRET ||
    ['your-super-secret-jwt-key-here', 'replace-with-strong-random-secret', 'dummy-secret'].includes(process.env.JWT_SECRET))) {
    warnings.push('JWT_SECRET is missing or still uses the default value.');
  }
  if (isProduction && ['replace-with-strong-password', 'your-postgres-password', 'password'].includes(process.env.DB_PASSWORD)) {
    warnings.push('DB_PASSWORD still uses a placeholder value.');
  }
  if (isProduction && (!process.env.ALLOWED_ORIGINS && !process.env.FRONTEND_URL)) {
    warnings.push('ALLOWED_ORIGINS or FRONTEND_URL should be set in production.');
  }
  if (storage.provider !== 'local' && !storage.adapterReady) {
    warnings.push(`STORAGE_PROVIDER=${storage.provider} is configured, but only the local adapter is implemented.`);
  }

  return {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3001',
    trustProxy: process.env.TRUST_PROXY || (isProduction ? '1' : 'false'),
    frontendUrl: process.env.FRONTEND_URL || '(not set)',
    allowedOrigins: process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '(dev defaults)',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      name: process.env.DB_NAME || 'geoport_db',
      user: process.env.DB_USER || 'postgres',
      password: mask(process.env.DB_PASSWORD),
      ssl: process.env.DB_SSL === 'true'
    },
    storage,
    warnings
  };
}

export function logStartupReport() {
  const report = buildStartupReport();
  log.info('GeoPort startup configuration report', report);
}
