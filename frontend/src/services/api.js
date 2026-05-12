import axios from 'axios';
import { logger } from '@/utils/logger.js';

const log = logger.scoped('api');

// 創建 axios 實例
const api = axios.create({
  baseURL: '/api', // 使用相對路徑，讓 Vite 代理處理
  timeout: 30000
  // 移除默認的 Content-Type，讓 axios 根據數據類型自動設置
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 添加認證令牌
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    log.error('API 響應錯誤', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      message: error.response?.data?.message || error.message
    });
    if (error.response?.status === 401) {
      // 清除過期的令牌
      localStorage.removeItem('authToken');
      // 重定向到登入頁面，保留目前路徑供登入後返回
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    // 保持完整的錯誤對象，包含 response 信息
    return Promise.reject(error);
  }
);

// API 方法
export const projectAPI = {
  // 獲取所有項目
  getAll: (params = {}) => api.get('/projects', { params }),
  
  // 獲取單個項目
  getById: (id) => api.get(`/projects/${id}`),
  
  // 創建項目
  create: (data) => api.post('/projects', data),
  
  // 更新項目
  update: (id, data) => api.put(`/projects/${id}`, data),
  
  // 刪除項目
  delete: (id) => api.delete(`/projects/${id}`),
  
  // 切換書籤
  toggleBookmark: (id) => api.patch(`/projects/${id}/bookmark`),
  
  // 獲取已刪除項目
  getDeleted: () => api.get('/projects/deleted'),
  
  // 還原項目
  restore: (id) => api.patch(`/projects/${id}/restore`),

  // 永久刪除項目（硬刪除，包含已軟刪除的項目）
  permanentDelete: (id) => api.delete(`/projects/${id}/permanent`)
};

export const dataAPI = {
  // 獲取所有數據
  getAll: (params = {}) => api.get('/data', { params }),
  
  // 獲取單個數據
  getById: (id) => api.get(`/data/${id}`),
  
  // 上傳數據
  upload: (formData) => api.post('/data', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  
  // 更新數據
  update: (id, data) => api.put(`/data/${id}`, data),
  
  // 刪除數據
  delete: (id) => api.delete(`/data/${id}`)
};

export const dataFileAPI = {
  // 獲取所有資料檔案
  getAll: (params = {}) => api.get('/data', { params }),
  
  // 獲取單個資料檔案
  getById: (id) => api.get(`/data/${id}`),
  
  // 上傳資料檔案（大檔案，不設逾時限制）
  upload: (formData) => api.post('/data/upload', formData, { timeout: 0 }),
  
  // 創建資料檔案
  create: (data) => api.post('/data', data),
  
  // 更新資料檔案
  update: (id, data) => api.put(`/data/${id}`, data),
  
  // 刪除資料檔案
  delete: (id) => api.delete(`/data/${id}`),
  
  // 永久刪除資料檔案
  permanentDelete: (id) => api.delete(`/data-files/${id}/permanent`),

  // 獲取專案的底圖列表
  getProjectBasemaps: (projectId) => api.get(`/data/project/${projectId}/basemaps`),
  
  // 獲取專案所有資料檔案
  getProjectFiles: (projectId) => api.get(`/data/project/${projectId}`),

  // 獲取已刪除資料檔案
  getDeleted: () => api.get('/data-files/deleted'),
  
  // 還原資料檔案
  restore: (id) => api.patch(`/data-files/${id}/restore`)
};

export const reportAPI = {
  // 獲取所有報告
  getAll: (params = {}) => api.get('/reports', { params }),
  
  // 獲取單個報告
  getById: (id) => api.get(`/reports/${id}`),
  
  // 創建報告
  create: (data) => api.post('/reports', data),
  
  // 更新報告
  update: (id, data) => api.put(`/reports/${id}`, data),
  
  // 刪除報告 (軟刪除)
  delete: (id) => api.delete(`/reports/${id}`),
  
  // 切換書籤
  toggleBookmark: (id) => api.patch(`/reports/${id}/bookmark`),
  
  // 獲取已刪除報告
  getDeleted: () => api.get('/reports/deleted'),
  
  // 還原報告
  restore: (id) => api.patch(`/reports/${id}/restore`)
};

export const disasterPointAPI = {
  getByProject: (projectId) => api.get(`/disaster-points/project/${projectId}`),
  getById: (id) => api.get(`/disaster-points/${id}`),
  create: (formData) => api.post('/disaster-points', formData, { timeout: 0 }),
  update: (id, formData) => api.put(`/disaster-points/${id}`, formData, { timeout: 0 }),
  delete: (id) => api.delete(`/disaster-points/${id}`),
  deleteMedia: (disasterPointId, mediaId) => api.delete(`/disaster-points/${disasterPointId}/media/${mediaId}`)
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  // User management (admin)
  getUsers: () => api.get('/auth/users'),
  createUser: (userData) => api.post('/auth/users', userData),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data)
};

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getHealth: () => api.get('/admin/health'),
  getFiles: (params = {}) => api.get('/admin/files', { params }),
  auditFiles: (params = {}) => api.get('/admin/files/audit', { params }),
  checkFile: (id) => api.get(`/admin/files/${id}/check`),
  getIssues: () => api.get('/admin/issues'),
  getProjectDetail: (id) => api.get(`/admin/projects/${id}`)
};

export default api;
