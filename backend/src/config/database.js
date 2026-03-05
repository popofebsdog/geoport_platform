import { Sequelize } from 'sequelize';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// PostgreSQL 資料庫配置
const config = {
  development: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'geoport_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleted_at'
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME_TEST || 'geoport_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleted_at'
    }
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleted_at'
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

export const sequelize = new Sequelize(dbConfig);

// 測試資料庫連線
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 資料庫連線成功');
  } catch (error) {
    console.error('❌ PostgreSQL 資料庫連線失敗:', error.message);
    throw error;
  }
};

// 同步資料庫 (僅在開發環境使用)
export const syncDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ 資料庫同步成功');
    } else {
      console.log('⚠️  生產環境不執行自動同步，請使用 migration');
    }
  } catch (error) {
    console.error('❌ 資料庫同步失敗:', error);
    throw error;
  }
};

// 關閉資料庫連線
export const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ 資料庫連線已關閉');
  } catch (error) {
    console.error('❌ 關閉資料庫連線失敗:', error);
  }
};

// 創建 pg 連接池 (用於原生 SQL 查詢)
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'geoport_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // 最大連接數
  idleTimeoutMillis: 30000, // 空閒連接超時
  connectionTimeoutMillis: 2000, // 連接超時
});

// 測試 pg 連接池
export const testPoolConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL 連接池連線成功');
  } catch (error) {
    console.error('❌ PostgreSQL 連接池連線失敗:', error.message);
    throw error;
  }
};
