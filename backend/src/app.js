import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 導入中間件
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// 導入資料庫配置
import { testConnection, testPoolConnection } from './config/database.js';

// 載入環境變數
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5174',
    'http://localhost:5176', // 添加新的端口
    'http://localhost:5173', // 添加其他可能的端口
    'http://localhost:3000'  // 添加其他可能的端口
  ],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 靜態文件服務 - 配置 CORS 允許跨域訪問圖片
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // 為 TIF 檔案設置正確的 MIME 類型
  if (req.path.toLowerCase().endsWith('.tif') || req.path.toLowerCase().endsWith('.tiff')) {
    res.header('Content-Type', 'image/tiff');
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/data', express.static(path.join(__dirname, '../../data')));

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

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

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
