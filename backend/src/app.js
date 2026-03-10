import validateEnv from './config/validateEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import logger from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

import './models/Project.js';
import './models/Report.js';
import './models/DataFile.js';

import projectRoutes from './routes/projects.js';
import dataRoutes from './routes/data.js';
import dataFileRoutes from './routes/dataFileRoutes.js';
import reportRoutes from './routes/reports.js';
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import temporalDataRoutes from './routes/temporalData.js';
import temporalDataParserRoutes from './routes/temporalDataParser.js';
import temporalDataChartRoutes from './routes/temporalDataChart.js';
import temporalDataEnhancedRoutes from './routes/temporalDataEnhanced.js';
import disasterPointsRoutes from './routes/disasterPoints.js';
import parentProjectRoutes from './routes/parentProjects.js';
import childProjectRoutes from './routes/childProjects.js';
import warningRegionsRoutes from './routes/warningRegions.js';
import swaggerSpec from './swagger.js';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { auditLogger } from './middleware/auditLogger.js';

import { testConnection, testPoolConnection } from './config/database.js';

// 載入環境變數
dotenv.config();

validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Trust first proxy (Nginx) for correct IP in rate limiting and logs
app.set('trust proxy', 1);

// Security: Helmet with hardened CSP and HSTS for API
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Security: CORS with environment-based origin whitelist
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  }
};
app.use(morgan('combined', { stream: morganStream }));

// Security: Audit logger for security-relevant events
app.use(auditLogger);

// Security: Body size limits — 1MB for JSON/form, file uploads handled per-route by multer
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security: Global API rate limiter
app.use('/api', apiLimiter);

// 靜態文件服務 - 配置 CORS 允許跨域訪問圖片
app.use('/uploads', (req, res, next) => {
  const origin = req.get('Origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.path.toLowerCase().endsWith('.tif') || req.path.toLowerCase().endsWith('.tiff')) {
    res.header('Content-Type', 'image/tiff');
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/data', express.static(path.join(__dirname, '../../data')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康檢查路由 (不需要認證，必須在其他路由之前)
app.use('/api/health', healthRoutes);

// Security: Stricter rate limit on auth endpoints (brute-force protection)
app.use('/api/auth', authLimiter);
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

// 錯誤處理中間件
app.use(notFound);
app.use(errorHandler);

// 啟動服務器
app.listen(PORT, async () => {
  console.log(`🚀 GeoPort 後端服務器運行在 http://localhost:${PORT}`);
  console.log(`📊 API 文檔: http://localhost:${PORT}/api/health`);
  
  // 測試資料庫連接
  try {
    await testConnection();
    await testPoolConnection();
  } catch (error) {
    console.error('❌ 資料庫連接測試失敗:', error.message);
  }
});

export default app;
