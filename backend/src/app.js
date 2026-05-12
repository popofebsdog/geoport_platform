import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// 導入模型 (確保模型被註冊到 Sequelize)
import './models/Project.js';
import './models/Report.js';
import './models/DataFile.js';

// 導入路由
import projectRoutes from './routes/projects.js';
import dataRoutes from './routes/data.js';
import dataFileRoutes from './routes/dataFileRoutes.js';
import reportRoutes from './routes/reports.js';
import authRoutes from './routes/auth.js';
import temporalDataRoutes from './routes/temporalData.js';
import temporalDataParserRoutes from './routes/temporalDataParser.js';
import temporalDataChartRoutes from './routes/temporalDataChart.js';
import temporalDataEnhancedRoutes from './routes/temporalDataEnhanced.js';
import disasterPointsRoutes from './routes/disasterPoints.js';
import parentProjectRoutes from './routes/parentProjects.js';
import childProjectRoutes from './routes/childProjects.js';
import warningRegionsRoutes from './routes/warningRegions.js';
import spatialLayersRoutes from './routes/spatialLayers.js';
import probeRoutes from './routes/probe.js';
import adminRoutes from './routes/admin.js';

// 導入中間件
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';

// 導入資料庫配置
import { testConnection, testPoolConnection } from './config/database.js';
import { logStartupReport } from './config/envReport.js';
import { getDeepHealth } from './services/healthService.js';
import { ensureLocalStorageRoots, storageConfig } from './services/storageService.js';
import { installConsoleBridge, logger } from './utils/logger.js';

// 載入環境變數
dotenv.config();
installConsoleBridge();

const log = logger.child('server');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const unsafeJwtSecrets = new Set([
  'your-super-secret-jwt-key-here',
  'replace-with-strong-random-secret',
  'dummy-secret'
]);

if (isProduction && (!process.env.JWT_SECRET || unsafeJwtSecrets.has(process.env.JWT_SECRET))) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5176',
  'http://localhost:3000'
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// 中間件
app.set('trust proxy', process.env.TRUST_PROXY || (isProduction ? 1 : false));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (origin, callback) => {
    const origins = allowedOrigins.length > 0 ? allowedOrigins : defaultDevOrigins;
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger());

// 靜態文件服務（local storage adapter）
app.use(storageConfig.uploadsPublicPath, (req, res, next) => {
  // 為 TIF 檔案設置正確的 MIME 類型
  if (req.path.toLowerCase().endsWith('.tif') || req.path.toLowerCase().endsWith('.tiff')) {
    res.header('Content-Type', 'image/tiff');
  }
  next();
}, express.static(storageConfig.uploadsRoot));

app.use(storageConfig.dataPublicPath, express.static(storageConfig.dataRoot));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/parent-projects', parentProjectRoutes);
app.use('/api/child-projects', childProjectRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/data-files', dataFileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', temporalDataRoutes);
app.use('/api/temporal-data', temporalDataParserRoutes);
app.use('/api/temporal-data', temporalDataChartRoutes);
app.use('/api/temporal-data-enhanced', temporalDataEnhancedRoutes);
app.use('/api/disaster-points', disasterPointsRoutes);
app.use('/api/warning-regions', warningRegionsRoutes);
app.use('/api/spatial', spatialLayersRoutes);
app.use('/api/probe', probeRoutes);
app.use('/api/admin', adminRoutes);

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health/deep', async (req, res) => {
  const health = await getDeepHealth();
  const statusCode = health.status === 'error' ? 503 : 200;
  res.status(statusCode).json(health);
});

// 錯誤處理中間件
app.use(notFound);
app.use(errorHandler);

// 啟動服務器
app.listen(PORT, async () => {
  log.info('GeoPort backend server started', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    healthUrl: `http://localhost:${PORT}/api/health`,
    deepHealthUrl: `http://localhost:${PORT}/api/health/deep`,
    environment: process.env.NODE_ENV || 'development'
  });
  logStartupReport();
  
  // 測試資料庫連接
  try {
    await ensureLocalStorageRoots();
    await testConnection();
    await testPoolConnection();
  } catch (error) {
    log.error('Database startup check failed', error);
  }
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', reason instanceof Error ? reason : { reason });
});

process.on('uncaughtException', (error) => {
  log.fatal('Uncaught exception', error);
});

export default app;
